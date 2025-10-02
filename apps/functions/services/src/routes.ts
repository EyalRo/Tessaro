import { Request, Response } from 'express';
import { Express } from 'express-serve-static-core';
import ConfigService from '../../../../libs/database/src/config-service';
import { Service } from '../../../../libs/database/src/types';

type ServiceRouteParams = {
  id: string;
};

type CreateServicePayload = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
type UpdateServicePayload = Partial<CreateServicePayload>;

export const registerCreateServiceRoute = (app: Express, configService: ConfigService): void => {
  app.post(
    '/services',
    async (
      req: Request<unknown, unknown, CreateServicePayload>,
      res: Response
    ) => {
      try {
        const service = await configService.createService(req.body);
        res.status(201).json(service);
      } catch (_error) {
        res.status(500).json({ error: 'Failed to create service' });
      }
    }
  );
};

export const registerGetServiceRoute = (app: Express, configService: ConfigService): void => {
  app.get('/services/:id', async (req: Request<ServiceRouteParams>, res: Response) => {
    try {
      const service = await configService.getServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }
      res.json(service);
    } catch (_error) {
      res.status(500).json({ error: 'Failed to fetch service' });
    }
  });
};

export const registerUpdateServiceRoute = (app: Express, configService: ConfigService): void => {
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
      } catch (_error) {
        res.status(500).json({ error: 'Failed to update service' });
      }
    }
  );
};

export const registerDeleteServiceRoute = (app: Express, configService: ConfigService): void => {
  app.delete('/services/:id', async (req: Request<ServiceRouteParams>, res: Response) => {
    try {
      await configService.deleteService(req.params.id);
      res.status(204).send();
    } catch (_error) {
      res.status(500).json({ error: 'Failed to delete service' });
    }
  });
};
