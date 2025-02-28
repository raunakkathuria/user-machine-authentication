# Brand-Platform Authentication System

This authentication system provides comprehensive identity and access management for the Brand-Platform ecosystem. It supports both user-based authentication and machine-to-machine (M2M) authentication flows.

## Overview

The system consists of four main components:

1. **Brand Application**: Handles user authentication and provides access to trading platforms
2. **Platform Application**: Validates tokens and provides trading functionality
3. **M2M Auth Service**: Manages client credentials and OAuth 2.0 token issuance for service-to-service communication
4. **Mock Services**: Simulates shared services like KYC and wallet management

## Authentication Flows

The system implements two distinct authentication flows:

### 1. User Authentication Flow
* Designed for interactive web applications with user interfaces
* Uses Supabase Auth for identity management
* Implements JWT-based Single Sign-On (SSO) to trading platforms
* Session-based with token refresh capabilities
* Documented in detail in [platform-app/README.md](platform-app/README.md)

### 2. Machine-to-Machine (M2M) Authentication Flow
* Implements OAuth 2.0 Client Credentials Flow (RFC 6749)
* Designed for non-interactive service-to-service communication
* Client registration and secret management
* Scope-based access control
* Token introspection and revocation
* Documented in detail in [m2m-auth/README.md](m2m-auth/README.md)

## Key Features

- User registration and authentication via Supabase Auth
- JWT-based SSO to trading platforms for users
- OAuth 2.0 Client Credentials for service-to-service authentication
- Token-based authorization with fine-grained permissions
- Token revocation and session management
- CSRF protection for platform forms
- Brand whitelisting for platform access control
- Secure RSA signature verification (RS256)
- Demo UIs to test both authentication flows

## When to Use Each Flow

### Use User Authentication When:
- Building interactive web applications
- Users need to log in through a browser
- Human interaction is required
- Managing user sessions across multiple platforms
- Supporting Single Sign-On experiences

### Use M2M Authentication When:
- Building non-interactive services
- Services need to communicate directly with each other
- Human interaction is not required or possible
- Long-lived access is needed between services
- Task-specific permissions are required for services

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)
- Supabase (local or hosted instance)
- OpenSSL (for generating JWT keys)

### Setting up JWT Keys

The system uses RSA key pairs for secure JWT token signing and verification. Follow these steps to set up the keys:

1. Create directories for the keys:
```bash
mkdir -p keys/private keys/public
```

2. Generate a private key:
```bash
openssl genrsa -out keys/private/private.pem 2048
```

3. Extract the public key from the private key:
```bash
openssl rsa -in keys/private/private.pem -pubout -out keys/public/public.pem
```

> **Note:** These keys will be mounted as volumes in the Docker containers. The private key is used by the brand app to sign tokens, and the public key is used by the platform app to verify tokens.

### Setting up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the values in the `.env` file as needed. The default values should work for a local development setup.

### Setting up Supabase

1. To set up a local Supabase instance, follow these steps:

```bash
# Get the code
git clone --depth 1 https://github.com/supabase/supabase

# Go to the docker folder
cd supabase/docker

# Copy the fake env vars
cp .env.example .env

# Pull the latest images
docker compose pull

# Start the services (in detached mode)
docker compose up -d
```

Refer https://supabase.com/docs/guides/self-hosting/docker

2. Verify Supabase is running:
   - Access Supabase Studio at http://localhost:3500
   - Follow any initial setup wizards in Supabase Studio
   - Set up the required tables for authentication if prompted

3. For a development environment, you can enable email auto-confirmation by adding these settings to your Supabase .env file:

```
## Email auth
ENABLE_EMAIL_AUTOCONFIRM=true
GOTRUE_MAILER_AUTOCONFIRM=true
```

This will bypass the email confirmation step and automatically confirm new users when they sign up, which is convenient for development.

After adding these settings to your Supabase .env file, restart the Supabase services.

### Running the System

1. Make sure you've set up the JWT keys and environment variables as described above.

2. Start the application services using Docker Compose:

```bash
docker-compose up
```

3. Access the services:

- Brand App: http://localhost:3000
- Platform App: http://localhost:3001
- Mock Services: http://localhost:3002

