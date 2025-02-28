// brand-app/src/routes/platform.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { 
  generatePlatformAccessToken, 
  verifyPlatformAccessToken,
  revokeToken,
  decodeToken
} = require('../auth/token-service');
const { requireAuth } = require('../middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Brand identifier
const BRAND_ID = 'brand-portal';

/**
 * Generate a platform access token
 * This endpoint is called when a user clicks "Open Trading Platform"
 * @route POST /platform/access-token
 */
router.post('/access-token', requireAuth, async (req, res) => {
  try {
    const { platformId, requestedScope, expiresIn } = req.body;
    
    if (!platformId) {
      return res.status(400).json({ error: 'Platform ID is required' });
    }
    
    // Get user from authenticated session
    const { user } = req;
    
    // Validate platform and user access rights
    // This would typically check if the user has access to the requested platform
    // For demo purposes, we're granting access to all platforms
    
    // Define permissions based on requested scope or use defaults
    const permissions = requestedScope ? [requestedScope] : ['trading', 'view_history'];
    
    // Fetch wallet ID if not present in user object
    let walletId = user.wallet_id;
    if (!walletId) {
      // In a real implementation, fetch from a wallet service or database
      walletId = `wallet-${Math.floor(Math.random() * 1000000)}`;
    }
    
    // Generate platform access token with options
    const tokenData = generatePlatformAccessToken(
      user,
      platformId,
      permissions,
      BRAND_ID,
      {
        expiresIn: expiresIn || 15 * 60, // 15 minutes default
        wallet_id: walletId
      }
    );
    
    // Return the access token and expiration
    return res.status(200).json({
      platform_access_token: tokenData.token,
      expires_at: tokenData.expires_at,
      token_id: tokenData.token_id
    });
  } catch (error) {
    console.error('Error generating platform token:', error);
    return res.status(500).json({ error: 'Failed to generate platform access token' });
  }
});

/**
 * Initiate platform access
 * This endpoint creates a redirect URL with the token
 * @route GET /platform/access/:platformId
 */
router.get('/access/:platformId', requireAuth, async (req, res) => {
  try {
    const { platformId } = req.params;
    
    // Get user from authenticated session
    const { user } = req;
    
    // Fetch wallet ID if not present in user object
    let walletId = user.wallet_id;
    if (!walletId) {
      // In a real implementation, fetch from a wallet service or database
      walletId = `wallet-${Math.floor(Math.random() * 1000000)}`;
    }
    
    // Generate platform access token with default permissions
    const tokenData = generatePlatformAccessToken(
      user,
      platformId,
      ['trading', 'view_history'],
      BRAND_ID,
      { wallet_id: walletId }
    );
    
    // Now use the header-based approach for token transmission
    // Store token in a secure cookie for header-based transmission
    res.cookie('platform_access_token', tokenData.token, {
      httpOnly: true,            // Not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',           // Protects against CSRF
      maxAge: 15 * 60 * 1000     // 15 minutes in milliseconds
    });
    
    // Set up the platform URL (without token in URL)
    const platformBaseUrl = process.env.PLATFORM_API_URL || 'http://localhost:3001';
    const redirectUrl = `${platformBaseUrl}/auth/validate`;
    
    // Create an HTML page that makes a fetch request with Authorization header
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting to Platform...</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>Redirecting to Platform</h2>
          <div class="loader"></div>
          <p>Please wait, you are being redirected to the trading platform...</p>
          
          <script>
            // Get token from cookie (only for this redirect - in a real app would use HttpOnly cookies)
            function getCookie(name) {
              const value = "; " + document.cookie;
              const parts = value.split("; " + name + "=");
              if (parts.length === 2) return parts.pop().split(";").shift();
            }
            
            // Redirect with token as Authorization header
            window.onload = function() {
              const token = getCookie('platform_access_token');
              
              // Option 1: Using fetch with proper headers
              fetch('${redirectUrl}', {
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer ' + token
                },
                credentials: 'include'
              })
              .then(response => {
                // Redirect to the URL from the response
                window.location.href = response.url || '${platformBaseUrl}/dashboard';
              })
              .catch(error => {
                console.error('Error:', error);
                document.body.innerHTML += '<p style="color: red;">Error connecting to platform. Please try again.</p>';
              });
            };
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error accessing platform:', error);
    return res.status(500).json({ error: 'Failed to access platform' });
  }
});

/**
 * Revoke a platform access token
 * This endpoint is called when a user logs out or wants to invalidate a token
 * @route POST /platform/revoke-token
 */
router.post('/revoke-token', requireAuth, async (req, res) => {
  try {
    const { token_id, token } = req.body;
    
    if (!token_id && !token) {
      return res.status(400).json({ error: 'Either token_id or token is required' });
    }
    
    let tokenId = token_id;
    let expiryTime = 0;
    
    // If token is provided instead of token_id, decode it to get the ID and expiry
    if (token && !tokenId) {
      try {
        const decoded = decodeToken(token);
        tokenId = decoded.jti;
        expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
        
        // If token is already expired, return success
        if (expiryTime <= 0) {
          return res.status(200).json({ success: true, message: 'Token already expired' });
        }
      } catch (decodeError) {
        return res.status(400).json({ error: 'Invalid token format' });
      }
    } else if (token_id) {
      // If only token_id provided, set a default expiry (24h)
      expiryTime = 24 * 60 * 60;
    }
    
    // Revoke the token
    revokeToken(tokenId, expiryTime);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Token successfully revoked'
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    return res.status(500).json({ error: 'Failed to revoke token' });
  }
});

/**
 * Verify a platform access token
 * This endpoint is for testing and debugging purposes
 * @route POST /platform/verify-token
 */
router.post('/verify-token', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    try {
      // Verify the token
      const decoded = verifyPlatformAccessToken(token);
      
      // Return the decoded token payload
      return res.status(200).json({
        valid: true,
        payload: decoded
      });
    } catch (verifyError) {
      // Return information about the invalid token
      return res.status(200).json({
        valid: false,
        error: verifyError.message
      });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(500).json({ error: 'Failed to verify token' });
  }
});

module.exports = router;