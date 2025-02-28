// m2m-auth/src/routes/services.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get a list of available services and their scopes
 * This endpoint enables service discovery for M2M clients
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get list of registered services from database
    const { data: services, error } = await supabase
      .schema('org_identity_provider')
      .from('services')
      .select('id, name, description, api_url, scopes, status, version');
    
    if (error) {
      throw new Error(`Error fetching services: ${error.message}`);
    }
    
    // Return list of services
    return res.status(200).json(services);
  } catch (error) {
    console.error('Get services error:', error);
    return res.status(500).json({ error: 'Failed to get services' });
  }
});

/**
 * Get details of a specific service
 */
router.get('/:serviceId', requireAuth, async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    
    // Get service details from database
    const { data: service, error } = await supabase
      .schema('org_identity_provider')
      .from('services')
      .select('id, name, description, api_url, scopes, status, version, documentation_url')
      .eq('id', serviceId)
      .single();
    
    if (error || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    return res.status(200).json(service);
  } catch (error) {
    console.error('Get service error:', error);
    return res.status(500).json({ error: 'Failed to get service' });
  }
});

/**
 * Register a new service (admin only)
 */
router.post('/', requireAuth, async (req, res) => {
  // TODO: Implement admin authorization check
  
  try {
    const serviceData = req.body;
    
    // Validate required fields
    if (!serviceData.name || !serviceData.api_url) {
      return res.status(400).json({ error: 'Name and API URL are required' });
    }
    
    // Insert service into database
    const { data, error } = await supabase
      .schema('org_identity_provider')
      .from('services')
      .insert({
        name: serviceData.name,
        description: serviceData.description,
        api_url: serviceData.api_url,
        scopes: serviceData.scopes || [],
        status: serviceData.status || 'active',
        version: serviceData.version || '1.0.0',
        documentation_url: serviceData.documentation_url
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error creating service: ${error.message}`);
    }
    
    return res.status(201).json(data);
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({ error: 'Failed to create service' });
  }
});

/**
 * Update a service (admin only)
 */
router.put('/:serviceId', requireAuth, async (req, res) => {
  // TODO: Implement admin authorization check
  
  try {
    const serviceId = req.params.serviceId;
    const updateData = req.body;
    
    // Update service in database
    const { data, error } = await supabase
      .schema('org_identity_provider')
      .from('services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Service not found' });
      }
      throw new Error(`Error updating service: ${error.message}`);
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({ error: 'Failed to update service' });
  }
});

/**
 * Delete a service (admin only)
 */
router.delete('/:serviceId', requireAuth, async (req, res) => {
  // TODO: Implement admin authorization check
  
  try {
    const serviceId = req.params.serviceId;
    
    // Delete service from database
    const { error } = await supabase
      .schema('org_identity_provider')
      .from('services')
      .delete()
      .eq('id', serviceId);
    
    if (error) {
      throw new Error(`Error deleting service: ${error.message}`);
    }
    
    return res.status(204).send();
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({ error: 'Failed to delete service' });
  }
});

/**
 * Get list of all available scopes
 * This endpoint provides documentation on available scopes for client registration
 */
router.get('/scopes', async (req, res) => {
  try {
    // Get scope information from database, ordered by category and scope name
    const { data: scopes, error } = await supabase
      .schema('org_identity_provider')
      .from('standard_scopes')
      .select('*')
      .order('category')
      .order('scope');
    
    if (error) {
      throw new Error(`Error fetching scopes: ${error.message}`);
    }
    
    // Group by category for better organization
    const groupedScopes = scopes.reduce((groups, scope) => {
      const category = scope.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        scope: scope.scope,
        description: scope.description
      });
      return groups;
    }, {});
    
    return res.status(200).json({
      categories: Object.keys(groupedScopes),
      scopes: groupedScopes
    });
  } catch (error) {
    console.error('Get scopes error:', error);
    return res.status(500).json({ error: 'Failed to get scopes' });
  }
});

module.exports = router;