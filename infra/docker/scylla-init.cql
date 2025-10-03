CREATE KEYSPACE IF NOT EXISTS tessaro_admin WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE IF NOT EXISTS tessaro_admin.users (
  id uuid PRIMARY KEY,
  email text,
  name text,
  role text,
  avatar_url text,
  created_at timestamp,
  updated_at timestamp
);
