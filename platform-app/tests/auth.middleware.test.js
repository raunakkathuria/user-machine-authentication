const { 
  requirePlatformSession, 
  requirePermissions, 
  requireBrand, 
  generateCsrfToken 
} = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    // Setup mock request, response, and next function
    mockRequest = {
      cookies: {},
      platformSession: null
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    nextFunction = jest.fn();
  });

  describe('requirePlatformSession', () => {
    test('should call next when valid session exists', () => {
      // Setup valid session
      const validSession = {
        userId: 'user-123',
        brandId: 'brand-portal',
        sessionId: 'session-123'
      };
      
      mockRequest.cookies = {
        platform_session: JSON.stringify(validSession)
      };
      
      // Execute
      requirePlatformSession(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.platformSession).toEqual(validSession);
    });
    
    test('should return 401 when no session cookie exists', () => {
      // Execute
      requirePlatformSession(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Platform session required'
      });
    });
    
    test('should return 401 when session data is invalid', () => {
      // Setup invalid session (missing required fields)
      const invalidSession = {
        // Missing required userId
        brandId: 'brand-portal',
        sessionId: 'session-123'
      };
      
      mockRequest.cookies = {
        platform_session: JSON.stringify(invalidSession)
      };
      
      // Execute
      requirePlatformSession(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid session data'
      });
    });
  });

  describe('requireBrand', () => {
    test('should call next when brand is whitelisted', () => {
      // Setup
      const whitelistedBrands = ['brand-portal', 'brand-2'];
      mockRequest.platformSession = {
        brandId: 'brand-portal',
        userId: 'user-123'
      };
      
      // Execute
      const middleware = requireBrand(whitelistedBrands);
      middleware(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should return 403 when brand is not whitelisted', () => {
      // Setup
      const whitelistedBrands = ['brand-portal', 'brand-2'];
      mockRequest.platformSession = {
        brandId: 'not-whitelisted-brand',
        userId: 'user-123'
      };
      
      // Execute
      const middleware = requireBrand(whitelistedBrands);
      middleware(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Brand is not authorized'
      });
    });
    
    test('should return 401 when no session exists', () => {
      // Setup
      const whitelistedBrands = ['brand-portal', 'brand-2'];
      mockRequest.platformSession = null;
      
      // Execute
      const middleware = requireBrand(whitelistedBrands);
      middleware(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Platform session required'
      });
    });
  });

  describe('requirePermissions', () => {
    test('should call next when user has all required permissions', () => {
      // Setup
      const requiredPermissions = ['trading', 'view_history'];
      mockRequest.platformSession = {
        permissions: ['trading', 'view_history', 'admin'],
        userId: 'user-123'
      };
      
      // Execute
      const middleware = requirePermissions(requiredPermissions);
      middleware(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should return 403 when user lacks a required permission', () => {
      // Setup
      const requiredPermissions = ['trading', 'view_history', 'admin'];
      mockRequest.platformSession = {
        permissions: ['trading', 'view_history'], // Missing 'admin'
        userId: 'user-123'
      };
      
      // Execute
      const middleware = requirePermissions(requiredPermissions);
      middleware(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions'
      });
    });
  });

  describe('generateCsrfToken', () => {
    test('should generate consistent token for the same session', () => {
      // Setup
      const session = {
        sessionId: 'session-123',
        userId: 'user-123'
      };
      
      // Execute
      const token1 = generateCsrfToken(session);
      const token2 = generateCsrfToken(session);
      
      // Assert
      expect(token1).toBeTruthy();
      expect(token1).toEqual(token2);
    });
    
    test('should generate different tokens for different sessions', () => {
      // Setup
      const session1 = {
        sessionId: 'session-123',
        userId: 'user-123'
      };
      
      const session2 = {
        sessionId: 'session-456',
        userId: 'user-123'
      };
      
      // Execute
      const token1 = generateCsrfToken(session1);
      const token2 = generateCsrfToken(session2);
      
      // Assert
      expect(token1).not.toEqual(token2);
    });
  });
});