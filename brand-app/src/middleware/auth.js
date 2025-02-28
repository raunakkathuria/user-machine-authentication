// brand-app/src/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Middleware to require authentication
 * This checks for a valid Supabase JWT token in the Authorization header
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get the JWT from the request headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to optionally authenticate
 * Similar to requireAuth but doesn't return an error if no token is present
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get the JWT from the request headers
    const authHeader = req.headers.authorization;
    
    // If no auth header, skip authentication but continue
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    // If token is valid, attach the user to the request
    if (!error && user) {
      req.user = user;
    }
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Continue even if authentication fails
    console.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Middleware to require admin role
 * Must be used after requireAuth middleware
 */
const requireAdmin = (req, res, next) => {
  try {
    const { user } = req;
    
    // Check if user exists and has admin role
    if (!user || !user.app_metadata || user.app_metadata.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Authorization error' });
  }
};

/**
 * Helper function to extract user from token
 * For use in routes where you need user info but don't want to use middleware
 */
const getUserFromToken = async (token) => {
  if (!token) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Get user error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  getUserFromToken
};