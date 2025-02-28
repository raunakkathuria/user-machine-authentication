// m2m-auth/src/routes/auth.js
const express = require('express');
const router = express.Router();
const clientService = require('../services/client-service');
const tokenService = require('../services/token-service');

/**
 * OAuth 2.0 Token endpoint
 * Implements the client credentials grant type
 * Request must include client ID and secret as Basic Auth, or in request body
 */
router.post('/token', async (req, res) => {
  try {
    console.log('Token request body:', req.body);
    console.log('Token request headers:', req.headers);

    // Check grant type - only support client_credentials
    const grantType = req.body.grant_type;
    console.log('Grant type:', grantType);

    if (grantType !== 'client_credentials') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only client_credentials grant type is supported'
      });
    }

    // Get client credentials - either from Basic Auth header or request body
    let clientId;
    let clientSecret;

    // Check for Basic Auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      [clientId, clientSecret] = credentials.split(':');
    } else {
      // Get from request body
      clientId = req.body.client_id;
      clientSecret = req.body.client_secret;
    }

    if (!clientId || !clientSecret) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client authentication required'
      });
    }

    // Validate the client credentials
    const client = await clientService.validateClientCredentials(clientId, clientSecret);

    // Get requested scope (optional)
    const requestedScope = req.body.scope || client.scopes.join(' ');

    // Generate token with requested scope
    const tokenResponse = await tokenService.generateClientCredentialsToken(client, requestedScope);

    // Return the token response
    return res.status(200).json(tokenResponse);
  } catch (error) {
    console.error('Token endpoint error:', error);

    if (error.message === 'Invalid client credentials') {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    if (error.message === 'No valid scopes requested') {
      return res.status(400).json({
        error: 'invalid_scope',
        error_description: 'No valid scopes requested'
      });
    }

    return res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred while processing the request'
    });
  }
});

/**
 * Introspection endpoint - allows services to validate tokens
 * Requires client authentication
 */
router.post('/introspect', async (req, res) => {
  try {
    // Get the token from the request
    const token = req.body.token;
    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Token parameter is required'
      });
    }

    // Get client credentials - services should authenticate
    let clientId;
    let clientSecret;

    // Check for Basic Auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      [clientId, clientSecret] = credentials.split(':');

      // Validate the client credentials
      await clientService.validateClientCredentials(clientId, clientSecret);
    } else {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client authentication required'
      });
    }

    // Verify the token
    try {
      const decoded = await tokenService.verifyToken(token);

      // Return introspection response format (RFC 7662)
      return res.status(200).json({
        active: true,
        scope: decoded.scope,
        client_id: decoded.client_id,
        token_type: 'Bearer',
        exp: decoded.exp,
        iat: decoded.iat,
        sub: decoded.sub,
        iss: decoded.iss,
        jti: decoded.jti
      });
    } catch (tokenError) {
      // Token is invalid, but this is not an error in the introspection protocol
      return res.status(200).json({
        active: false
      });
    }
  } catch (error) {
    console.error('Introspection endpoint error:', error);

    if (error.message === 'Invalid client credentials') {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    return res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred while processing the request'
    });
  }
});

/**
 * Revocation endpoint - allows clients to revoke their own tokens
 * Requires client authentication
 */
router.post('/revoke', async (req, res) => {
  try {
    // Get the token from the request
    const token = req.body.token;
    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Token parameter is required'
      });
    }

    // Get client credentials
    let clientId;
    let clientSecret;

    // Check for Basic Auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      [clientId, clientSecret] = credentials.split(':');

      // Validate the client credentials
      await clientService.validateClientCredentials(clientId, clientSecret);
    } else {
      // Get from request body
      clientId = req.body.client_id;
      clientSecret = req.body.client_secret;

      if (!clientId || !clientSecret) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Client authentication required'
        });
      }

      // Validate the client credentials
      await clientService.validateClientCredentials(clientId, clientSecret);
    }

    // Decode the token without verification to get the jti
    const decoded = tokenService.decodeToken(token);

    if (!decoded || !decoded.jti) {
      // Per RFC 7009, we should return 200 OK even if the token was invalid
      return res.status(200).send();
    }

    // Check if this client is allowed to revoke this token
    if (decoded.client_id !== clientId) {
      // Clients can only revoke their own tokens
      return res.status(403).json({
        error: 'access_denied',
        error_description: 'You can only revoke your own tokens'
      });
    }

    // Revoke the token
    await tokenService.revokeToken(decoded.jti);

    // Per RFC 7009, return 200 OK with empty body on success
    return res.status(200).send();
  } catch (error) {
    console.error('Revocation endpoint error:', error);

    if (error.message === 'Invalid client credentials') {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    return res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred while processing the request'
    });
  }
});

module.exports = router;
