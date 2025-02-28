# Brand-Platform Authentication System Makefile

.PHONY: help setup-all setup-dirs setup-keys copy-keys setup-config clean

help:
	@echo "Available commands:"
	@echo "  make setup-all      - Set up all directories, generate keys, and copy configuration"
	@echo "  make setup-dirs     - Create necessary directories"
	@echo "  make setup-keys     - Generate RSA key pair"
	@echo "  make copy-keys      - Copy keys to service directories"
	@echo "  make setup-config   - Create basic configuration files"
	@echo "  make clean          - Remove all generated files and directories"

setup-all: setup-dirs setup-keys copy-keys setup-config
	@echo "✅ Setup completed successfully"
	@echo "Next steps:"
	@echo "1. Configure environment variables: cp .env.example .env"
	@echo "2. Edit .env with your specific values"
	@echo "3. Start services with: docker-compose up"

setup-dirs:
	@echo "Creating directories..."
	mkdir -p keys/private keys/public
	mkdir -p brand-app/keys/private brand-app/keys/public
	mkdir -p platform-app/keys/private platform-app/keys/public
	mkdir -p m2m-auth/keys/private m2m-auth/keys/public
	mkdir -p mock-services/keys/private mock-services/keys/public
	mkdir -p m2m-auth/src/auth m2m-auth/src/config m2m-auth/tests
	@echo "✅ Directories created"

setup-keys:
	@echo "Generating RSA keys..."
	openssl genrsa -out keys/private/private.pem 2048
	openssl rsa -in keys/private/private.pem -pubout -out keys/public/public.pem
	chmod 600 keys/private/private.pem
	chmod 644 keys/public/public.pem
	@echo "✅ RSA keys generated"

copy-keys:
	@echo "Copying keys to service directories..."
	cp keys/private/private.pem brand-app/keys/private/
	cp keys/public/public.pem brand-app/keys/public/
	cp keys/private/private.pem m2m-auth/keys/private/
	cp keys/public/public.pem m2m-auth/keys/public/
	cp keys/private/private.pem platform-app/keys/private/
	cp keys/public/public.pem platform-app/keys/public/
	cp keys/private/private.pem mock-services/keys/private/
	cp keys/public/public.pem mock-services/keys/public/
	chmod 600 brand-app/keys/private/private.pem
	chmod 600 m2m-auth/keys/private/private.pem
	chmod 600 platform-app/keys/private/private.pem
	chmod 600 mock-services/keys/private/private.pem
	chmod 644 brand-app/keys/public/public.pem
	chmod 644 m2m-auth/keys/public/public.pem
	chmod 644 platform-app/keys/public/public.pem
	chmod 644 mock-services/keys/public/public.pem
	@echo "✅ Keys copied to service directories"

