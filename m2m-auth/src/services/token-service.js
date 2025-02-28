// m2m-auth/src/services/token-service.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// KEY HANDLING
// Read private key from file specified in environment variable or use fallback path
const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || '/app/keys/private/private.pem';
let privateKey;

try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (error) {
  console.error(`Error reading private key from ${privateKeyPath}:`, error.message);
  throw new Error('Private key is required for token generation');
}

// For consistency, use the same public key from the user authentication system
let publicKey = null;

try {
  const publicKeyPath = privateKeyPath.replace('private/private.pem', 'public/public.pem');
  if (fs.existsSync(publicKeyPath)) {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  } else {
    console.error('Public key file not found, public key verification disabled');
    publicKey = null;
  }
} catch (error) {
  console.error('Error reading public key:', error.message);
  publicKey = null;
}

// In-memory token blacklist
// TODO: In production, replace this with Redis or another distributed cache
const revokedTokens = new Map();

/**
 * Generate an access token for a client using the Client Credentials flow
 * @param {Object} client - The client object from database
 * @param {string} scope - Requested scope (space-separated string)
 * @returns {Object} The token object with token string and expiration
 */
const generateClientCredentialsToken = async (client, scope) => {
  // Validate the requested scope against client's allowed scopes
  const requestedScopes = scope.split(' ').filter(Boolean);
  
  // Get client's allowed scopes from database
  const { data: clientScopes, error } = await supabase
    .schema('org_identity_provider')
    .from('client_scopes')
    .select('scope')
    .eq('client_id', client.id);
  
  if (error) {
    throw new Error(`Error fetching client scopes: ${error.message}`);
  }
  
  const allowedScopes = clientScopes.map(s => s.scope);
  
  // Check if all requested scopes are allowed
  const validScopes = requestedScopes.filter(s => allowedScopes.includes(s));
  
  if (validScopes.length === 0) {
    throw new Error('No valid scopes requested');
  }
  
  // Create a unique token ID
  const tokenId = uuidv4();
  
  // Create a nonce to prevent replay attacks
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Set token expiration (default 1 hour for machine tokens)
  const expiresIn = 60 * 60; // 1 hour in seconds
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresIn;
  
  // Create the token payload
  const payload = {
    iss: 'brand-platform-m2m', // Issuer
    sub: client.id, // Subject (client ID)
    aud: 'api', // Audience
    client_id: client.id,
    client_name: client.name,
    scope: validScopes.join(' '),
    exp: expiresAt,
    iat: issuedAt,
    jti: tokenId,
    nonce: nonce
  };
  
  // Sign the token with the private key
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  
  // Store token in database for tracking
  const { error: insertError } = await supabase
    .schema('org_identity_provider')
    .from('issued_tokens')
    .insert({
      token_id: tokenId,
      client_id: client.id,
      scopes: validScopes,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      revoked: false
    });
    
  if (insertError) {
    console.error('Error storing token in database:', insertError);
    // Continue anyway since we've already generated the token
  }
  
  return {
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: validScopes.join(' ')
  };
};

/**
 * Verify an access token
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded token payload if valid
 */
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256']
    });
    
    // Check if the token has been revoked
    const { data, error } = await supabase
      .schema('org_identity_provider')
      .from('issued_tokens')
      .select('revoked')
      .eq('token_id', decoded.jti)
      .single();
    
    if (error) {
      throw new Error(`Token validation error: ${error.message}`);
    }
    
    if (data && data.revoked) {
      throw new Error('Token has been revoked');
    }
    
    return decoded;
  } catch (error) {
    console.error('Token validation error:', error.message);
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * Revoke a token
 * @param {string} tokenId - The unique token ID (jti claim) to revoke
 */
const revokeToken = async (tokenId) => {
  if (!tokenId) {
    throw new Error('Token ID is required');
  }
  
  const { error } = await supabase
    .schema('org_identity_provider')
    .from('issued_tokens')
    .update({ revoked: true })
    .eq('token_id', tokenId);
  
  if (error) {
    throw new Error(`Error revoking token: ${error.message}`);
  }
  
  // Also add to in-memory blacklist for immediate effect
  revokedTokens.set(tokenId, Date.now());
};

/**
 * Check if a token is in the in-memory blacklist
 * @param {string} tokenId - The unique token ID (jti claim) to check
 * @returns {boolean} True if the token is in the in-memory blacklist
 */
const isTokenRevokedInMemory = (tokenId) => {
  return revokedTokens.has(tokenId);
};

/**
 * Decode a token without verifying its signature
 * Useful for debugging or extracting information from expired tokens
 * @param {string} token - The JWT token to decode
 * @returns {Object} The decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error.message);
    throw new Error(`Failed to decode token: ${error.message}`);
  }
};

module.exports = {
  generateClientCredentialsToken,
  verifyToken,
  revokeToken,
  isTokenRevokedInMemory,
  decodeToken
};