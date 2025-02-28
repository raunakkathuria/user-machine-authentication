// platform-app/src/middleware/auth.js
const crypto = require('crypto');

/**
 * Middleware to require a valid platform session
 * This checks for a valid session cookie
 */
const requirePlatformSession = (req, res, next) => {
  try {
    // Get the session cookie
    const sessionCookie = req.cookies.platform_session;
    
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Platform session required' });
    }
    
    // Parse the session JSON
    let session;
    try {
      session = JSON.parse(sessionCookie);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid session format' });
    }
    
    // Validate the session
    // In a real implementation, you would verify the session exists in a store
    
    // Check if required session properties exist
    if (!session.userId || !session.brandId || !session.sessionId) {
      return res.status(401).json({ error: 'Invalid session data' });
    }
    
    // Attach the session to the request
    req.platformSession = session;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Platform auth middleware error:', error);
    return res.status(500).json({ error: 'Platform authentication error' });
  }
};

/**
 * Middleware to check if a user has specific permissions
 * This must be used after requirePlatformSession
 * @param {string[]} requiredPermissions - Array of permissions to check
 */
const requirePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      const { platformSession } = req;
      
      if (!platformSession) {
        return res.status(401).json({ error: 'Platform session required' });
      }
      
      // Check if the user has all the required permissions
      const hasPermissions = requiredPermissions.every(permission => 
        platformSession.permissions && platformSession.permissions.includes(permission)
      );
      
      if (!hasPermissions) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Permission check error' });
    }
  };
};

/**
 * Middleware to verify the request came from a specific brand
 * @param {string[]} whitelistedBrands - Array of allowed brand IDs
 */
const requireBrand = (whitelistedBrands) => {
  return (req, res, next) => {
    try {
      const { platformSession } = req;
      
      if (!platformSession) {
        return res.status(401).json({ error: 'Platform session required' });
      }
      
      // Check if the brand is in the whitelist
      if (!whitelistedBrands.includes(platformSession.brandId)) {
        return res.status(403).json({ error: 'Brand is not authorized' });
      }
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Brand middleware error:', error);
      return res.status(500).json({ error: 'Brand verification error' });
    }
  };
};

/**
 * Utility to generate a CSRF token for form protection
 * @param {Object} session - The user's session object
 * @returns {string} - CSRF token
 */
const generateCsrfToken = (session) => {
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(session.sessionId + session.userId);
  return hmac.digest('hex');
};

/**
 * Middleware to verify CSRF token in POST/PUT/DELETE requests
 */
const verifyCsrf = (req, res, next) => {
  try {
    // Skip CSRF check for GET and HEAD requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    const { platformSession } = req;
    
    if (!platformSession) {
      return res.status(401).json({ error: 'Platform session required' });
    }
    
    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const expectedToken = generateCsrfToken(platformSession);
    
    if (!csrfToken || csrfToken !== expectedToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('CSRF middleware error:', error);
    return res.status(500).json({ error: 'CSRF verification error' });
  }
};

module.exports = {
  requirePlatformSession,
  requirePermissions,
  requireBrand,
  generateCsrfToken,
  verifyCsrf
};