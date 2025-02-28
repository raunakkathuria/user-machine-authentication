// brand-app/src/routes/auth.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Register a new user
 * @route POST /auth/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Register the user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        first_name: data.user?.user_metadata?.first_name,
        last_name: data.user?.user_metadata?.last_name
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Login a user
 * @route POST /auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Authenticate the user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        first_name: data.user?.user_metadata?.first_name,
        last_name: data.user?.user_metadata?.last_name
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

/**
 * Refresh a token
 * @route POST /auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Refresh the session with Supabase
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      console.error('Token refresh error:', error.message);
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(200).json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Logout a user
 * @route POST /auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Set up supabase client with the session
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    // Clear the auth cookie if it exists
    res.clearCookie('auth_token');
    
    return res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * Get the current user
 * @route GET /auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Get the user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Get user error:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user?.user_metadata?.first_name,
        last_name: user?.user_metadata?.last_name
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user information' });
  }
});

module.exports = router;