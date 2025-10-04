import ConfigService from 'shared/libs/database/config-service';
import RavenDbClient from 'shared/libs/database/ravendb-client';

const createMockSession = () => ({
  store: jest.fn().mockResolvedValue(undefined),
  saveChanges: jest.fn().mockResolvedValue(undefined),
  load: jest.fn(),
  delete: jest.fn(),
  dispose: jest.fn()
});

describe('ConfigService', () => {
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

  describe('createOrganization', () => {
    it('should create a new organization and return the organization object', async () => {
      const orgData = {
        name: 'Test Org',
        plan: 'enterprise',
        status: 'active'
      };

      const result = await configService.createOrganization(orgData);

      expect(result).toMatchObject({
        ...orgData,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(mockSession.store).toHaveBeenCalledWith(expect.objectContaining({ id: result.id }), `Organizations/${result.id}`);
      expect(mockSession.saveChanges).toHaveBeenCalled();
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

      mockSession.load.mockResolvedValueOnce(orgData);

      const result = await configService.getOrganizationById(orgId);

      expect(result).toEqual(orgData);
      expect(mockSession.load).toHaveBeenCalledWith(`Organizations/${orgId}`);
    });

    it('should return null when organization is not found', async () => {
      mockSession.load.mockResolvedValueOnce(null);

      const result = await configService.getOrganizationById('missing');

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

      mockSession.load.mockResolvedValueOnce(existingOrg);

      const result = await configService.updateOrganization(orgId, updates);

      expect(result).toMatchObject({
        ...existingOrg,
        ...updates,
        updated_at: expect.any(Date)
      });
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });

    it('should return null when organization is not found', async () => {
      mockSession.load.mockResolvedValueOnce(null);

      const result = await configService.updateOrganization('missing', { name: 'New Name' });

      expect(result).toBeNull();
      expect(mockSession.saveChanges).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrganization', () => {
    it('should delete an organization', async () => {
      await configService.deleteOrganization('123');

      expect(mockSession.delete).toHaveBeenCalledWith('Organizations/123');
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });
  });
});
