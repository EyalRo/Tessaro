import MinioClient from './minio-client';
import { createId } from '@paralleldrive/cuid2';
import { extension } from 'mime-types';

const SUPPORTED_EXTENSIONS = new Set<string>(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']);

class InvalidContentTypeError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidContentTypeError';
    this.statusCode = 422;
  }
}

class StorageService {
  constructor(private minioClient: MinioClient) {}

  async uploadUserProfilePicture(userId: string, fileBuffer: Buffer, fileType: string): Promise<string> {
    const { contentType, fileExtension } = this.resolveContentType(fileType);
    const fileName = `profile-pictures/${userId}-${createId()}.${fileExtension}`;
    const metaData = {
      'Content-Type': contentType,
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
    const { contentType, fileExtension } = this.resolveContentType(fileType);
    const fileName = `organization-logos/${orgId}-${createId()}.${fileExtension}`;
    const metaData = {
      'Content-Type': contentType,
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

  private resolveContentType(fileType: string): { contentType: string; fileExtension: string } {
    if (typeof fileType !== 'string') {
      throw new InvalidContentTypeError('Content type must be a string.');
    }

    const normalizedType = fileType.trim().toLowerCase();

    if (!normalizedType) {
      throw new InvalidContentTypeError('Content type cannot be empty.');
    }

    const fileExtension = extension(normalizedType);

    if (!fileExtension || !SUPPORTED_EXTENSIONS.has(fileExtension)) {
      throw new InvalidContentTypeError(`Unsupported content type: ${fileType}`);
    }

    return {
      contentType: normalizedType,
      fileExtension
    };
  }
}

export default StorageService;
