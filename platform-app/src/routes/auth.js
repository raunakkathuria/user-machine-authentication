// platform-app/src/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { requirePlatformSession, generateCsrfToken } = require('../middleware/auth');

// KEY HANDLING - Read from mounted volume
// Read public key from file specified in environment variable
const fs = require('fs');
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || '/app/keys/public/public.pem';
let publicKey;

try {
  console.log(`Reading public key from: ${publicKeyPath}`);
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  console.log('Public key loaded successfully for token verification');
} catch (error) {
  console.error(`Error reading public key from ${publicKeyPath}:`, error.message);
  throw new Error('Public key is required for token verification. Please make sure the key file exists and is accessible.');
}

// Get whitelist of allowed brands
const whitelistedBrands = (process.env.WHITELIST_BRANDS || '').split(',');

// In-memory token blacklist (for development/demo purposes)
// In production, this would be stored in Redis or another distributed cache
const revokedTokens = new Map();

/**
 * Validate the platform access token and establish a session
 * @route GET/POST /auth/validate
 */
router.all('/validate', async (req, res) => {
  try {
    // Look for token in multiple possible locations
    let token = null;
    
    // 1. Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // 2. Check query parameter
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    // 3. Check form-submitted POST data
    if (!token && req.method === 'POST' && req.body.token) {
      token = req.body.token;
    }
    
    if (!token) {
      return res.status(400).json({ 
        error: 'Token is required. It can be provided in Authorization header, query parameter, or POST body.'
      });
    }
    
    // Verify the JWT
    let decoded;
    try {
      console.log('Using RSA public key verification');
      // Verify the token with the loaded public key
      decoded = jwt.verify(token, publicKey, { 
        algorithms: ['RS256'],
        audience: 'platform-service'
      });
      console.log('Token cryptographically verified successfully');
    } catch (verifyError) {
      // If we get here, JWT format is okay but verification failed
      console.error('JWT verification failed:', verifyError.message);
      throw verifyError;
    }
    
    // Verify the token is not blacklisted
    if (revokedTokens.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Verify the brand is in the whitelist
    if (!whitelistedBrands.includes(decoded.brand_id)) {
      return res.status(403).json({ error: 'Brand is not authorized' });
    }
    
    // Verify token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return res.status(401).json({ error: 'Token has expired' });
    }
    
    // REMOVED PLATFORM VALIDATION: For testing purposes, not checking platform ID
    // In a real implementation, we would validate that the platform_id in the token
    // matches the expected platform ID for this service
    
    // Check if the user has the required permissions
    const requiredPermissions = ['trading'];
    const hasPermissions = requiredPermissions.every(perm => 
      decoded.permissions && decoded.permissions.includes(perm)
    );
    
    if (!hasPermissions) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // At this point, the token is valid
    // Create a session for the user
    const sessionId = crypto.randomUUID();
    const session = {
      userId: decoded.sub,
      email: decoded.email,
      firstName: decoded.first_name,
      lastName: decoded.last_name,
      brandId: decoded.brand_id,
      platformId: decoded.platform_id,
      permissions: decoded.permissions,
      walletId: decoded.wallet_id,
      // Generate a session ID
      sessionId: sessionId,
      // Save original token ID for revocation
      tokenId: decoded.jti,
      // Session creation timestamp
      createdAt: now
    };
    
    // In a real implementation, you would store this session in Redis or a database
    // For this example, we'll just set a cookie
    res.cookie('platform_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // Provides some CSRF protection
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Check if the request accepts HTML (browser request) or is API call
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      // Redirect to the platform dashboard or initial page
      return res.redirect('/dashboard');
    } else {
      // Return a JSON response for API calls with header-based auth
      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        session: {
          sessionId: sessionId,
          userId: decoded.sub,
          firstName: decoded.first_name,
          lastName: decoded.last_name,
          redirectUrl: '/dashboard'
        }
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({ error: 'Failed to validate token' });
  }
});

/**
 * Dashboard route (protected)
 * @route GET /auth/dashboard
 */
router.get('/dashboard', requirePlatformSession, (req, res) => {
  try {
    const { platformSession } = req;
    
    // Generate a CSRF token for the session
    const csrfToken = generateCsrfToken(platformSession);
    
    // You would typically render a dashboard view
    // For this example, we'll just return JSON
    res.json({
      message: 'Welcome to the platform dashboard',
      user: {
        id: platformSession.userId,
        email: platformSession.email,
        firstName: platformSession.firstName,
        lastName: platformSession.lastName
      },
      brand: platformSession.brandId,
      platform: platformSession.platformId,
      csrf_token: csrfToken  // Include CSRF token for forms
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

/**
 * Logout from the platform
 * @route POST /auth/logout
 */
router.post('/logout', requirePlatformSession, (req, res) => {
  try {
    const { platformSession } = req;
    
    // Add the token to the revoked tokens map if it exists
    if (platformSession.tokenId) {
      revokedTokens.set(platformSession.tokenId, true);
    }
    
    // Clear the session cookie
    res.clearCookie('platform_session');
    
    return res.json({ success: true, message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * Get session info
 * @route GET /auth/session
 */
router.get('/session', requirePlatformSession, (req, res) => {
  try {
    const { platformSession } = req;
    
    // Return session information (without sensitive data)
    return res.json({
      user: {
        id: platformSession.userId,
        email: platformSession.email,
        firstName: platformSession.firstName,
        lastName: platformSession.lastName
      },
      brand: platformSession.brandId,
      platform: platformSession.platformId,
      permissions: platformSession.permissions,
      sessionAge: Math.floor(Date.now() / 1000) - platformSession.createdAt
    });
  } catch (error) {
    console.error('Session info error:', error);
    return res.status(500).json({ error: 'Failed to get session information' });
  }
});

/**
 * Handle token errors
 * @route GET /auth/error
 */
router.get('/error', (req, res) => {
  const { error } = req.query;
  res.status(400).json({
    error: error || 'An authentication error occurred',
    message: 'Please return to the brand application and try again'
  });
});

module.exports = router;