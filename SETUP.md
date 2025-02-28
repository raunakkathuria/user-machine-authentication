# Brand-Platform Authentication System Setup Guide

This guide provides step-by-step instructions for setting up the authentication system after a fresh repository clone.

## Automated Setup with Make

For an automated setup process, simply run:

```bash
make setup-all
```

This command will:
1. Create all required directories
2. Generate RSA key pairs
3. Copy the keys to service-specific directories
4. Create necessary configuration files

For more targeted setup tasks, use the following commands:
- `make setup-dirs` - Just create the directories
- `make setup-keys` - Just generate the RSA keys
- `make copy-keys` - Just copy keys to service directories
- `make setup-config` - Just create the configuration files
- `make clean` - Remove all generated files

## Manual Setup Checklist

### 1. Create Required Directories

```bash
# Create the main key directories
mkdir -p keys/private keys/public

# Create service-specific key directories (for local development)
mkdir -p brand-app/keys/private brand-app/keys/public
mkdir -p platform-app/keys/private platform-app/keys/public
mkdir -p m2m-auth/keys/private m2m-auth/keys/public
mkdir -p mock-services/keys/private mock-services/keys/public

# Create required config and code directories
mkdir -p m2m-auth/src/auth m2m-auth/src/config m2m-auth/tests
```

### 2. Generate RSA Keys

```bash
# Generate a private key
openssl genrsa -out keys/private/private.pem 2048

# Extract the public key from the private key
openssl rsa -in keys/private/private.pem -pubout -out keys/public/public.pem

# Copy keys to service-specific directories for local development
cp keys/private/private.pem brand-app/keys/private/
cp keys/public/public.pem brand-app/keys/public/
cp keys/private/private.pem m2m-auth/keys/private/
cp keys/public/public.pem m2m-auth/keys/public/
cp keys/private/private.pem platform-app/keys/private/
cp keys/public/public.pem platform-app/keys/public/
cp keys/private/private.pem mock-services/keys/private/
cp keys/public/public.pem mock-services/keys/public/
```

### 3. Set Up Configuration Files

Create the basic configuration file for M2M Auth:

```bash
cat > m2m-auth/src/config/index.js << 'EOF'
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
EOF
```

Create the authentication middleware file:

```bash
cat > m2m-auth/src/auth/middleware.js << 'EOF'
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
EOF
```

### 4. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your specific values
# nano .env
```

### 5. Set Up Supabase Schema

Run the schema.sql script in your Supabase instance:

```bash
# If using Supabase CLI
supabase db execute < m2m-auth/src/db/schema.sql

# If using the Supabase UI
# Copy the contents of m2m-auth/src/db/schema.sql and run it in the SQL Editor
```

### 6. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build
```

## Key File Locations

Here's the expected file structure after initial setup:

```
authentication/
├── keys/
│   ├── private/
│   │   └── private.pem  # Main private key
│   └── public/
│       └── public.pem   # Main public key
├── brand-app/
│   └── keys/
│       ├── private/
│       │   └── private.pem  # Copy of private key for local dev
│       └── public/
│           └── public.pem   # Copy of public key for local dev
├── platform-app/
│   └── keys/
│       ├── private/
│       │   └── private.pem  # Copy of private key for local dev
│       └── public/
│           └── public.pem   # Copy of public key for local dev
├── m2m-auth/
│   ├── keys/
│   │   ├── private/
│   │   │   └── private.pem  # Copy of private key for local dev
│   │   └── public/
│   │       └── public.pem   # Copy of public key for local dev
│   └── src/
│       ├── auth/
│       │   └── middleware.js  # Authentication middleware
│       └── config/
│           └── index.js       # Configuration settings
└── mock-services/
    └── keys/
        ├── private/
        │   └── private.pem  # Copy of private key for local dev
        └── public/
            └── public.pem   # Copy of public key for local dev
```

## Notes

1. In the Docker setup, the keys directory is mounted as a volume, so Docker containers use the keys from the root `/keys` directory.

2. The service-specific key directories are primarily for local development outside of Docker.

3. The RSA keys are used for:
   - Signing tokens (private key)
   - Verifying tokens (public key)

4. For production deployment, you would typically:
   - Store private keys securely using a secret manager
   - Distribute public keys to all services that need to verify tokens
   - Configure key rotation policies

## Troubleshooting

### Permission Issues with Keys

If you encounter permission issues with the key files:

```bash
# Set appropriate permissions for the private key
chmod 600 keys/private/private.pem
chmod 600 brand-app/keys/private/private.pem
chmod 600 m2m-auth/keys/private/private.pem
chmod 600 platform-app/keys/private/private.pem
chmod 600 mock-services/keys/private/private.pem

# Set appropriate permissions for the public key
chmod 644 keys/public/public.pem 
chmod 644 brand-app/keys/public/public.pem
chmod 644 m2m-auth/keys/public/public.pem
chmod 644 platform-app/keys/public/public.pem
chmod 644 mock-services/keys/public/public.pem
```

### Missing Directories After Git Clean

If you run `git clean -fd` and lose your key directories, run the setup commands again to recreate them.

## Quick Setup Script

For convenience, you can use this one-line command to create all the necessary directories and files:

```bash
mkdir -p keys/{private,public} brand-app/keys/{private,public} platform-app/keys/{private,public} m2m-auth/keys/{private,public} mock-services/keys/{private,public} m2m-auth/src/{auth,config} m2m-auth/tests && openssl genrsa -out keys/private/private.pem 2048 && openssl rsa -in keys/private/private.pem -pubout -out keys/public/public.pem && cp keys/private/private.pem brand-app/keys/private/ && cp keys/public/public.pem brand-app/keys/public/ && cp keys/private/private.pem m2m-auth/keys/private/ && cp keys/public/public.pem m2m-auth/keys/public/ && cp keys/private/private.pem platform-app/keys/private/ && cp keys/public/public.pem platform-app/keys/public/ && cp keys/private/private.pem mock-services/keys/private/ && cp keys/public/public.pem mock-services/keys/public/ && chmod 600 keys/private/private.pem brand-app/keys/private/private.pem m2m-auth/keys/private/private.pem platform-app/keys/private/private.pem mock-services/keys/private/private.pem && chmod 644 keys/public/public.pem brand-app/keys/public/public.pem m2m-auth/keys/public/public.pem platform-app/keys/public/public.pem mock-services/keys/public/public.pem
```