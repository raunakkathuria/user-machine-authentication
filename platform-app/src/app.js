// platform-app/src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const { requirePlatformSession } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for form data parsing
app.use(cookieParser());
app.use(cors({ 
  origin: true,        // Allow all origins (or specify ['http://localhost:3000'] for just the brand app)
  credentials: true    // Allow cookies to be sent
}));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', authRoutes);

// Main entry point - platform home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard route (protected)
app.get('/dashboard', requirePlatformSession, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start the server
app.listen(port, () => {
  console.log(`Platform app running on port ${port}`);
});

module.exports = app;