setup-config:
	@echo "Creating configuration files..."
	@if [ ! -f m2m-auth/src/config/index.js ]; then \
		echo "// m2m-auth/src/config/index.js" > m2m-auth/src/config/index.js; \
		echo "require('dotenv').config();" >> m2m-auth/src/config/index.js; \
		echo "" >> m2m-auth/src/config/index.js; \
		echo "module.exports = {" >> m2m-auth/src/config/index.js; \
		echo "  port: process.env.M2M_PORT || 3003," >> m2m-auth/src/config/index.js; \
		echo "  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || '/app/keys/private/private.pem'," >> m2m-auth/src/config/index.js; \
		echo "  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '/app/keys/public/public.pem'," >> m2m-auth/src/config/index.js; \
		echo "  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:8000'," >> m2m-auth/src/config/index.js; \
		echo "  supabaseAnonKey: process.env.SUPABASE_ANON_KEY," >> m2m-auth/src/config/index.js; \
		echo "  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY," >> m2m-auth/src/config/index.js; \
		echo "  tokenExpiresIn: 60 * 60, // 1 hour in seconds for machine tokens" >> m2m-auth/src/config/index.js; \
		echo "  adminToken: process.env.ADMIN_TOKEN || 'dev-admin-token' // Only for development" >> m2m-auth/src/config/index.js; \
		echo "};" >> m2m-auth/src/config/index.js; \
		echo "Created m2m-auth/src/config/index.js"; \
	else \
		echo "m2m-auth/src/config/index.js already exists, skipping"; \
	fi
	@if [ ! -f m2m-auth/src/auth/middleware.js ]; then \
		echo "// m2m-auth/src/auth/middleware.js" > m2m-auth/src/auth/middleware.js; \
		echo "const { verifyToken } = require('../services/token-service');" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "/**" >> m2m-auth/src/auth/middleware.js; \
		echo " * Middleware to verify admin access token" >> m2m-auth/src/auth/middleware.js; \
		echo " */" >> m2m-auth/src/auth/middleware.js; \
		echo "const adminAuth = (req, res, next) => {" >> m2m-auth/src/auth/middleware.js; \
		echo "  // Get token from authorization header" >> m2m-auth/src/auth/middleware.js; \
		echo "  const authHeader = req.headers.authorization;" >> m2m-auth/src/auth/middleware.js; \
		echo "  if (!authHeader || !authHeader.startsWith('Bearer ')) {" >> m2m-auth/src/auth/middleware.js; \
		echo "    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });" >> m2m-auth/src/auth/middleware.js; \
		echo "  }" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "  // Extract token" >> m2m-auth/src/auth/middleware.js; \
		echo "  const token = authHeader.split(' ')[1];" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "  try {" >> m2m-auth/src/auth/middleware.js; \
		echo "    // Verify token" >> m2m-auth/src/auth/middleware.js; \
		echo "    const decoded = verifyAdminToken(token);" >> m2m-auth/src/auth/middleware.js; \
		echo "    " >> m2m-auth/src/auth/middleware.js; \
		echo "    // Attach user info to request" >> m2m-auth/src/auth/middleware.js; \
		echo "    req.admin = decoded;" >> m2m-auth/src/auth/middleware.js; \
		echo "    " >> m2m-auth/src/auth/middleware.js; \
		echo "    // Continue" >> m2m-auth/src/auth/middleware.js; \
		echo "    next();" >> m2m-auth/src/auth/middleware.js; \
		echo "  } catch (error) {" >> m2m-auth/src/auth/middleware.js; \
		echo "    console.error('Admin auth error:', error.message);" >> m2m-auth/src/auth/middleware.js; \
		echo "    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin token' });" >> m2m-auth/src/auth/middleware.js; \
		echo "  }" >> m2m-auth/src/auth/middleware.js; \
		echo "};" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "/**" >> m2m-auth/src/auth/middleware.js; \
		echo " * Very simple admin token verification " >> m2m-auth/src/auth/middleware.js; \
		echo " * In production, this would use proper JWT verification" >> m2m-auth/src/auth/middleware.js; \
		echo " */" >> m2m-auth/src/auth/middleware.js; \
		echo "const verifyAdminToken = (token) => {" >> m2m-auth/src/auth/middleware.js; \
		echo "  // In development mode, allow a static admin token" >> m2m-auth/src/auth/middleware.js; \
		echo "  const { adminToken } = require('../config');" >> m2m-auth/src/auth/middleware.js; \
		echo "  " >> m2m-auth/src/auth/middleware.js; \
		echo "  if (token === adminToken) {" >> m2m-auth/src/auth/middleware.js; \
		echo "    return { " >> m2m-auth/src/auth/middleware.js; \
		echo "      role: 'admin'," >> m2m-auth/src/auth/middleware.js; \
		echo "      id: 'admin'," >> m2m-auth/src/auth/middleware.js; \
		echo "      name: 'System Administrator' " >> m2m-auth/src/auth/middleware.js; \
		echo "    };" >> m2m-auth/src/auth/middleware.js; \
		echo "  }" >> m2m-auth/src/auth/middleware.js; \
		echo "  " >> m2m-auth/src/auth/middleware.js; \
		echo "  // For more complex scenarios, we could use the JWT token service" >> m2m-auth/src/auth/middleware.js; \
		echo "  throw new Error('Invalid admin token');" >> m2m-auth/src/auth/middleware.js; \
		echo "};" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "/**" >> m2m-auth/src/auth/middleware.js; \
		echo " * Middleware to verify M2M access token with required scopes" >> m2m-auth/src/auth/middleware.js; \
		echo " */" >> m2m-auth/src/auth/middleware.js; \
		echo "const scopeAuth = (requiredScopes) => {" >> m2m-auth/src/auth/middleware.js; \
		echo "  return async (req, res, next) => {" >> m2m-auth/src/auth/middleware.js; \
		echo "    // Get token from authorization header" >> m2m-auth/src/auth/middleware.js; \
		echo "    const authHeader = req.headers.authorization;" >> m2m-auth/src/auth/middleware.js; \
		echo "    if (!authHeader || !authHeader.startsWith('Bearer ')) {" >> m2m-auth/src/auth/middleware.js; \
		echo "      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });" >> m2m-auth/src/auth/middleware.js; \
		echo "    }" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "    // Extract token" >> m2m-auth/src/auth/middleware.js; \
		echo "    const token = authHeader.split(' ')[1];" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "    try {" >> m2m-auth/src/auth/middleware.js; \
		echo "      // Verify token" >> m2m-auth/src/auth/middleware.js; \
		echo "      const decoded = await verifyToken(token);" >> m2m-auth/src/auth/middleware.js; \
		echo "      " >> m2m-auth/src/auth/middleware.js; \
		echo "      // Check scopes" >> m2m-auth/src/auth/middleware.js; \
		echo "      if (requiredScopes && requiredScopes.length > 0) {" >> m2m-auth/src/auth/middleware.js; \
		echo "        const tokenScopes = decoded.scope.split(' ');" >> m2m-auth/src/auth/middleware.js; \
		echo "        const hasRequiredScopes = requiredScopes.every(scope => tokenScopes.includes(scope));" >> m2m-auth/src/auth/middleware.js; \
		echo "        " >> m2m-auth/src/auth/middleware.js; \
		echo "        if (!hasRequiredScopes) {" >> m2m-auth/src/auth/middleware.js; \
		echo "          return res.status(403).json({ " >> m2m-auth/src/auth/middleware.js; \
		echo "            error: 'Forbidden', " >> m2m-auth/src/auth/middleware.js; \
		echo "            message: \`Insufficient scope. Required: \${requiredScopes.join(', ')}\` " >> m2m-auth/src/auth/middleware.js; \
		echo "          });" >> m2m-auth/src/auth/middleware.js; \
		echo "        }" >> m2m-auth/src/auth/middleware.js; \
		echo "      }" >> m2m-auth/src/auth/middleware.js; \
		echo "      " >> m2m-auth/src/auth/middleware.js; \
		echo "      // Attach client info to request" >> m2m-auth/src/auth/middleware.js; \
		echo "      req.client = decoded;" >> m2m-auth/src/auth/middleware.js; \
		echo "      " >> m2m-auth/src/auth/middleware.js; \
		echo "      // Continue" >> m2m-auth/src/auth/middleware.js; \
		echo "      next();" >> m2m-auth/src/auth/middleware.js; \
		echo "    } catch (error) {" >> m2m-auth/src/auth/middleware.js; \
		echo "      console.error('Token verification error:', error.message);" >> m2m-auth/src/auth/middleware.js; \
		echo "      return res.status(401).json({ error: 'Unauthorized', message: \`Invalid token: \${error.message}\` });" >> m2m-auth/src/auth/middleware.js; \
		echo "    }" >> m2m-auth/src/auth/middleware.js; \
		echo "  };" >> m2m-auth/src/auth/middleware.js; \
		echo "};" >> m2m-auth/src/auth/middleware.js; \
		echo "" >> m2m-auth/src/auth/middleware.js; \
		echo "module.exports = {" >> m2m-auth/src/auth/middleware.js; \
		echo "  adminAuth," >> m2m-auth/src/auth/middleware.js; \
		echo "  scopeAuth" >> m2m-auth/src/auth/middleware.js; \
		echo "};" >> m2m-auth/src/auth/middleware.js; \
		echo "Created m2m-auth/src/auth/middleware.js"; \
	else \
		echo "m2m-auth/src/auth/middleware.js already exists, skipping"; \
	fi
	@echo "✅ Configuration files created"

clean:
	@echo "Cleaning up generated directories and files..."
	rm -rf keys/private/* keys/public/*
	rm -rf brand-app/keys/private/* brand-app/keys/public/*
	rm -rf platform-app/keys/private/* platform-app/keys/public/*
	rm -rf m2m-auth/keys/private/* m2m-auth/keys/public/*
	rm -rf mock-services/keys/private/* mock-services/keys/public/*
	@echo "✅ Cleanup completed"