import ConfigService from 'shared/libs/database/config-service';
import ScyllaClient from 'shared/libs/database/scylla-client';
import type { QueryResult, ServiceRow } from 'shared/libs/database/types';

// Mock ScyllaClient
jest.mock('shared/libs/database/scylla-client');

describe('ConfigService - Service Management', () => {
  let configService: ConfigService;
  let mockDbClient: jest.Mocked<ScyllaClient>;

  const createResult = <TRow>(rows: TRow[]): QueryResult<TRow> => ({ rows });

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

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

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
      const serviceData: ServiceRow = {
        id: serviceId,
        name: 'Email Service',
        type: 'communication',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([serviceData]));

      const result = await configService.getServiceById(serviceId);

      expect(result).toEqual(serviceData);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM services WHERE id = ?',
        [serviceId]
      );
    });

    it('should return null when service is not found', async () => {
      const serviceId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

      const result = await configService.getServiceById(serviceId);

      expect(result).toBeNull();
    });
  });

  describe('updateService', () => {
    it('should update and return the service when found', async () => {
      const serviceId = '123';
      const existingService: ServiceRow = {
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
      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([existingService]));

      // Mock updateService
      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

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

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

      const result = await configService.updateService(serviceId, updates);

      expect(result).toBeNull();
    });
  });

  describe('deleteService', () => {
    it('should delete a service', async () => {
      const serviceId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

      await configService.deleteService(serviceId);

      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'DELETE FROM services WHERE id = ?',
        [serviceId]
      );
    });
  });
});
