import StorageService from '../src/storage-service';
import MinioClient from '../src/minio-client';

// Mock MinioClient
jest.mock('../src/minio-client');

describe('StorageService', () => {
  let storageService: StorageService;
  let mockMinioClient: jest.Mocked<MinioClient>;

  beforeEach(() => {
    mockMinioClient = new MinioClient({} as any) as jest.Mocked<MinioClient>;
    storageService = new StorageService(mockMinioClient);
  });

  describe('uploadUserProfilePicture', () => {
    it('should upload a user profile picture and return the URL', async () => {
      const userId = '123';
      const fileBuffer = Buffer.from('test');
      const fileType = 'image/jpeg';
      const expectedUrl = 'http://minio:9000/profile-pictures/123-test.jpg';

      mockMinioClient.uploadBuffer.mockResolvedValueOnce(expectedUrl);

      const result = await storageService.uploadUserProfilePicture(userId, fileBuffer, fileType);

      expect(result).toBe(expectedUrl);
      expect(mockMinioClient.uploadBuffer).toHaveBeenCalledWith(
        expect.stringMatching(`profile-pictures/${userId}-`),
        fileBuffer,
        expect.objectContaining({
          'Content-Type': fileType
        })
      );
    });
  });

  describe('getUserProfilePictureUrl', () => {
    it('should return the URL if the file exists', async () => {
      const userId = '123';
      const fileName = 'test.jpg';
      const expectedUrl = 'http://minio:9000/profile-pictures/123-test.jpg';

      mockMinioClient.fileExists.mockResolvedValueOnce(true);
      mockMinioClient.getFileUrl.mockResolvedValueOnce(expectedUrl);

      const result = await storageService.getUserProfilePictureUrl(userId, fileName);

      expect(result).toBe(expectedUrl);
      expect(mockMinioClient.fileExists).toHaveBeenCalledWith(`profile-pictures/${userId}-${fileName}`);
      expect(mockMinioClient.getFileUrl).toHaveBeenCalledWith(`profile-pictures/${userId}-${fileName}`);
    });

    it('should return null if the file does not exist', async () => {
      const userId = '123';
      const fileName = 'test.jpg';

      mockMinioClient.fileExists.mockResolvedValueOnce(false);

      const result = await storageService.getUserProfilePictureUrl(userId, fileName);

      expect(result).toBeNull();
      expect(mockMinioClient.fileExists).toHaveBeenCalledWith(`profile-pictures/${userId}-${fileName}`);
      expect(mockMinioClient.getFileUrl).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserProfilePicture', () => {
    it('should delete a user profile picture', async () => {
      const userId = '123';
      const fileName = 'test.jpg';

      mockMinioClient.deleteFile.mockResolvedValueOnce();

      await storageService.deleteUserProfilePicture(userId, fileName);

      expect(mockMinioClient.deleteFile).toHaveBeenCalledWith(`profile-pictures/${userId}-${fileName}`);
    });
  });

  describe('uploadOrganizationLogo', () => {
    it('should upload an organization logo and return the URL', async () => {
      const orgId = '123';
      const fileBuffer = Buffer.from('test');
      const fileType = 'image/png';
      const expectedUrl = 'http://minio:9000/organization-logos/123-test.png';

      mockMinioClient.uploadBuffer.mockResolvedValueOnce(expectedUrl);

      const result = await storageService.uploadOrganizationLogo(orgId, fileBuffer, fileType);

      expect(result).toBe(expectedUrl);
      expect(mockMinioClient.uploadBuffer).toHaveBeenCalledWith(
        expect.stringMatching(`organization-logos/${orgId}-`),
        fileBuffer,
        expect.objectContaining({
          'Content-Type': fileType
        })
      );
    });
  });

  describe('getOrganizationLogoUrl', () => {
    it('should return the URL if the file exists', async () => {
      const orgId = '123';
      const fileName = 'logo.png';
      const expectedUrl = 'http://minio:9000/organization-logos/123-logo.png';

      mockMinioClient.fileExists.mockResolvedValueOnce(true);
      mockMinioClient.getFileUrl.mockResolvedValueOnce(expectedUrl);

      const result = await storageService.getOrganizationLogoUrl(orgId, fileName);

      expect(result).toBe(expectedUrl);
      expect(mockMinioClient.fileExists).toHaveBeenCalledWith(`organization-logos/${orgId}-${fileName}`);
      expect(mockMinioClient.getFileUrl).toHaveBeenCalledWith(`organization-logos/${orgId}-${fileName}`);
    });

    it('should return null if the file does not exist', async () => {
      const orgId = '123';
      const fileName = 'logo.png';

      mockMinioClient.fileExists.mockResolvedValueOnce(false);

      const result = await storageService.getOrganizationLogoUrl(orgId, fileName);

      expect(result).toBeNull();
      expect(mockMinioClient.fileExists).toHaveBeenCalledWith(`organization-logos/${orgId}-${fileName}`);
      expect(mockMinioClient.getFileUrl).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrganizationLogo', () => {
    it('should delete an organization logo', async () => {
      const orgId = '123';
      const fileName = 'logo.png';

      mockMinioClient.deleteFile.mockResolvedValueOnce();

      await storageService.deleteOrganizationLogo(orgId, fileName);

      expect(mockMinioClient.deleteFile).toHaveBeenCalledWith(`organization-logos/${orgId}-${fileName}`);
    });
  });
});
