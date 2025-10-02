import { Request, Response } from 'express';
import { Express } from 'express-serve-static-core';
import ConfigService from '../../../../libs/database/src/config-service';
import { Organization } from '../../../../libs/database/src/types';

type OrganizationRouteParams = {
  id: string;
};

type CreateOrganizationPayload = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;

export const registerCreateOrganizationRoute = (app: Express, configService: ConfigService): void => {
  app.post(
    '/organizations',
    async (
      req: Request<unknown, unknown, CreateOrganizationPayload>,
      res: Response
    ) => {
      try {
        const org = await configService.createOrganization(req.body);
        res.status(201).json(org);
      } catch (_error) {
        res.status(500).json({ error: 'Failed to create organization' });
      }
    }
  );
};

export const registerGetOrganizationRoute = (app: Express, configService: ConfigService): void => {
  app.get('/organizations/:id', async (req: Request<OrganizationRouteParams>, res: Response) => {
    try {
      const org = await configService.getOrganizationById(req.params.id);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      res.json(org);
    } catch (_error) {
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });
};

export const registerUpdateOrganizationRoute = (app: Express, configService: ConfigService): void => {
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
      } catch (_error) {
        res.status(500).json({ error: 'Failed to update organization' });
      }
    }
  );
};

export const registerDeleteOrganizationRoute = (app: Express, configService: ConfigService): void => {
  app.delete('/organizations/:id', async (req: Request<OrganizationRouteParams>, res: Response) => {
    try {
      await configService.deleteOrganization(req.params.id);
      res.status(204).send();
    } catch (_error) {
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  });
};
