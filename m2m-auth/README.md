# Machine-to-Machine (M2M) Authentication Service

This service implements OAuth 2.0 Client Credentials Flow for secure service-to-service authentication within the Brand-Platform ecosystem. It allows services, applications, and other non-interactive clients to obtain access tokens for accessing protected resources.

## Overview

The M2M authentication system consists of the following components:

1. **Client Registry**: Manages client applications with their credentials and allowed scopes
2. **Token Service**: Issues, validates, and revokes JWT access tokens 
3. **OAuth Endpoints**: Standard OAuth 2.0 endpoints for token issuance and management
4. **Service Registry**: Catalogs available services and their required scopes

## Features

- OAuth 2.0 Client Credentials Flow implementation
- Secure client registration and credential management
- Scope-based access control for fine-grained permissions
- Token introspection for third-party validation
- Token revocation capabilities
- Integration with existing RSA key infrastructure
- Demo UI for testing the authentication flow

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)
- Supabase (shared with the user authentication system)
- RSA keys (shared with the user authentication system)

### Setting up the Database

1. Run the schema.sql script in your Supabase project. This script is located at `m2m-auth/src/db/schema.sql` and will:

   - Create the dedicated schema for identity provider functionality
   - Set up proper permissions for the service role and other roles
   - Create all required tables with appropriate indexes
   - Set up Row Level Security (RLS) policies 
   - Insert standard scopes

The schema script includes:

```sql
-- Create a dedicated schema for identity provider functionality
CREATE SCHEMA IF NOT EXISTS org_identity_provider;

-- Enable service_role to access the custom schema
ALTER ROLE service_role SET search_path TO public, org_identity_provider;

-- Enable the anon and authenticated roles to access the custom schema through RLS policies
ALTER ROLE anon SET search_path TO public, org_identity_provider;
ALTER ROLE authenticated SET search_path TO public, org_identity_provider;

-- IMPORTANT: Grant permissions to service_role on the schema and all tables
GRANT USAGE ON SCHEMA org_identity_provider TO service_role;
GRANT ALL PRIVILEGES ON SCHEMA org_identity_provider TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA org_identity_provider TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA org_identity_provider TO service_role;

-- Also grant permissions to authenticated users (needed for RLS policies)
GRANT USAGE ON SCHEMA org_identity_provider TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA org_identity_provider TO authenticated;

-- Grant permissions to anon role for public access
GRANT USAGE ON SCHEMA org_identity_provider TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA org_identity_provider TO anon;

-- Tables, indexes, and policies for client registration and token management...
```

> **Important:** Make sure to run the entire schema script to ensure all necessary permissions and tables are correctly set up.

### Running the Service

1. Make sure you've set up the JWT keys as described in the main authentication README.

2. Start the application services using Docker Compose:

```bash
docker-compose up
```

3. Access the M2M Auth service:

- M2M Auth Service: http://localhost:3003

4. Using the Demo UI:
   - Set your admin token by clicking "Save Token" in the Admin Authentication section
   - Register a new client application with appropriate scopes
   - Note the client ID and secret (shown only once)
   - Request an access token using the client credentials
   - Use the token to access protected resources
   - Try token introspection and revocation

## API Documentation

### OAuth 2.0 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/token` | POST | Request an access token using client credentials |
| `/oauth/introspect` | POST | Validate an access token |
| `/oauth/revoke` | POST | Revoke an access token |

### Client Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List all clients (admin only) |
| `/api/clients` | POST | Register a new client (admin only) |
| `/api/clients/:id` | GET | Get a specific client (admin only) |
| `/api/clients/:id` | PUT | Update a client (admin only) |
| `/api/clients/:id/reset-secret` | POST | Reset a client's secret (admin only) |

### Service Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | List all available services |
| `/api/services/:id` | GET | Get details of a specific service |
| `/api/services/scopes` | GET | List all available scopes with descriptions |
| `/api/services` | POST | Register a new service (admin only) |
| `/api/services/:id` | PUT | Update a service (admin only) |
| `/api/services/:id` | DELETE | Delete a service (admin only) |

## Client Credentials Flow

The Client Credentials flow is implemented according to [RFC 6749 Section 4.4](https://tools.ietf.org/html/rfc6749#section-4.4):

1. **Client Registration**: Clients are registered with the authentication server and given a client ID and client secret.

2. **Token Request**: Clients request an access token by authenticating with the authorization server and specifying the desired scopes. The request must use the `application/x-www-form-urlencoded` content type:

```
POST /oauth/token HTTP/1.1
Host: auth.brand-platform.com
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=read+write
```

> **Note:** The `grant_type=client_credentials` parameter is required in the form body. The server will return an "unsupported_grant_type" error if this parameter is missing or has a different value.

3. **Token Response**: The authorization server authenticates the client and issues an access token:

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

4. **Using the Token**: Clients can use the access token to request protected resources:

```
GET /api/resource HTTP/1.1
Host: service.brand-platform.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Token Format

The M2M access tokens are JWTs (JSON Web Tokens) with the following claims:

```json
{
  "iss": "brand-platform-m2m",
  "sub": "client-uuid",
  "aud": "api",
  "client_id": "client-uuid",
  "client_name": "Example Service",
  "scope": "read write trading",
  "exp": 1619999700,
  "iat": 1619996100,
  "jti": "unique-token-id",
  "nonce": "random-nonce-value"
}
```

## Security Features

- Asymmetric JWT signing (RS256 algorithm)
- Shared key infrastructure with user authentication system
- Client secret hashing with SHA-256
- Scope-based authorization
- Token revocation support
- Token introspection for third-party validation
- Short-lived access tokens (1 hour by default)

## Development

### Environment Variables

The M2M Auth service uses the following environment variables:

```
# M2M Auth Configuration
M2M_PORT=3003
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
JWT_PRIVATE_KEY_PATH=/app/keys/private/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public/public.pem
```

These are shared with the rest of the authentication system through the central `.env` file.

### Running Tests

```bash
cd m2m-auth
npm test
```

## Common Use Cases

### Service-to-Service Communication

When one microservice needs to access another microservice's protected API:

1. The calling service authenticates with its client credentials
2. It includes the resulting access token in API requests to the target service
3. The target service validates the token and checks scopes before processing the request

### Platform-to-Service Integration

When the platform needs to access a specific service on behalf of its operations:

1. The platform service authenticates with its client credentials
2. It specifies the necessary scope for the operation (e.g., `kyc:read`)
3. It uses the token to request data from the KYC service

### Brand-to-Service Integration

When a brand needs to access a shared service:

1. The brand service authenticates with its client credentials
2. It receives a token with appropriate scopes (e.g., `pricing:read`)
3. It uses the token to request data from the pricing service