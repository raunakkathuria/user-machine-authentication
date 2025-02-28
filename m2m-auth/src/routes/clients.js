// m2m-auth/src/routes/clients.js
const express = require('express');
const router = express.Router();
const clientService = require('../services/client-service');
const { requireAdmin } = require('../middleware/auth');

/**
 * Get all clients (admin only)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const clients = await clientService.listClients();
    return res.status(200).json(clients);
  } catch (error) {
    console.error('List clients error:', error);
    return res.status(500).json({ error: 'Failed to list clients' });
  }
});

/**
 * Create a new client (admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    // Validate required fields
    const { name, contact_email } = req.body;
    if (!name || !contact_email) {
      return res.status(400).json({ error: 'Name and contact email are required' });
    }
    
    // Create client
    const newClient = await clientService.createClient(req.body);
    
    // Return client data with client secret (only shown once)
    return res.status(201).json(newClient);
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({ error: 'Failed to create client' });
  }
});

/**
 * Get a client by ID (admin only)
 */
router.get('/:clientId', requireAdmin, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await clientService.getClientById(clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    return res.status(200).json(client);
  } catch (error) {
    console.error('Get client error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    return res.status(500).json({ error: 'Failed to get client' });
  }
});

/**
 * Update a client (admin only)
 */
router.put('/:clientId', requireAdmin, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const updateData = req.body;
    
    const updatedClient = await clientService.updateClient(clientId, updateData);
    
    return res.status(200).json(updatedClient);
  } catch (error) {
    console.error('Update client error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    return res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * Reset a client's secret (admin only)
 */
router.post('/:clientId/reset-secret', requireAdmin, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const newSecret = await clientService.resetClientSecret(clientId);
    
    return res.status(200).json(newSecret);
  } catch (error) {
    console.error('Reset client secret error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    return res.status(500).json({ error: 'Failed to reset client secret' });
  }
});

/**
 * Delete a client (admin only)
 */
router.delete('/:clientId', requireAdmin, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    await clientService.deleteClient(clientId);
    
    return res.status(204).send();
  } catch (error) {
    console.error('Delete client error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    return res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;