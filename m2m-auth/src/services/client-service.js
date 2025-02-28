// m2m-auth/src/services/client-service.js
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { createClient: supabaseClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = supabaseClient(supabaseUrl, supabaseKey);

/**
 * Generate a cryptographically secure client secret
 * @returns {string} A base64 encoded random string
 */
const generateClientSecret = () => {
  return crypto.randomBytes(32).toString('base64');
};

/**
 * Create a new client in the database
 * @param {Object} clientData - Client information
 * @returns {Object} The created client data (without secret)
 */
const createClient = async (clientData) => {
  const clientId = uuidv4();
  const clientSecret = generateClientSecret();

  // Hash the client secret for storage
  const hashedSecret = crypto
    .createHash('sha256')
    .update(clientSecret)
    .digest('hex');

  const client = {
    id: clientId,
    name: clientData.name,
    description: clientData.description,
    hashed_secret: hashedSecret,
    contact_email: clientData.contact_email,
    service_type: clientData.service_type || 'application',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Use schema().from() approach for Supabase custom schemas
  let result = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .insert(client)
    .select('id, name, description, contact_email, service_type, created_at')
    .single();

  const { data, error } = result;

  if (error) {
    throw new Error(`Error creating client: ${error.message || 'Unknown database error'}`);
  }

  // Register the client's allowed scopes
  if (clientData.scopes && clientData.scopes.length > 0) {
    const scopeInserts = clientData.scopes.map(scope => ({
      client_id: clientId,
      scope: scope
    }));

    const { error: scopeError } = await supabase
      .schema('org_identity_provider')
      .from('client_scopes')
      .insert(scopeInserts);

    if (scopeError) {
      console.error('Error registering client scopes:', scopeError);
      // Continue anyway, as the client was created
    }
  }

  // Return the client data with the plain text secret
  // IMPORTANT: This is the only time the plain text secret will be available
  return {
    ...data,
    client_id: clientId,
    client_secret: clientSecret,
    scopes: clientData.scopes || []
  };
};

/**
 * Get a client by ID
 * @param {string} clientId - The client ID
 * @returns {Object} The client data
 */
const getClientById = async (clientId) => {
  const { data, error } = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .select('id, name, description, contact_email, service_type, created_at')
    .eq('id', clientId)
    .single();

  if (error) {
    throw new Error(`Error fetching client: ${error.message}`);
  }

  // Get the client's scopes
  const { data: scopeData, error: scopeError } = await supabase
    .schema('org_identity_provider')
    .from('client_scopes')
    .select('scope')
    .eq('client_id', clientId);

  if (scopeError) {
    console.error('Error fetching client scopes:', scopeError);
  }

  const scopes = scopeData?.map(s => s.scope) || [];

  return {
    ...data,
    scopes
  };
};

/**
 * Validate client credentials
 * @param {string} clientId - The client ID
 * @param {string} clientSecret - The client secret
 * @returns {Object} The client data if validation is successful
 */
const validateClientCredentials = async (clientId, clientSecret) => {
  // Get the client from the database
  const { data: client, error } = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .select('id, name, description, hashed_secret, contact_email, service_type')
    .eq('id', clientId)
    .single();

  if (error || !client) {
    throw new Error('Invalid client credentials');
  }

  // Hash the provided secret and compare
  const hashedProvidedSecret = crypto
    .createHash('sha256')
    .update(clientSecret)
    .digest('hex');

  if (hashedProvidedSecret !== client.hashed_secret) {
    throw new Error('Invalid client credentials');
  }

  // Get the client's scopes
  const { data: scopeData, error: scopeError } = await supabase
    .schema('org_identity_provider')
    .from('client_scopes')
    .select('scope')
    .eq('client_id', clientId);

  if (scopeError) {
    console.error('Error fetching client scopes:', scopeError);
  }

  const scopes = scopeData?.map(s => s.scope) || [];

  // Return client without the hashed secret
  const { hashed_secret, ...cleanClient } = client;
  return {
    ...cleanClient,
    scopes
  };
};

/**
 * List all clients
 * @returns {Array} List of clients
 */
const listClients = async () => {
  const { data, error } = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .select('id, name, description, contact_email, service_type, created_at');

  if (error) {
    throw new Error(`Error listing clients: ${error.message}`);
  }

  return data;
};

/**
 * Update a client
 * @param {string} clientId - The client ID
 * @param {Object} updateData - The data to update
 * @returns {Object} The updated client data
 */
const updateClient = async (clientId, updateData) => {
  const updates = {
    ...updateData,
    updated_at: new Date().toISOString()
  };

  // Never update the client secret through this method
  if (updates.hashed_secret) {
    delete updates.hashed_secret;
  }

  const { data, error } = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select('id, name, description, contact_email, service_type, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`Error updating client: ${error.message}`);
  }

  // Update scopes if provided
  if (updateData.scopes && Array.isArray(updateData.scopes)) {
    // First delete existing scopes
    await supabase
      .schema('org_identity_provider')
      .from('client_scopes')
      .delete()
      .eq('client_id', clientId);

    // Then insert new scopes
    const scopeInserts = updateData.scopes.map(scope => ({
      client_id: clientId,
      scope: scope
    }));

    if (scopeInserts.length > 0) {
      const { error: scopeError } = await supabase
        .schema('org_identity_provider')
        .from('client_scopes')
        .insert(scopeInserts);

      if (scopeError) {
        console.error('Error updating client scopes:', scopeError);
      }
    }
  }

  return data;
};

/**
 * Reset a client's secret
 * @param {string} clientId - The client ID
 * @returns {Object} The new client secret
 */
const resetClientSecret = async (clientId) => {
  // Generate a new client secret
  const newClientSecret = generateClientSecret();

  // Hash the new client secret for storage
  const hashedSecret = crypto
    .createHash('sha256')
    .update(newClientSecret)
    .digest('hex');

  // Update the client record
  const { error } = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .update({
      hashed_secret: hashedSecret,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId);

  if (error) {
    throw new Error(`Error resetting client secret: ${error.message}`);
  }

  // Return the new client secret
  return {
    client_id: clientId,
    client_secret: newClientSecret
  };
};

/**
 * Delete a client
 * @param {string} clientId - The client ID
 * @returns {boolean} True if successful
 */
const deleteClient = async (clientId) => {
  // First delete related scopes
  await supabase
    .schema('org_identity_provider')
    .from('client_scopes')
    .delete()
    .eq('client_id', clientId);

  // Then delete the client
  const { error } = await supabase
    .schema('org_identity_provider')
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    throw new Error(`Error deleting client: ${error.message}`);
  }

  return true;
};

module.exports = {
  createClient,
  getClientById,
  validateClientCredentials,
  listClients,
  updateClient,
  resetClientSecret,
  deleteClient
};
