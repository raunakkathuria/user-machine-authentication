// m2m-auth/src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.M2M_PORT || 3003,
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || '/app/keys/private/private.pem',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '/app/keys/public/public.pem',
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:8000',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  tokenExpiresIn: 60 * 60, // 1 hour in seconds for machine tokens
  adminToken: process.env.ADMIN_TOKEN || 'dev-admin-token' // Only for development
};