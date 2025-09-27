import * as Minio from 'minio';

export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
}

class MinioClient {
  private client: Minio.Client;
  private bucketName: string;

  constructor(private config: MinioConfig) {
    this.client = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey
    });
    
    this.bucketName = config.bucketName;
  }

  async uploadFile(objectName: string, filePath: string, metaData?: Minio.ItemBucketMetadata): Promise<string> {
    await this.client.fPutObject(this.bucketName, objectName, filePath, metaData);
    return this.getFileUrl(objectName);
  }

  async uploadBuffer(objectName: string, buffer: Buffer, metaData?: Minio.ItemBucketMetadata): Promise<string> {
    await this.client.putObject(this.bucketName, objectName, buffer, metaData);
    return this.getFileUrl(objectName);
  }

  async downloadFile(objectName: string, filePath: string): Promise<void> {
    await this.client.fGetObject(this.bucketName, objectName, filePath);
  }

  async getFileUrl(objectName: string): Promise<string> {
    return await this.client.presignedGetObject(this.bucketName, objectName, 24 * 60 * 60); // 24 hours expiry
  }

  async deleteFile(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectName);
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default MinioClient;
