import axios, { AxiosInstance } from 'axios';

interface Organization {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

class ConfigApiClient {
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

  // Organization methods
  async createOrganization(orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    const response = await this.client.post<Organization>('/organizations', orgData);
    return response.data;
  }

  async getOrganizationById(id: string): Promise<Organization> {
    const response = await this.client.get<Organization>(`/organizations/${id}`);
    return response.data;
  }

  async updateOrganization(id: string, orgData: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>): Promise<Organization> {
    const response = await this.client.put<Organization>(`/organizations/${id}`, orgData);
    return response.data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.client.delete(`/organizations/${id}`);
  }

  // Service methods
  async createService(serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> {
    const response = await this.client.post<Service>('/services', serviceData);
    return response.data;
  }

  async getServiceById(id: string): Promise<Service> {
    const response = await this.client.get<Service>(`/services/${id}`);
    return response.data;
  }

  async updateService(id: string, serviceData: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>): Promise<Service> {
    const response = await this.client.put<Service>(`/services/${id}`, serviceData);
    return response.data;
  }

  async deleteService(id: string): Promise<void> {
    await this.client.delete(`/services/${id}`);
  }
}

export default ConfigApiClient;
export type { Organization, Service };
