// m2m-auth/src/auth/middleware.js
const { verifyToken } = require('../services/token-service');

/**
 * Middleware to verify admin access token
 */
const adminAuth = (req, res, next) => {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = verifyAdminToken(token);
    
    // Attach user info to request
    req.admin = decoded;
    
    // Continue
    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin token' });
  }
};

/**
 * Very simple admin token verification 
 * In production, this would use proper JWT verification
 */
const verifyAdminToken = (token) => {
  // In development mode, allow a static admin token
  const { adminToken } = require('../config');
  
  if (token === adminToken) {
    return { 
      role: 'admin',
      id: 'admin',
      name: 'System Administrator' 
    };
  }
  
  // For more complex scenarios, we could use the JWT token service
  throw new Error('Invalid admin token');
};

/**
 * Middleware to verify M2M access token with required scopes
 */
const scopeAuth = (requiredScopes) => {
  return async (req, res, next) => {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    try {
      // Verify token
      const decoded = await verifyToken(token);
      
      // Check scopes
      if (requiredScopes && requiredScopes.length > 0) {
        const tokenScopes = decoded.scope.split(' ');
        const hasRequiredScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
        
        if (!hasRequiredScopes) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: `Insufficient scope. Required: ${requiredScopes.join(', ')}` 
          });
        }
      }
      
      // Attach client info to request
      req.client = decoded;
      
      // Continue
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ error: 'Unauthorized', message: `Invalid token: ${error.message}` });
    }
  };
};

module.exports = {
  adminAuth,
  scopeAuth
};