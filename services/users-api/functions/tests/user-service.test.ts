import UserService from 'shared/libs/database/user-service';
import ScyllaClient from 'shared/libs/database/scylla-client';

// Mock ScyllaClient
jest.mock('shared/libs/database/scylla-client');

describe('UserService', () => {
  let userService: UserService;
  let mockDbClient: jest.Mocked<ScyllaClient>;

  beforeEach(() => {
    const MockedScyllaClient = ScyllaClient as jest.MockedClass<typeof ScyllaClient>;
    mockDbClient = new MockedScyllaClient({} as any) as unknown as jest.Mocked<ScyllaClient>;
    userService = new UserService(mockDbClient);
  });

  describe('createUser', () => {
    it('should create a new user and return the user object', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };

      const expectedUser = {
        id: expect.any(String),
        ...userData,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      mockDbClient.executeQuery.mockResolvedValueOnce({});

      const result = await userService.createUser(userData);

      expect(result).toEqual(expectedUser);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([result.id, userData.email, userData.name, userData.role])
      );
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
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: [userData]
      });

      const result = await userService.getUserById(userId);

      expect(result).toEqual(userData);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
    });

    it('should return null when user is not found', async () => {
      const userId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await userService.getUserById(userId);

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

      mockDbClient.executeQuery.mockResolvedValueOnce({ rows: users });

      const result = await userService.listUsers();

      expect(result).toEqual(users);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith('SELECT * FROM users');
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
        created_at: new Date(),
        updated_at: new Date()
      };

      const updates = {
        email: 'new@example.com',
        name: 'New Name'
      };

      const updatedUser = {
        ...existingUser,
        ...updates,
        updated_at: expect.any(Date)
      };

      // Mock getUserById
      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: [existingUser]
      });

      // Mock updateUser
      mockDbClient.executeQuery.mockResolvedValueOnce({});

      const result = await userService.updateUser(userId, updates);

      expect(result).toEqual(updatedUser);
      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([updates.email, updates.name, userId])
      );
    });

    it('should return null when user is not found', async () => {
      const userId = '123';
      const updates = { name: 'New Name' };

      mockDbClient.executeQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await userService.updateUser(userId, updates);

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userId = '123';

      mockDbClient.executeQuery.mockResolvedValueOnce({});

      await userService.deleteUser(userId);

      expect(mockDbClient.executeQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );
    });
  });
});
