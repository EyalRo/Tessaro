import express, { Request, Response } from 'express';
import ScyllaClient from '../../../../libs/database/src/scylla-client';
import ConfigService from '../../../../libs/database/src/config-service';
import { Service } from '../../../../libs/database/src/types';

const app = express();
app.use(express.json());

// Initialize database client
const dbClient = new ScyllaClient({
  contactPoints: ['scylladb:9042'],
  localDataCenter: 'datacenter1',
  keyspace: 'tessaro_admin'
});

const configService = new ConfigService(dbClient);

type ServiceRouteParams = {
  id: string;
};

type CreateServicePayload = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
type UpdateServicePayload = Partial<CreateServicePayload>;

// Create service endpoint
app.post(
  '/services',
  async (
    req: Request<unknown, unknown, CreateServicePayload>,
    res: Response
  ) => {
    try {
      const service = await configService.createService(req.body);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// Get service by ID endpoint
app.get('/services/:id', async (req: Request<ServiceRouteParams>, res: Response) => {
  try {
    const service = await configService.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Update service endpoint
app.put(
  '/services/:id',
  async (
    req: Request<ServiceRouteParams, unknown, UpdateServicePayload>,
    res: Response
  ) => {
    try {
      const service = await configService.updateService(req.params.id, req.body);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
);

// Delete service endpoint
app.delete('/services/:id', async (req: Request<ServiceRouteParams>, res: Response) => {
  try {
    await configService.deleteService(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default app;
