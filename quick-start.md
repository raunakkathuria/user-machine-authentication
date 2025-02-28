# Quick Start Guide for Brand-Platform Integration

This guide will help you set up and run the brand-platform integration system locally using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 16+ (for local development)
- Git

## Project Structure

Create the following folder structure:

```
brand-platform-integration/
├── docker-compose.yaml
├── brand-app/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── routes/
│       │   └── platform.js
│       └── auth/
│           └── token-service.js
├── platform-app/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── routes/
│       │   └── auth.js
│       └── middleware/
│           └── auth.js
└── mock-services/
    ├── Dockerfile
    ├── package.json
    └── src/
        └── app.js
```

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url> brand-platform-integration
cd brand-platform-integration
```

### 2. Brand App Setup

Create the brand app package.json:

```bash
cd brand-app
npm init -y
npm install express @supabase/supabase-js jsonwebtoken cookie-parser dotenv cors
```

Create the Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"]
```

Create a basic app.js:

```javascript
// brand-app/src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const platformRoutes = require('./routes/platform');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Routes
app.use('/platform', platformRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start the server
app.listen(port, () => {
  console.log(`Brand app running on port ${port}`);
});

module.exports = app;
```

### 3. Platform App Setup

```bash
cd ../platform-app
npm init -y
npm install express jsonwebtoken cookie-parser dotenv cors
```

Create the Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "src/app.js"]
```

Create a basic app.js:

```javascript
// platform-app/src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Routes
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start the server
app.listen(port, () => {
  console.log(`Platform app running on port ${port}`);
});

module.exports = app;
```

### 4. Mock Services Setup

```bash
cd ../mock-services
npm init -y
npm install express jsonwebtoken dotenv cors
```

Create the Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3002

CMD ["node", "src/app.js"]
```

### 5. Run with Docker Compose

From the project root, run:

```bash
docker-compose up --build
```

This will build and start all the services. The first time may take a few minutes.

## Testing the Integration

### 1. Generate a Brand Service Token

```bash
curl -X POST http://localhost:3002/auth/token \
  -H "Content-Type: application/json" \
  -d '{"brand_id": "brand-portal", "brand_secret": "demo-secret"}'
```

Save the returned access token.

### 2. Create a User in Supabase

The Supabase UI should be available at http://localhost:8000

- Navigate to the Authentication section
- Create a new user with email and password

### 3. Test the Platform Access Flow

```bash
# First, get a Supabase auth token by logging in
export SUPABASE_TOKEN=$(curl -X POST http://localhost:8000/auth/v1/token \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTl9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')

# Then, request a platform access token
curl -X POST http://localhost:3000/platform/access-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -d '{"platformId": "trading", "requestedScope": "trading"}'
```

This should return a platform access token.

### 4. Access the Platform

With the token from the previous step:

```bash
# Replace YOUR_PLATFORM_TOKEN with the token from the previous step
curl -v "http://localhost:3001/auth/validate?token=YOUR_PLATFORM_TOKEN"
```

If everything is set up correctly, you should be redirected to the platform dashboard.

## Troubleshooting

### Supabase Connection Issues

If you're having trouble connecting to Supabase, check:

1. Supabase is running properly:
   ```
   docker-compose logs supabase
   ```

2. The Supabase URL and key are correct in your brand-app environment variables

### JWT Validation Errors

If you're seeing JWT validation errors:

1. Check that the public and private keys match
2. Verify the token algorithm (RS256)
3. Ensure the token hasn't expired

### Service Communication

If services cannot communicate:

1. Verify all services are on the same Docker network:
   ```
   docker network inspect brand-platform-network
   ```

2. Check that the hostnames are correct in environment variables (e.g., `PLATFORM_API_URL`)
