import { auth } from 'cassandra-driver';

export interface QueryResult<TRow> {
  rows: TRow[];
  [key: string]: unknown;
}

export interface ScyllaConfig {
  contactPoints: string[];
  localDataCenter: string;
  keyspace: string;
  authProvider?: {
    username: string;
    password: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ServiceRow {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  target_id: string;
  ip_address: string;
  timestamp: Date;
  metadata?: string;
}
