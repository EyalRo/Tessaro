import axios, { AxiosInstance } from 'axios';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

class UserApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createUser(userData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const response = await this.client.post<UserProfile>('/users', userData);
    return response.data;
  }

  async listUsers(): Promise<UserProfile[]> {
    const response = await this.client.get<UserProfile[]>('/users');
    return response.data;
  }

  async getUserById(id: string): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile> {
    const response = await this.client.put<UserProfile>(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }
}

export default UserApiClient;
export type { UserProfile };
