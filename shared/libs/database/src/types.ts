export interface RavenCertificateConfig {
  type?: 'pem' | 'pfx';
  certificate?: string | Buffer;
  password?: string;
  ca?: string | Buffer;
}

export interface RavenConfig {
  urls: string[];
  database: string;
  certificate?: RavenCertificateConfig;
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
