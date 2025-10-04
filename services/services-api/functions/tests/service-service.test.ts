import ConfigService from 'shared/libs/database/config-service';
import RavenDbClient from 'shared/libs/database/ravendb-client';

const createMockSession = () => ({
  store: jest.fn().mockResolvedValue(undefined),
  saveChanges: jest.fn().mockResolvedValue(undefined),
  load: jest.fn(),
  delete: jest.fn(),
  dispose: jest.fn()
});

describe('ConfigService - Service Management', () => {
  let configService: ConfigService;
  let mockDbClient: Pick<RavenDbClient, 'openSession'>;
  let mockSession: ReturnType<typeof createMockSession>;

  beforeEach(() => {
    mockSession = createMockSession();
    mockDbClient = {
      openSession: jest.fn().mockReturnValue(mockSession as any)
    };
    configService = new ConfigService(mockDbClient as RavenDbClient);
  });

  describe('createService', () => {
    it('should create a new service and return the service object', async () => {
      const serviceData = {
        name: 'Email Service',
        type: 'communication',
        status: 'active'
      };

      const result = await configService.createService(serviceData);

      expect(result).toMatchObject({
        ...serviceData,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(mockSession.store).toHaveBeenCalledWith(expect.objectContaining({ id: result.id }), `Services/${result.id}`);
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });
  });

  describe('getServiceById', () => {
    it('should return a service when found', async () => {
      const serviceId = '123';
      const serviceData = {
        id: serviceId,
        name: 'Email Service',
        type: 'communication',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSession.load.mockResolvedValueOnce(serviceData);

      const result = await configService.getServiceById(serviceId);

      expect(result).toEqual(serviceData);
      expect(mockSession.load).toHaveBeenCalledWith(`Services/${serviceId}`);
    });

    it('should return null when service is not found', async () => {
      mockSession.load.mockResolvedValueOnce(null);

      const result = await configService.getServiceById('missing');

      expect(result).toBeNull();
    });
  });

  describe('updateService', () => {
    it('should update and return the service when found', async () => {
      const serviceId = '123';
      const existingService = {
        id: serviceId,
        name: 'Old Service',
        type: 'old-type',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      const updates = {
        name: 'New Service',
        type: 'new-type'
      };

      mockSession.load.mockResolvedValueOnce(existingService);

      const result = await configService.updateService(serviceId, updates);

      expect(result).toMatchObject({
        ...existingService,
        ...updates,
        updated_at: expect.any(Date)
      });
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });

    it('should return null when service is not found', async () => {
      mockSession.load.mockResolvedValueOnce(null);

      const result = await configService.updateService('missing', { name: 'New Service' });

      expect(result).toBeNull();
      expect(mockSession.saveChanges).not.toHaveBeenCalled();
    });
  });

  describe('deleteService', () => {
    it('should delete a service', async () => {
      await configService.deleteService('123');

      expect(mockSession.delete).toHaveBeenCalledWith('Services/123');
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });
  });
});
