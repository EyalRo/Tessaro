import type { IDocumentSession } from 'ravendb';
import { v4 as uuidv4 } from 'uuid';
import RavenDbClient from './ravendb-client';
import { Organization, Service } from './types';

const ORGANIZATION_COLLECTION = 'Organizations';
const SERVICE_COLLECTION = 'Services';

type OrganizationInput = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
type ServiceInput = Omit<Service, 'id' | 'created_at' | 'updated_at'>;

type OrganizationUpdate = Partial<OrganizationInput>;
type ServiceUpdate = Partial<ServiceInput>;

class ConfigService {
  constructor(private dbClient: RavenDbClient) {}

  async createOrganization(org: OrganizationInput): Promise<Organization> {
    const id = this.generateId();
    const docId = this.resolveDocumentId(ORGANIZATION_COLLECTION, id);
    const timestamp = new Date();

    const organization: Organization = {
      ...org,
      id,
      created_at: timestamp,
      updated_at: timestamp
    };

    await this.withSession(async session => {
      await session.store(organization, docId);
      await session.saveChanges();
    });

    return organization;
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const docId = this.resolveDocumentId(ORGANIZATION_COLLECTION, id);
    return this.withSession(async session => {
      const organization = await session.load<Organization>(docId);
      return organization ?? null;
    });
  }

  async updateOrganization(id: string, updates: OrganizationUpdate): Promise<Organization | null> {
    const docId = this.resolveDocumentId(ORGANIZATION_COLLECTION, id);
    return this.withSession(async session => {
      const existing = await session.load<Organization>(docId);
      if (!existing) {
        return null;
      }

      Object.assign(existing, updates, { updated_at: new Date() });

      await session.saveChanges();

      return existing;
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    const docId = this.resolveDocumentId(ORGANIZATION_COLLECTION, id);
    await this.withSession(async session => {
      session.delete(docId);
      await session.saveChanges();
    });
  }

  async createService(service: ServiceInput): Promise<Service> {
    const id = this.generateId();
    const docId = this.resolveDocumentId(SERVICE_COLLECTION, id);
    const timestamp = new Date();

    const serviceDoc: Service = {
      ...service,
      id,
      created_at: timestamp,
      updated_at: timestamp
    };

    await this.withSession(async session => {
      await session.store(serviceDoc, docId);
      await session.saveChanges();
    });

    return serviceDoc;
  }

  async getServiceById(id: string): Promise<Service | null> {
    const docId = this.resolveDocumentId(SERVICE_COLLECTION, id);
    return this.withSession(async session => {
      const service = await session.load<Service>(docId);
      return service ?? null;
    });
  }

  async updateService(id: string, updates: ServiceUpdate): Promise<Service | null> {
    const docId = this.resolveDocumentId(SERVICE_COLLECTION, id);
    return this.withSession(async session => {
      const existing = await session.load<Service>(docId);
      if (!existing) {
        return null;
      }

      Object.assign(existing, updates, { updated_at: new Date() });

      await session.saveChanges();

      return existing;
    });
  }

  async deleteService(id: string): Promise<void> {
    const docId = this.resolveDocumentId(SERVICE_COLLECTION, id);
    await this.withSession(async session => {
      session.delete(docId);
      await session.saveChanges();
    });
  }

  private generateId(): string {
    return uuidv4();
  }

  private resolveDocumentId(collection: string, id: string): string {
    return `${collection}/${id}`;
  }

  private async withSession<TReturn>(handler: (session: IDocumentSession) => Promise<TReturn>): Promise<TReturn> {
    const session = this.dbClient.openSession();
    try {
      return await handler(session);
    } finally {
      if (typeof (session as { dispose?: () => void }).dispose === 'function') {
        session.dispose();
      }
    }
  }
}

export default ConfigService;
