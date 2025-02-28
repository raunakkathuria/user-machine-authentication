// mock-services/src/app.js
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const m2mProtectedApi = require('./m2m-protected-api');

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// JWT Secret for service authentication
const JWT_SECRET = process.env.JWT_SECRET || 'service-jwt-secret';

// Middleware to authenticate brand requests
const authenticateBrand = (req, res, next) => {
  try {
    // Get the JWT from the request headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if the token is for a brand
    if (decoded.type !== 'brand') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    
    // Attach the brand info to the request
    req.brand = {
      id: decoded.brandId,
      name: decoded.brandName
    };
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Generate M2M token for brand-service communication
app.post('/auth/token', async (req, res) => {
  try {
    const { brand_id, brand_secret } = req.body;
    
    // In a real implementation, you would validate the brand credentials
    // For this example, we'll accept any brand_id and brand_secret
    
    if (!brand_id || !brand_secret) {
      return res.status(400).json({ error: 'Brand ID and secret are required' });
    }
    
    // Generate a token
    const token = jwt.sign(
      {
        brandId: brand_id,
        brandName: `Brand ${brand_id}`,
        type: 'brand',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
      },
      JWT_SECRET
    );
    
    return res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600 // 1 hour in seconds
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

// KYC Service Routes
const kycRouter = express.Router();

// Create KYC request
kycRouter.post('/requests', authenticateBrand, async (req, res) => {
  try {
    const { user_id, document_type } = req.body;
    
    if (!user_id || !document_type) {
      return res.status(400).json({ error: 'User ID and document type are required' });
    }
    
    // Create a mock KYC request
    const kycRequest = {
      id: Math.floor(Math.random() * 1000000),
      user_id,
      document_type,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    return res.status(201).json(kycRequest);
  } catch (error) {
    console.error('Error creating KYC request:', error);
    return res.status(500).json({ error: 'Failed to create KYC request' });
  }
});

// Get KYC status
kycRouter.get('/requests/:id', authenticateBrand, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock KYC request status
    const status = ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)];
    
    return res.json({
      id: parseInt(id),
      status,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting KYC status:', error);
    return res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

app.use('/kyc', kycRouter);

// Wallet Service Routes
const walletRouter = express.Router();

// Create wallet
walletRouter.post('/', authenticateBrand, async (req, res) => {
  try {
    const { user_id, currency } = req.body;
    
    if (!user_id || !currency) {
      return res.status(400).json({ error: 'User ID and currency are required' });
    }
    
    // Create a mock wallet
    const wallet = {
      id: Math.floor(Math.random() * 1000000),
      user_id,
      currency,
      balance: 0,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    return res.status(201).json(wallet);
  } catch (error) {
    console.error('Error creating wallet:', error);
    return res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Get wallet
walletRouter.get('/:id', authenticateBrand, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock wallet data
    return res.json({
      id: parseInt(id),
      user_id: Math.floor(Math.random() * 1000000),
      currency: ['USD', 'EUR', 'BTC', 'ETH'][Math.floor(Math.random() * 4)],
      balance: parseFloat((Math.random() * 10000).toFixed(2)),
      status: 'active',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting wallet:', error);
    return res.status(500).json({ error: 'Failed to get wallet' });
  }
});

app.use('/wallets', walletRouter);

// Mount M2M protected API routes
app.use('/api/m2m', m2mProtectedApi);

// Demo UI route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Mock services running on port ${port}`);
  console.log(`M2M API demo available at: http://localhost:${port}`);
});

module.exports = app;