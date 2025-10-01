import express, { Request, Response } from 'express';
import ScyllaClient from '../../../../libs/database/src/scylla-client';
import ConfigService from '../../../../libs/database/src/config-service';
import { Organization } from '../../../../libs/database/src/types';

const app = express();
app.use(express.json());

const resolveContactPoints = (): string[] => {
  const raw = process.env.SCYLLA_CONTACT_POINTS;
  if (raw) {
    return raw
      .split(',')
      .map(point => point.trim())
      .filter(point => point.length > 0);
  }
  return ['scylla-client.databases.svc.cluster.local'];
};

const resolveLocalDataCenter = (): string => {
  return process.env.SCYLLA_LOCAL_DC?.trim() || 'datacenter1';
};

const resolveKeyspace = (): string => {
  return process.env.SCYLLA_KEYSPACE?.trim() || 'tessaro_admin';
};

const resolveAuthProvider = () => {
  const username = process.env.SCYLLA_USERNAME;
  const password = process.env.SCYLLA_PASSWORD;
  if (username && password) {
    return { username, password };
  }
  return undefined;
};

// Initialize database client
const dbClient = new ScyllaClient({
  contactPoints: resolveContactPoints(),
  localDataCenter: resolveLocalDataCenter(),
  keyspace: resolveKeyspace(),
  authProvider: resolveAuthProvider()
});

const configService = new ConfigService(dbClient);

type OrganizationRouteParams = {
  id: string;
};

type CreateOrganizationPayload = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;

// Create organization endpoint
app.post(
  '/organizations',
  async (
    req: Request<unknown, unknown, CreateOrganizationPayload>,
    res: Response
  ) => {
    try {
      const org = await configService.createOrganization(req.body);
      res.status(201).json(org);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

// Get organization by ID endpoint
app.get('/organizations/:id', async (req: Request<OrganizationRouteParams>, res: Response) => {
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
app.put(
  '/organizations/:id',
  async (
    req: Request<OrganizationRouteParams, unknown, UpdateOrganizationPayload>,
    res: Response
  ) => {
    try {
      const org = await configService.updateOrganization(req.params.id, req.body);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

// Delete organization endpoint
app.delete('/organizations/:id', async (req: Request<OrganizationRouteParams>, res: Response) => {
  try {
    await configService.deleteOrganization(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

export default app;