4. Using the Demo UIs:
   - **User Authentication Demo** (http://localhost:3000):
     - Register a new user on the Brand App
     - Login with the registered credentials
     - Access the trading platform
     - The platform will validate your token and redirect to the dashboard
     - You can revoke tokens and logout to test the security features
   
   - **M2M Authentication Demo** (http://localhost:3003):
     - Set your admin token in the UI
     - Register a new client with appropriate scopes
     - Note the client ID and client secret (only shown once)
     - Request an access token using client credentials
     - Test the token using the mock services API demo
   
   - **Protected API Demo** (http://localhost:3002):
     - Use tokens obtained from the M2M Auth service
     - Test different endpoints that require specific scopes
     - See how scope-based access control works in real-time

> **Note:** If Docker complains about missing environment variables, ensure your `.env` file is correctly set up in the root directory.

## API Documentation

### Brand Application

#### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Register a new user |
| `/auth/login` | POST | Login an existing user |
| `/auth/refresh` | POST | Refresh an auth token |
| `/auth/logout` | POST | Logout a user |
| `/auth/me` | GET | Get current user info |

#### Platform Access Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/platform/access-token` | POST | Generate a platform access token |
| `/platform/access/:platformId` | GET | Redirect to platform with token |
| `/platform/revoke-token` | POST | Revoke a platform access token |
| `/platform/verify-token` | POST | Verify a platform access token |

### Platform Application

#### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/validate` | GET | Validate platform access token and create session |
| `/auth/dashboard` | GET | Display platform dashboard (protected) |
| `/auth/logout` | POST | Logout from platform |
| `/auth/session` | GET | Get current session info |
| `/auth/error` | GET | Display authentication errors |

### M2M Authentication Service

#### OAuth 2.0 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/token` | POST | Request an access token using client credentials |
| `/oauth/introspect` | POST | Validate an access token |
| `/oauth/revoke` | POST | Revoke an access token |

### Mock Services API (Protected Resources)

#### M2M Protected Endpoints

| Endpoint | Method | Required Scope | Description |
|----------|--------|---------------|-------------|
| `/api/m2m/data` | GET | api:read | Get protected data |
| `/api/m2m/events` | GET | events:subscribe | Subscribe to events feed |
| `/api/m2m/data` | POST | api:write | Create new data |

## Authentication Flows

### User Authentication Flow

1. **User Registration/Login via Brand**:
   - User registers or logs in via Supabase Auth on the brand app
   - Brand app receives Supabase JWT token
   - User sees brand dashboard with platform options

2. **Platform Access from Brand**:
   - User requests access to a trading platform from brand dashboard
   - Brand app generates a platform access token using RS256 signing
   - User is redirected to platform with token

3. **Direct Platform Access with SSO**:
   - User directly accesses the platform website
   - Platform shows "Login with Brand Portal" button
   - User is redirected to brand app for authentication
   - After successful login, brand app generates platform token
   - User is redirected back to platform with the token

4. **Platform Session**:
   - Platform validates the token (signature, expiry, permissions)
   - Platform creates a session cookie for the user
   - User accesses trading functionality

5. **Token Expiration Handling**:
   - **Platform responsibility**: Detects expired tokens during validation
   - **Brand responsibility**: Issues new tokens when needed
   - When platform session expires, user is redirected back to brand app with parameters:
     ```
     ?error=session_expired&platform=trading&refresh=true
     ```
   - Brand app can silently refresh tokens if user still has valid brand session

### Machine-to-Machine (M2M) Authentication Flow

1. **Client Registration**:
   - Administrators register client applications in the M2M Auth Service
   - Each client is assigned a unique client ID and secret
   - Clients are granted specific scopes based on their needs

2. **Token Request**:
   - Client service authenticates with the M2M Auth Service using its credentials
   - Client includes the `grant_type=client_credentials` parameter
   - Client may request specific scopes in the token request

3. **Token Response**:
   - M2M Auth Service validates the client credentials
   - M2M Auth Service checks if requested scopes are allowed for the client
   - M2M Auth Service issues a signed JWT access token with appropriate scopes

4. **Accessing Protected Resources**:
   - Client includes the access token in the Authorization header when calling APIs
   - Protected service validates the token (signature, expiry, issuer)
   - Protected service checks if the token has the required scopes for the operation
   - If valid, the protected service processes the request and returns a response

5. **Token Management**:
   - Tokens have a limited lifespan (typically 1 hour)
   - Tokens can be revoked if needed
   - Services can introspect tokens to validate them before processing requests

For more detailed authentication flows, see the [technical-specs.md](technical-specs.md#authentication-flows) and [authentication-flows.md](authentication-flows.md) documents.

## Security Features

- Asymmetric JWT signing (RS256 algorithm)
- File-based key management (keys mounted as volumes)
- Short-lived access tokens (15 minutes)
- Token revocation support
- CSRF protection for form submissions
- Secure, HttpOnly cookies for session management
- Brand whitelisting for platform access control
- Permission-based authorization
- Environment variables for sensitive configuration
- Form-based token submission (instead of URL parameters)

## Development

### Environment Variables

The system uses a centralized `.env` file at the root of the project for all services. This approach provides a single source of truth for configuration, making it easier to maintain and deploy. Check the `.env.example` file in the root directory for the required variables.

Key environment variables include:

```
# Brand App Configuration
BRAND_PORT=3000
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
JWT_PRIVATE_KEY_PATH=/app/keys/private/private.pem

# Platform App Configuration
PLATFORM_PORT=3001
WHITELIST_BRANDS=brand-portal,brand-2,brand-3
JWT_PUBLIC_KEY_PATH=/app/keys/public/public.pem
```

For local development, the Docker Compose setup reads these environment variables from the `.env` file and injects them into the containers.

### Brand Customization

The brand app UI can be customized with brand-specific colors and styling. The system uses CSS variables for easy customization:

```css
:root {
    --primary-color: #ff7e88;
    --secondary-color: #b1b4bc;
}
```

These variables are used throughout the application for consistent branding. To change the brand colors, modify the CSS variables in `brand-app/src/public/styles.css`.

### Running Tests

Each application has its own test suite:

```bash
# Run all tests
cd platform-app && npm test

# Run only middleware tests
cd platform-app && npm run test:middleware
```

The test suite includes comprehensive unit tests for the authentication and authorization components. See [platform-app/tests/README.md](platform-app/tests/README.md) for detailed test documentation.

Key test scenarios include:
- Brand whitelist validation 
- JWT token validation with RSA public key
- Session management
- Permission-based access control
- CSRF token generation and validation
