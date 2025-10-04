import type { IDocumentSession } from 'ravendb';
import { v4 as uuidv4 } from 'uuid';
import RavenDbClient from './ravendb-client';
import { UserProfile } from './types';

const USER_COLLECTION = 'Users';

type UserInput = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
type UserUpdate = Partial<UserInput>;

type QueryFactory<T> = {
  all(): Promise<T[]>;
};

class UserService {
  constructor(private dbClient: RavenDbClient) {}

  async createUser(user: UserInput): Promise<UserProfile> {
    const id = this.generateId();
    const docId = this.resolveDocumentId(id);
    const timestamp = new Date();

    const userDoc: UserProfile = {
      ...user,
      id,
      avatar_url: user.avatar_url ?? null,
      created_at: timestamp,
      updated_at: timestamp
    };

    await this.withSession(async session => {
      await session.store(userDoc, docId);
      await session.saveChanges();
    });

    return userDoc;
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const docId = this.resolveDocumentId(id);
    return this.withSession(async session => {
      const user = await session.load<UserProfile>(docId);
      return user ?? null;
    });
  }

  async listUsers(): Promise<UserProfile[]> {
    return this.withSession(async session => {
      const query = session.query<UserProfile>({ collection: USER_COLLECTION }) as QueryFactory<UserProfile>;
      const users = await query.all();
      return users;
    });
  }

  async updateUser(id: string, updates: UserUpdate): Promise<UserProfile | null> {
    const docId = this.resolveDocumentId(id);
    return this.withSession(async session => {
      const existing = await session.load<UserProfile>(docId);
      if (!existing) {
        return null;
      }

      Object.assign(existing, updates, {
        avatar_url: updates.avatar_url ?? existing.avatar_url ?? null,
        updated_at: new Date()
      });

      await session.saveChanges();

      return existing;
    });
  }

  async deleteUser(id: string): Promise<void> {
    const docId = this.resolveDocumentId(id);
    await this.withSession(async session => {
      session.delete(docId);
      await session.saveChanges();
    });
  }

  private generateId(): string {
    return uuidv4();
  }

  private resolveDocumentId(id: string): string {
    return `${USER_COLLECTION}/${id}`;
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

export default UserService;
