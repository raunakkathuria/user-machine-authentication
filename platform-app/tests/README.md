# Authentication System Test Suite

This directory contains unit tests for the Brand-Platform authentication system. The tests focus on validating token handling, authorization mechanisms, and middleware functionality.

## Testing Philosophy

Our testing approach follows these principles:

1. **Isolation**: Each test runs in isolation, with mocked dependencies to avoid external service reliance
2. **Coverage**: Tests cover both happy paths and error cases for each component
3. **Realistic**: Test scenarios mirror actual authorization flows and edge cases

## Test Structure

The test suite is organized into focused test files:

- `auth.middleware.test.js`: Tests for authentication middleware components
- `auth.routes.test.js`: Tests for API route handlers

## Running Tests

To run all tests:

```bash
npm test
```

To run a specific test file:

```bash
npm run test:middleware  # Runs only middleware tests
```

## Mock Strategy

Our tests use Jest's mocking capabilities to simulate:

- JWT verification
- File system operations (key loading)
- Cryptographic functions
- Session management

### Environment Variables

Tests rely on these environment variables:

- `WHITELIST_BRANDS`: Comma-separated list of authorized brands (e.g. "brand-portal,brand-2,brand-3")

## Key Test Scenarios

### Brand Authorization Tests

The test suite validates that:

1. Tokens from whitelisted brands are accepted
2. Tokens from non-whitelisted brands are rejected with a 403 error
3. The `requireBrand` middleware enforces brand authorization rules
4. Proper error messages are returned for unauthorized brands

### Middleware Tests

Tests ensure the middleware components:

1. Correctly validate session presence and content
2. Enforce brand whitelist permissions
3. Check user permissions appropriately
4. Generate and validate CSRF tokens

## Future Test Coverage

Areas for expanded test coverage:

1. Integration tests with actual JWT tokens
2. End-to-end tests for complete authentication flows
3. Performance tests for token validation under load
4. Security tests for token tampering scenarios

## Contributing to Tests

When adding new tests:

1. Follow the established patterns for mocking and assertions
2. Ensure test names clearly describe the scenario being tested
3. Focus on testing one behavior per test case
4. Keep assertions focused and explicit