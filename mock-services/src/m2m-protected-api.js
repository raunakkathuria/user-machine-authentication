// mock-services/src/m2m-protected-api.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Check if we should disable token verification (for development only)
const DISABLE_TOKEN_VERIFICATION = process.env.DISABLE_TOKEN_VERIFICATION === 'true';

if (DISABLE_TOKEN_VERIFICATION) {
  console.warn('⚠️ WARNING: TOKEN VERIFICATION IS DISABLED. THIS SHOULD ONLY BE USED FOR DEVELOPMENT. ⚠️');
}

// Read public key for JWT verification (shared with M2M Auth service)
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.resolve(__dirname, '../../../keys/public/public.pem');
console.log('Looking for public key at:', publicKeyPath);

let publicKey;

// Skip key loading if verification is disabled
if (!DISABLE_TOKEN_VERIFICATION) {
  try {
    console.log(`Reading public key from: ${publicKeyPath}`);
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log('Public key loaded successfully:', publicKey.substring(0, 50) + '...');
  } catch (error) {
    console.error(`Error reading public key from ${publicKeyPath}:`, error.message);
    
    // Try alternate paths for development environments
    const alternateKeyPaths = [
      '/app/keys/public/public.pem',
      '../../keys/public/public.pem',
      '../keys/public/public.pem',
      './keys/public/public.pem'
    ];
    
    for (const altPath of alternateKeyPaths) {
      try {
        const resolvedPath = path.resolve(__dirname, altPath);
        console.log(`Trying alternate path: ${resolvedPath}`);
        publicKey = fs.readFileSync(resolvedPath, 'utf8');
        console.log(`Public key loaded successfully from ${altPath}`);
        break;
      } catch (altError) {
        console.log(`Failed to load from ${altPath}: ${altError.message}`);
      }
    }
    
    if (!publicKey) {
      console.error('WARNING: No public key found. Token validation will fail unless disabled!');
    }
  }
}

// Middleware to authenticate M2M requests
const authenticateM2M = (requiredScope) => {
  return (req, res, next) => {
    try {
      // Get the JWT from the request headers
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'unauthorized',
          error_description: 'Authentication required' 
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Decode the token without verification for debug info
      const decodedWithoutVerify = jwt.decode(token);
      console.log('Token payload:', JSON.stringify(decodedWithoutVerify));
      
      // If token verification is disabled, skip verification
      let decoded;
      if (DISABLE_TOKEN_VERIFICATION) {
        console.warn('⚠️ SECURITY BYPASS: Token accepted without verification');
        decoded = decodedWithoutVerify;
      } else {
        // Check if we have the public key
        if (!publicKey) {
          console.error('Cannot validate token: No public key available');
          return res.status(500).json({
            error: 'server_error',
            error_description: 'The server is not properly configured to validate tokens. Check server logs.'
          });
        }
        
        // For debugging - show the token we're trying to verify
        console.log('Verifying token:', token.substring(0, 50) + '...');
        console.log('Using public key:', publicKey.substring(0, 50) + '...');
        
        // Verify the JWT
        decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      }
      
      // Check if token is from the M2M auth service
      if (decoded.iss !== 'brand-platform-m2m') {
        return res.status(403).json({ 
          error: 'invalid_token',
          error_description: 'Token not issued by authorized service' 
        });
      }
      
      // Check for required scope if specified
      if (requiredScope) {
        const scopes = decoded.scope ? decoded.scope.split(' ') : [];
        if (!scopes.includes(requiredScope)) {
          return res.status(403).json({ 
            error: 'insufficient_scope',
            error_description: `Token does not have the required scope: ${requiredScope}` 
          });
        }
      }
      
      // Attach the client info to the request
      req.client = {
        id: decoded.client_id,
        name: decoded.client_name,
        scopes: decoded.scope ? decoded.scope.split(' ') : []
      };
      
      // Log access for debugging
      console.log(`Access granted to client: ${req.client.name} with scopes: ${req.client.scopes.join(', ')}`);
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('M2M auth middleware error:', error);
      
      // Handle token validation errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'invalid_token', 
          error_description: 'Token has expired' 
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'invalid_token', 
          error_description: 'Invalid token signature' 
        });
      }
      
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Token validation failed' 
      });
    }
  };
};

// Protected API routes that require M2M authentication

// Data endpoint - requires 'api:read' scope
router.get('/data', authenticateM2M('api:read'), (req, res) => {
  const data = {
    message: "This is protected data accessible with api:read scope",
    timestamp: new Date().toISOString(),
    client: req.client.name,
    data: [
      { id: 1, name: "Item 1", value: 100 },
      { id: 2, name: "Item 2", value: 200 },
      { id: 3, name: "Item 3", value: 300 }
    ]
  };
  
  res.json(data);
});

// Events endpoint - requires 'events:subscribe' scope
router.get('/events', authenticateM2M('events:subscribe'), (req, res) => {
  const events = {
    message: "This is the events feed accessible with events:subscribe scope",
    timestamp: new Date().toISOString(),
    client: req.client.name,
    events: [
      { id: "evt-1", type: "update", resource: "price", timestamp: new Date().toISOString() },
      { id: "evt-2", type: "create", resource: "order", timestamp: new Date(Date.now() - 60000).toISOString() },
      { id: "evt-3", type: "delete", resource: "position", timestamp: new Date(Date.now() - 120000).toISOString() }
    ]
  };
  
  res.json(events);
});

// Write endpoint - requires 'api:write' scope
router.post('/data', authenticateM2M('api:write'), (req, res) => {
  console.log('Received data:', req.body);
  
  res.status(201).json({
    message: "Data successfully created with api:write scope",
    timestamp: new Date().toISOString(),
    client: req.client.name,
    id: Math.floor(Math.random() * 1000)
  });
});

// Admin endpoint removed for security reasons

module.exports = router;