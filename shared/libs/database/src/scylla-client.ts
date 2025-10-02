import { Client, auth } from 'cassandra-driver';
import { QueryResult, ScyllaConfig } from './types';

class ScyllaClient {
  private client: Client;
  private connected: boolean = false;

  constructor(private config: ScyllaConfig) {
    this.client = new Client({
      contactPoints: config.contactPoints,
      localDataCenter: config.localDataCenter,
      keyspace: config.keyspace,
      authProvider: config.authProvider ?
        new auth.PlainTextAuthProvider(
          config.authProvider.username,
          config.authProvider.password
        ) : undefined
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.shutdown();
      this.connected = false;
    }
  }

  async executeQuery<TRow = Record<string, unknown>>(query: string, params?: any[]): Promise<QueryResult<TRow>> {
    if (!this.connected) {
      await this.connect();
    }
    return this.client.execute(query, params) as unknown as QueryResult<TRow>;
  }

  async executeBatch(queries: Array<{query: string, params?: any[]}>): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }
    const batchOptions = { prepare: true };
    return this.client.batch(
      queries.map(q => ({ query: q.query, params: q.params })), 
      batchOptions
    );
  }
}

export default ScyllaClient;
