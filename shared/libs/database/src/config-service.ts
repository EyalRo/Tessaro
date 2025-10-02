import { v4 as uuidv4 } from 'uuid';
import ScyllaClient from './scylla-client';
import { ScyllaConfig, Organization, OrganizationRow, Service, ServiceRow } from './types';

class ConfigService {
  constructor(private dbClient: ScyllaClient) {}

  async createOrganization(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    const id = this.generateId();
    const timestamp = new Date();
    
    const query = `
      INSERT INTO organizations (id, name, plan, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.dbClient.executeQuery(query, [
      id,
      org.name,
      org.plan,
      org.status,
      timestamp,
      timestamp
    ]);
    
    return { ...org, id, created_at: timestamp, updated_at: timestamp };
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const query = `SELECT * FROM organizations WHERE id = ?`;
    const result = await this.dbClient.executeQuery<OrganizationRow>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToOrganization(result.rows[0]);
  }

  async updateOrganization(id: string, updates: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>): Promise<Organization | null> {
    const org = await this.getOrganizationById(id);
    if (!org) {
      return null;
    }
    
    const updatedOrg = { ...org, ...updates, updated_at: new Date() };
    const query = `
      UPDATE organizations 
      SET name = ?, plan = ?, status = ?, updated_at = ?
      WHERE id = ?
    `;
    
    await this.dbClient.executeQuery(query, [
      updatedOrg.name,
      updatedOrg.plan,
      updatedOrg.status,
      updatedOrg.updated_at,
      id
    ]);
    
    return updatedOrg;
  }

  async deleteOrganization(id: string): Promise<void> {
    const query = `DELETE FROM organizations WHERE id = ?`;
    await this.dbClient.executeQuery(query, [id]);
  }

  async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> {
    const id = this.generateId();
    const timestamp = new Date();
    
    const query = `
      INSERT INTO services (id, name, type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.dbClient.executeQuery(query, [
      id,
      service.name,
      service.type,
      service.status,
      timestamp,
      timestamp
    ]);
    
    return { ...service, id, created_at: timestamp, updated_at: timestamp };
  }

  async getServiceById(id: string): Promise<Service | null> {
    const query = `SELECT * FROM services WHERE id = ?`;
    const result = await this.dbClient.executeQuery<ServiceRow>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToService(result.rows[0]);
  }

  async updateService(id: string, updates: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>): Promise<Service | null> {
    const service = await this.getServiceById(id);
    if (!service) {
      return null;
    }
    
    const updatedService = { ...service, ...updates, updated_at: new Date() };
    const query = `
      UPDATE services 
      SET name = ?, type = ?, status = ?, updated_at = ?
      WHERE id = ?
    `;
    
    await this.dbClient.executeQuery(query, [
      updatedService.name,
      updatedService.type,
      updatedService.status,
      updatedService.updated_at,
      id
    ]);
    
    return updatedService;
  }

  async deleteService(id: string): Promise<void> {
    const query = `DELETE FROM services WHERE id = ?`;
    await this.dbClient.executeQuery(query, [id]);
  }

  private generateId(): string {
    return uuidv4();
  }

  private mapRowToOrganization(row: OrganizationRow): Organization {
    return {
      id: row.id,
      name: row.name,
      plan: row.plan,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToService(row: ServiceRow): Service {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default ConfigService;
