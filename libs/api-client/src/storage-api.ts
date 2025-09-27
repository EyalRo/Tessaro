import axios, { AxiosInstance } from 'axios';

class StorageApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async uploadUserProfilePicture(userId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post<{ url: string }>(
      `/storage/user-profile/${userId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data.url;
  }

  async uploadOrganizationLogo(orgId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post<{ url: string }>(
      `/storage/organization-logo/${orgId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data.url;
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.client.delete(`/storage/files/${filePath}`);
  }
}

export default StorageApiClient;
