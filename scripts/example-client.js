/**
 * Example client for demonstrating the M2M authentication flow
 * This script shows how to obtain and use a client credentials token
 */

const axios = require('axios');

// In a real application, these would be loaded from environment variables or a config file
const CLIENT_ID = 'your-client-id';
const CLIENT_SECRET = 'your-client-secret';
const AUTH_URL = 'http://localhost:3003/oauth/token';
const SERVICE_URL = 'http://localhost:3002/api/example';

/**
 * Get an access token using client credentials
 * @param {string} scope - Space-separated list of requested scopes
 * @returns {Promise<string>} Access token
 */
async function getAccessToken(scope = 'read') {
  try {
    // Create Basic Auth credentials
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    // Request body parameters
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', scope);
    
    // Make request to token endpoint
    const response = await axios.post(AUTH_URL, params, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    // Return the access token
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Call a protected service API with the access token
 * @param {string} accessToken - The access token
 * @returns {Promise<object>} API response
 */
async function callServiceAPI(accessToken) {
  try {
    const response = await axios.get(SERVICE_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error calling service API:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Main function that demonstrates the complete flow
 */
async function main() {
  try {
    console.log('1. Requesting access token...');
    const token = await getAccessToken('api:read api:write');
    console.log(`   Token received: ${token.slice(0, 20)}...`);
    
    console.log('\n2. Calling service API with token...');
    const data = await callServiceAPI(token);
    console.log('   Service response:', data);
    
    console.log('\nM2M authentication flow completed successfully!');
  } catch (error) {
    console.error('\nM2M authentication flow failed:', error.message);
  }
}

// Only run the main function if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  getAccessToken,
  callServiceAPI
};