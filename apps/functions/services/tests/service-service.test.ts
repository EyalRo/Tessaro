import ConfigService from '../../../../libs/database/src/config-service';
import ScyllaClient from '../../../../libs/database/src/scylla-client';

// Mock ScyllaClient
jest.mock('../../../../libs/database/src/scylla-client');

describe('ConfigService - Service Management', () => {
  let configService: ConfigService;
  let mockDbClient: jest.Mocked<ScyllaClient>;

  beforeEach(() => {
    const MockedScyllaClient = ScyllaClient as jest.MockedClass<typeof ScyllaClient>;
    mockDbClient = new MockedScyllaClient({} as any) as unknown as jest.Mocked<ScyllaClient>;
    configService = new ConfigService(mockDbClient);
  });

  describe('createService', () => {
    it('should create a new service and return the service object', async () => {
      const serviceData = {
        name: 'Email Service',
        type: 'communication',
        status: 'active'
      };

      const expectedService = {
        id: expect.any(String),
        ...serviceData,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      mockDbClient.executeQuery.mockResolvedValueOnce({});

      const result = await configService.createService(serviceData);

      expect(result).toEqual(expectedService);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO services'),
        expect.arrayContaining([result.id, serviceData.name, serviceData.type, serviceData.status])
      );
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

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: [serviceData]
      });

      const result = await configService.getServiceById(serviceId);

      expect(result).toEqual(serviceData);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM services WHERE id = ?',
        [serviceId]
      );
    });

    it('should return null when service is not found', async () => {
      const serviceId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await configService.getServiceById(serviceId);

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

      const updatedService = {
        ...existingService,
        ...updates,
        updated_at: expect.any(Date)
      };

      // Mock getServiceById
      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: [existingService]
      });

      // Mock updateService
      mockDbClient.executeQuery.mockResolvedValueOnce({});

      const result = await configService.updateService(serviceId, updates);

      expect(result).toEqual(updatedService);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE services'),
        expect.arrayContaining([updates.name, updates.type, serviceId])
      );
    });

    it('should return null when service is not found', async () => {
      const serviceId = '123';
      const updates = { name: 'New Service' };

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await configService.updateService(serviceId, updates);

      expect(result).toBeNull();
    });
  });

  describe('deleteService', () => {
    it('should delete a service', async () => {
      const serviceId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce({});

      await configService.deleteService(serviceId);

      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'DELETE FROM services WHERE id = ?',
        [serviceId]
      );
    });
  });
});
