import { ConfigService } from '../../../libs/database/src/config-service';
import ScyllaClient from '../../../libs/database/src/scylla-client';

// Mock ScyllaClient
jest.mock('../../../libs/database/src/scylla-client');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockDbClient: jest.Mocked<ScyllaClient>;

  beforeEach(() => {
    mockDbClient = new ScyllaClient({} as any) as jest.Mocked<ScyllaClient>;
    configService = new ConfigService(mockDbClient);
  });

  describe('createOrganization', () => {
    it('should create a new organization and return the organization object', async () => {
      const orgData = {
        name: 'Test Org',
        plan: 'enterprise',
        status: 'active'
      };

      const expectedOrg = {
        id: expect.any(String),
        ...orgData,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      mockDbClient.executeQuery.mockResolvedValueOnce({});

      const result = await configService.createOrganization(orgData);

      expect(result).toEqual(expectedOrg);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organizations'),
        expect.arrayContaining([result.id, orgData.name, orgData.plan, orgData.status])
      );
    });
  });

  describe('getOrganizationById', () => {
    it('should return an organization when found', async () => {
      const orgId = '123';
      const orgData = {
        id: orgId,
        name: 'Test Org',
        plan: 'enterprise',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: [orgData]
      });

      const result = await configService.getOrganizationById(orgId);

      expect(result).toEqual(orgData);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM organizations WHERE id = ?',
        [orgId]
      );
    });

    it('should return null when organization is not found', async () => {
      const orgId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await configService.getOrganizationById(orgId);

      expect(result).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    it('should update and return the organization when found', async () => {
      const orgId = '123';
      const existingOrg = {
        id: orgId,
        name: 'Old Org',
        plan: 'basic',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      const updates = {
        name: 'New Org',
        plan: 'enterprise'
      };

      const updatedOrg = {
        ...existingOrg,
        ...updates,
        updated_at: expect.any(Date)
      };

      // Mock getOrganizationById
      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: [existingOrg]
      });

      // Mock updateOrganization
      mockDbClient.executeQuery.mockResolvedValueOnce({});

      const result = await configService.updateOrganization(orgId, updates);

      expect(result).toEqual(updatedOrg);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations'),
        expect.arrayContaining([updates.name, updates.plan, orgId])
      );
    });

    it('should return null when organization is not found', async () => {
      const orgId = '123';
      const updates = { name: 'New Name' };

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await configService.updateOrganization(orgId, updates);

      expect(result).toBeNull();
    });
  });

  describe('deleteOrganization', () => {
    it('should delete an organization', async () => {
      const orgId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce({});

      await configService.deleteOrganization(orgId);

      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'DELETE FROM organizations WHERE id = ?',
        [orgId]
      );
    });
  });
});
