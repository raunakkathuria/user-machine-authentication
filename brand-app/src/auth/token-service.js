// brand-app/src/auth/token-service.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');

// KEY HANDLING
// Read private key from file specified in environment variable or use fallback path
const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || '/app/keys/private/private.pem';
let privateKey;

try {
  console.log(`Reading private key from: ${privateKeyPath}`);
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  console.log('Private key loaded successfully');
} catch (error) {
  console.error(`Error reading private key from ${privateKeyPath}:`, error.message);
  throw new Error('Private key is required for token generation. Please make sure the key file exists and is accessible.');
}

// For simplicity in this demo, we'll compute the public key from private key
// In a real production app, these should be managed separately
// The public key is generally shared with the platform app
let publicKey = null;

try {
  // Derive the public key for local verification (mainly for testing)
  // The actual public key will be distributed to the platform
  const publicKeyPath = privateKeyPath.replace('private/private.pem', 'public/public.pem');
  if (fs.existsSync(publicKeyPath)) {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log('Public key loaded successfully');
  } else {
    console.log('Public key file not found, public key verification disabled');
    publicKey = null;
  }
} catch (error) {
  console.error('Error reading public key:', error.message);
  console.log('Public key verification disabled');
  publicKey = null;
}

// In-memory token blacklist (for development/demo purposes)
// In production, this would be stored in Redis or another distributed cache
const revokedTokens = new Map();

/**
 * Generate a platform access token for an authenticated user
 * @param {Object} user - The authenticated user object from Supabase
 * @param {string} platformId - The target platform identifier
 * @param {Array} permissions - Requested permissions for the platform
 * @param {string} brandId - The brand identifier
 * @param {Object} options - Additional options for token generation
 * @returns {Object} The token object with token string and expiration
 */
const generatePlatformAccessToken = (user, platformId, permissions, brandId, options = {}) => {
  // Create a unique token ID
  const tokenId = crypto.randomUUID();
  
  // Create a nonce to prevent replay attacks
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Set token expiration (default 15 minutes)
  const expiresIn = options.expiresIn || 15 * 60; // 15 minutes in seconds
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresIn;
  
  // Include user metadata in the token payload if available
  const metadata = user.user_metadata || {};
  
  // Create the token payload
  const payload = {
    sub: user.id,
    email: user.email,
    first_name: metadata.first_name,
    last_name: metadata.last_name,
    brand_id: brandId,
    platform_id: platformId,
    permissions: permissions,
    wallet_id: user.wallet_id || options.wallet_id, // Wallet ID can come from user or options
    exp: expiresAt,
    iat: issuedAt,
    aud: 'platform-service',
    nonce: nonce,
    jti: tokenId
  };
  
  // Sign the token with the private key
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  
  return {
    token,
    expires_at: expiresAt,
    token_id: tokenId
  };
};

/**
 * Verify a platform access token
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded token payload if valid
 */
const verifyPlatformAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: 'platform-service'
    });
    
    // Check if the token has been revoked
    if (isTokenRevoked(decoded.jti)) {
      throw new Error('Token has been revoked');
    }
    
    // Verify the token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      throw new Error('Token has expired');
    }
    
    return decoded;
  } catch (error) {
    console.error('Token validation error:', error.message);
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * Revoke a platform access token
 * @param {string} tokenId - The unique token ID (jti claim) to revoke
 * @param {number} expiry - Time until the token would have expired (in seconds)
 */
const revokeToken = (tokenId, expiry) => {
  if (!tokenId) {
    throw new Error('Token ID is required');
  }
  
  // Store the token ID in the revoked tokens map
  // with an expiry time to auto-cleanup
  revokedTokens.set(tokenId, Date.now() + (expiry * 1000));
  
  // Schedule cleanup of expired entries
  cleanupRevokedTokens();
};

/**
 * Check if a token has been revoked
 * @param {string} tokenId - The unique token ID (jti claim) to check
 * @returns {boolean} True if the token has been revoked
 */
const isTokenRevoked = (tokenId) => {
  return revokedTokens.has(tokenId);
};

/**
 * Clean up expired entries in the revoked tokens map
 * In a production environment, this would be handled by Redis TTL
 */
const cleanupRevokedTokens = () => {
  const now = Date.now();
  
  // Remove expired entries
  for (const [tokenId, expiry] of revokedTokens.entries()) {
    if (expiry < now) {
      revokedTokens.delete(tokenId);
    }
  }
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
  generatePlatformAccessToken,
  verifyPlatformAccessToken,
  revokeToken,
  isTokenRevoked,
  decodeToken
};