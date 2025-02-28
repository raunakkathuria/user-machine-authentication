# Brand-Platform Auth Development Guide

## Commands
- **Start Services**: `docker-compose up`
- **Dev Mode**: `npm run dev` (from service directory)
- **Start Individual Service**: `cd brand-app && npm run dev`
- **Production Start**: `npm start`
- **Run All Tests**: `cd platform-app && npm test`
- **Run Middleware Tests**: `cd platform-app && npm run test:middleware`
- **Run Single Test File**: `cd platform-app && npx jest tests/auth.middleware.test.js`
- **Run Specific Test**: `cd platform-app && npx jest -t "should return 403 when brand is not whitelisted"`

## Code Style Guidelines
- Use ESM import/export syntax when possible
- Follow camelCase naming for variables/functions, PascalCase for classes
- Organize imports: native modules → external packages → internal modules
- Always handle errors with try/catch in async functions and proper logging
- Use async/await over callbacks and promise chains
- Add JSDoc comments for functions describing params and returns
- Include explicit HTTP status codes in all responses
- Apply consistent indentation (2 spaces) and line length (<80 chars)
- Use consistent bracing style with opening brace on same line
- Validate all user inputs at the API boundary
- Avoid nested conditionals (>2 levels) in favor of early returns
- Mock external dependencies in unit tests for isolation
- Use descriptive test names that explain the scenario being tested