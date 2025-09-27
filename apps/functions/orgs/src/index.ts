import express from 'express';
import ScyllaClient from '../../../libs/database/src/scylla-client';
import ConfigService from '../../../libs/database/src/config-service';

const app = express();
app.use(express.json());

// Initialize database client
const dbClient = new ScyllaClient({
  contactPoints: ['scylladb:9042'],
  localDataCenter: 'datacenter1',
  keyspace: 'tessaro_admin'
});

const configService = new ConfigService(dbClient);

// Create organization endpoint
app.post('/organizations', async (req, res) => {
  try {
    const org = await configService.createOrganization(req.body);
    res.status(201).json(org);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get organization by ID endpoint
app.get('/organizations/:id', async (req, res) => {
  try {
    const org = await configService.getOrganizationById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization endpoint
app.put('/organizations/:id', async (req, res) => {
  try {
    const org = await configService.updateOrganization(req.params.id, req.body);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete organization endpoint
app.delete('/organizations/:id', async (req, res) => {
  try {
    await configService.deleteOrganization(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

export default app;
