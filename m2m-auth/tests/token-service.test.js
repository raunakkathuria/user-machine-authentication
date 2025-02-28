// m2m-auth/tests/token-service.test.js
const { generateClientCredentialsToken, verifyToken, decodeToken } = require('../src/services/token-service');

// Mock dependencies
jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      schema: jest.fn(() => ({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [{ scope: 'read' }, { scope: 'write' }],
              error: null
            })),
            single: jest.fn(() => ({
              data: { revoked: false },
              error: null
            }))
          })),
          insert: jest.fn(() => ({
            error: null
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              error: null
            }))
          }))
        }))
      }))
    }))
  };
});

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('private.pem')) {
      return 'mock-private-key';
    }
    if (path.includes('public.pem')) {
      return 'mock-public-key';
    }
    throw new Error('File not found');
  }),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    iss: 'brand-platform-m2m',
    sub: 'client-id',
    aud: 'api',
    client_id: 'client-id',
    client_name: 'Test Client',
    scope: 'read write',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    jti: 'token-id',
    nonce: 'nonce-value'
  }),
  decode: jest.fn().mockReturnValue({
    iss: 'brand-platform-m2m',
    jti: 'token-id'
  })
}));

describe('Token Service', () => {
  const mockClient = {
    id: 'client-id',
    name: 'Test Client'
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateClientCredentialsToken', () => {
    it('should generate a token with valid scopes', async () => {
      const result = await generateClientCredentialsToken(mockClient, 'read write');
      
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('token_type', 'Bearer');
      expect(result).toHaveProperty('expires_in');
      expect(result).toHaveProperty('scope');
    });

    it('should throw an error if no valid scopes are requested', async () => {
      await expect(generateClientCredentialsToken(mockClient, 'invalid')).rejects.toThrow('No valid scopes requested');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const decoded = await verifyToken('valid-token');
      
      expect(decoded).toHaveProperty('client_id', 'client-id');
      expect(decoded).toHaveProperty('scope', 'read write');
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      const decoded = decodeToken('any-token');
      
      expect(decoded).toHaveProperty('jti', 'token-id');
    });
  });
});