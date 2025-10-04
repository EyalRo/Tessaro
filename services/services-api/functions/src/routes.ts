import ConfigService from 'shared/libs/database/config-service';
import { Service } from 'shared/libs/database/types';
import type { BaseApp } from 'shared/config/app';

type CreateServicePayload = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
type UpdateServicePayload = Partial<CreateServicePayload>;

export const registerCreateServiceRoute = (app: BaseApp, configService: ConfigService): void => {
  app.post('/services', async (c) => {
    try {
      const payload = await c.req.json<CreateServicePayload>();
      const service = await configService.createService(payload);
      return c.json(service, 201);
    } catch (_error) {
      return c.json({ error: 'Failed to create service' }, 500);
    }
  });
};

export const registerGetServiceRoute = (app: BaseApp, configService: ConfigService): void => {
  app.get('/services/:id', async (c) => {
    try {
      const service = await configService.getServiceById(c.req.param('id'));
      if (!service) {
        return c.json({ error: 'Service not found' }, 404);
      }
      return c.json(service);
    } catch (_error) {
      return c.json({ error: 'Failed to fetch service' }, 500);
    }
  });
};

export const registerUpdateServiceRoute = (app: BaseApp, configService: ConfigService): void => {
  app.put('/services/:id', async (c) => {
    try {
      const payload = await c.req.json<UpdateServicePayload>();
      const service = await configService.updateService(c.req.param('id'), payload);
      if (!service) {
        return c.json({ error: 'Service not found' }, 404);
      }
      return c.json(service);
    } catch (_error) {
      return c.json({ error: 'Failed to update service' }, 500);
    }
  });
};

export const registerDeleteServiceRoute = (app: BaseApp, configService: ConfigService): void => {
  app.delete('/services/:id', async (c) => {
    try {
      await configService.deleteService(c.req.param('id'));
      return c.body(null, 204);
    } catch (_error) {
      return c.json({ error: 'Failed to delete service' }, 500);
    }
  });
};
