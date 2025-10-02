import { v4 as uuidv4 } from 'uuid';
import ScyllaClient from './scylla-client';
import { ScyllaConfig, UserProfile, Organization, Service, AuditLog, UserRow } from './types';

class UserService {
  constructor(private dbClient: ScyllaClient) {}

  async createUser(user: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const id = this.generateId();
    const timestamp = new Date();
    
    const query = `
      INSERT INTO users (id, email, name, role, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.dbClient.executeQuery(query, [
      id,
      user.email,
      user.name,
      user.role,
      user.avatar_url || null,
      timestamp,
      timestamp
    ]);
    
    return { ...user, id, created_at: timestamp, updated_at: timestamp };
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const query = `SELECT * FROM users WHERE id = ?`;
    const result = await this.dbClient.executeQuery<UserRow>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async listUsers(): Promise<UserProfile[]> {
    const query = 'SELECT * FROM users';
    const result = await this.dbClient.executeQuery<UserRow>(query);

    return result.rows.map((row) => this.mapRowToUser(row));
  }

  async updateUser(id: string, updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile | null> {
    const user = await this.getUserById(id);
    if (!user) {
      return null;
    }
    
    const updatedUser = { ...user, ...updates, updated_at: new Date() };
    const query = `
      UPDATE users 
      SET email = ?, name = ?, role = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?
    `;
    
    await this.dbClient.executeQuery(query, [
      updatedUser.email,
      updatedUser.name,
      updatedUser.role,
      updatedUser.avatar_url || null,
      updatedUser.updated_at,
      id
    ]);
    
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const query = `DELETE FROM users WHERE id = ?`;
    await this.dbClient.executeQuery(query, [id]);
  }

  private generateId(): string {
    return uuidv4();
  }

  private mapRowToUser(row: UserRow): UserProfile {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default UserService;
