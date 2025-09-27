import MinioClient, { MinioConfig } from './minio-client';
import { createId } from '@paralleldrive/cuid2';

class StorageService {
  constructor(private minioClient: MinioClient) {}

  async uploadUserProfilePicture(userId: string, fileBuffer: Buffer, fileType: string): Promise<string> {
    const fileName = `profile-pictures/${userId}-${createId()}.${fileType.split('/')[1]}`;
    const metaData = {
      'Content-Type': fileType,
      'x-amz-meta-user-id': userId
    };
    
    return await this.minioClient.uploadBuffer(fileName, fileBuffer, metaData);
  }

  async getUserProfilePictureUrl(userId: string, fileName: string): Promise<string | null> {
    const objectName = `profile-pictures/${userId}-${fileName}`;
    if (await this.minioClient.fileExists(objectName)) {
      return await this.minioClient.getFileUrl(objectName);
    }
    return null;
  }

  async deleteUserProfilePicture(userId: string, fileName: string): Promise<void> {
    const objectName = `profile-pictures/${userId}-${fileName}`;
    await this.minioClient.deleteFile(objectName);
  }

  async uploadOrganizationLogo(orgId: string, fileBuffer: Buffer, fileType: string): Promise<string> {
    const fileName = `organization-logos/${orgId}-${createId()}.${fileType.split('/')[1]}`;
    const metaData = {
      'Content-Type': fileType,
      'x-amz-meta-org-id': orgId
    };
    
    return await this.minioClient.uploadBuffer(fileName, fileBuffer, metaData);
  }

  async getOrganizationLogoUrl(orgId: string, fileName: string): Promise<string | null> {
    const objectName = `organization-logos/${orgId}-${fileName}`;
    if (await this.minioClient.fileExists(objectName)) {
      return await this.minioClient.getFileUrl(objectName);
    }
    return null;
  }

  async deleteOrganizationLogo(orgId: string, fileName: string): Promise<void> {
    const objectName = `organization-logos/${orgId}-${fileName}`;
    await this.minioClient.deleteFile(objectName);
  }
}

export default StorageService;
