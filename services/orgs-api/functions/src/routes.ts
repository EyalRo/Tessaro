import ConfigService from 'shared/libs/database/config-service';
import { Organization } from 'shared/libs/database/types';
import type { BaseApp } from 'shared/config/app';

type CreateOrganizationPayload = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;

export const registerCreateOrganizationRoute = (
  app: BaseApp,
  configService: ConfigService
): void => {
  app.post('/organizations', async (c) => {
    try {
      const payload = await c.req.json<CreateOrganizationPayload>();
      const org = await configService.createOrganization(payload);
      return c.json(org, 201);
    } catch (_error) {
      return c.json({ error: 'Failed to create organization' }, 500);
    }
  });
};

export const registerGetOrganizationRoute = (
  app: BaseApp,
  configService: ConfigService
): void => {
  app.get('/organizations/:id', async (c) => {
    try {
      const org = await configService.getOrganizationById(c.req.param('id'));
      if (!org) {
        return c.json({ error: 'Organization not found' }, 404);
      }
      return c.json(org);
    } catch (_error) {
      return c.json({ error: 'Failed to fetch organization' }, 500);
    }
  });
};

export const registerUpdateOrganizationRoute = (
  app: BaseApp,
  configService: ConfigService
): void => {
  app.put('/organizations/:id', async (c) => {
    try {
      const payload = await c.req.json<UpdateOrganizationPayload>();
      const org = await configService.updateOrganization(c.req.param('id'), payload);
      if (!org) {
        return c.json({ error: 'Organization not found' }, 404);
      }
      return c.json(org);
    } catch (_error) {
      return c.json({ error: 'Failed to update organization' }, 500);
    }
  });
};

export const registerDeleteOrganizationRoute = (
  app: BaseApp,
  configService: ConfigService
): void => {
  app.delete('/organizations/:id', async (c) => {
    try {
      await configService.deleteOrganization(c.req.param('id'));
      return c.body(null, 204);
    } catch (_error) {
      return c.json({ error: 'Failed to delete organization' }, 500);
    }
  });
};
