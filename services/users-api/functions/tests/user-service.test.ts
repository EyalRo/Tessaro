import UserService from 'shared/libs/database/user-service';
import RavenDbClient from 'shared/libs/database/ravendb-client';

const createMockSession = () => {
  const queryAll = jest.fn();

  return {
    store: jest.fn().mockResolvedValue(undefined),
    saveChanges: jest.fn().mockResolvedValue(undefined),
    load: jest.fn(),
    query: jest.fn().mockReturnValue({ all: queryAll }),
    delete: jest.fn(),
    dispose: jest.fn(),
    __queryAll: queryAll
  };
};

describe('UserService', () => {
  let userService: UserService;
  let mockDbClient: Pick<RavenDbClient, 'openSession'>;
  let mockSession: ReturnType<typeof createMockSession>;

  beforeEach(() => {
    mockSession = createMockSession();
    mockDbClient = {
      openSession: jest.fn().mockReturnValue(mockSession as any)
    };
    userService = new UserService(mockDbClient as RavenDbClient);
  });

  describe('createUser', () => {
    it('should create a new user and return the user object', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };

      const result = await userService.createUser(userData);

      expect(result).toMatchObject({
        ...userData,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(mockDbClient.openSession).toHaveBeenCalled();
      expect(mockSession.store).toHaveBeenCalledWith(expect.objectContaining({ id: result.id }), `Users/${result.id}`);
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      const userId = '123';
      const userData = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSession.load.mockResolvedValueOnce(userData);

      const result = await userService.getUserById(userId);

      expect(result).toEqual(userData);
      expect(mockSession.load).toHaveBeenCalledWith(`Users/${userId}`);
    });

    it('should return null when user is not found', async () => {
      mockSession.load.mockResolvedValueOnce(null);

      const result = await userService.getUserById('missing');

      expect(result).toBeNull();
    });
  });

  describe('listUsers', () => {
    it('should return a list of users', async () => {
      const users = [
        {
          id: '1',
          email: 'one@example.com',
          name: 'User One',
          role: 'user',
          avatar_url: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          email: 'two@example.com',
          name: 'User Two',
          role: 'admin',
          avatar_url: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSession.__queryAll.mockResolvedValueOnce(users);

      const result = await userService.listUsers();

      expect(result).toEqual(users);
      expect(mockSession.query).toHaveBeenCalledWith({ collection: 'Users' });
      expect(mockSession.__queryAll).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update and return the user when found', async () => {
      const userId = '123';
      const existingUser = {
        id: userId,
        email: 'old@example.com',
        name: 'Old Name',
        role: 'user',
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const updates = {
        email: 'new@example.com',
        name: 'New Name'
      };

      mockSession.load.mockResolvedValueOnce(existingUser);

      const result = await userService.updateUser(userId, updates);

      expect(result).toMatchObject({
        ...existingUser,
        ...updates,
        updated_at: expect.any(Date)
      });
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });

    it('should return null when user is not found', async () => {
      mockSession.load.mockResolvedValueOnce(null);

      const result = await userService.updateUser('missing', { name: 'New Name' });

      expect(result).toBeNull();
      expect(mockSession.saveChanges).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      await userService.deleteUser('123');

      expect(mockSession.delete).toHaveBeenCalledWith('Users/123');
      expect(mockSession.saveChanges).toHaveBeenCalled();
    });
  });
});
