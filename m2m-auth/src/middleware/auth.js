// m2m-auth/src/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');
const tokenService = require('../services/token-service');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Middleware to validate M2M access tokens
 * This is used to protect resources that require machine authentication
 */
const requireClientToken = async (req, res, next) => {
  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    try {
      const decoded = await tokenService.verifyToken(token);
      
      // Attach the client to the request
      req.client = {
        id: decoded.client_id,
        name: decoded.client_name,
        scopes: decoded.scope ? decoded.scope.split(' ') : []
      };
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to check client has required scope
 * @param {string} requiredScope - The scope required for the operation
 */
const requireScope = (requiredScope) => {
  return (req, res, next) => {
    try {
      // Check if client exists on the request (set by requireClientToken)
      if (!req.client) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if client has the required scope
      if (!req.client.scopes.includes(requiredScope)) {
        return res.status(403).json({ 
          error: 'insufficient_scope',
          error_description: `The token does not have the required scope (${requiredScope})` 
        });
      }
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Scope middleware error:', error);
      return res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Middleware to require authentication for admin operations
 * This can be adapted to use either admin user authentication or special admin clients
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Get the JWT from the request headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if it's a Supabase user token
    if (authHeader.startsWith('Bearer eyJ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify the JWT with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Check if user has admin role
      if (!user.app_metadata || user.app_metadata.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Attach the user to the request
      req.user = user;
      
      // Continue to the next middleware or route handler
      return next();
    }
    
    // If not a user token, check if it's a client token with admin scope
    try {
      const token = authHeader.split(' ')[1];
      const decoded = await tokenService.verifyToken(token);
      
      // Check if client has admin scope
      const scopes = decoded.scope ? decoded.scope.split(' ') : [];
      if (!scopes.includes('admin')) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Attach the client to the request
      req.client = {
        id: decoded.client_id,
        name: decoded.client_name,
        scopes: scopes
      };
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Authorization error' });
  }
};

/**
 * Middleware to require authentication (either user or client)
 * This is useful for endpoints that can be accessed by both humans and machines
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get the JWT from the request headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if it's a Supabase user token
    if (authHeader.startsWith('Bearer eyJ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify the JWT with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Attach the user to the request
      req.user = user;
      
      // Continue to the next middleware or route handler
      return next();
    }
    
    // If not a user token, check if it's a client token
    try {
      const token = authHeader.split(' ')[1];
      const decoded = await tokenService.verifyToken(token);
      
      // Attach the client to the request
      req.client = {
        id: decoded.client_id,
        name: decoded.client_name,
        scopes: decoded.scope ? decoded.scope.split(' ') : []
      };
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = {
  requireClientToken,
  requireScope,
  requireAdmin,
  requireAuth
};