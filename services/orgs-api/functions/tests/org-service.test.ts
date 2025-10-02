import ConfigService from 'shared/libs/database/config-service';
import ScyllaClient from 'shared/libs/database/scylla-client';
import type { OrganizationRow, QueryResult } from 'shared/libs/database/types';

// Mock ScyllaClient
jest.mock('shared/libs/database/scylla-client');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockDbClient: jest.Mocked<ScyllaClient>;

  const createResult = <TRow>(rows: TRow[]): QueryResult<TRow> => ({ rows });

  beforeEach(() => {
    const MockedScyllaClient = ScyllaClient as jest.MockedClass<typeof ScyllaClient>;
    mockDbClient = new MockedScyllaClient({} as any) as unknown as jest.Mocked<ScyllaClient>;
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

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

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
      const orgData: OrganizationRow = {
        id: orgId,
        name: 'Test Org',
        plan: 'enterprise',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([orgData]));

      const result = await configService.getOrganizationById(orgId);

      expect(result).toEqual(orgData);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM organizations WHERE id = ?',
        [orgId]
      );
    });

    it('should return null when organization is not found', async () => {
      const orgId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

      const result = await configService.getOrganizationById(orgId);

      expect(result).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    it('should update and return the organization when found', async () => {
      const orgId = '123';
      const existingOrg: OrganizationRow = {
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
      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([existingOrg]));

      // Mock updateOrganization
      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

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

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

      const result = await configService.updateOrganization(orgId, updates);

      expect(result).toBeNull();
    });
  });

  describe('deleteOrganization', () => {
    it('should delete an organization', async () => {
      const orgId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce(createResult([]));

      await configService.deleteOrganization(orgId);

      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'DELETE FROM organizations WHERE id = ?',
        [orgId]
      );
    });
  });
});
