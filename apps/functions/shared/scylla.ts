import ScyllaClient from '../../../libs/database/src/scylla-client';
import { ScyllaConfig } from '../../../libs/database/src/types';

const resolveContactPoints = (): string[] => {
  const raw = process.env.SCYLLA_CONTACT_POINTS;
  if (raw) {
    return raw
      .split(',')
      .map(point => point.trim())
      .filter(point => point.length > 0);
  }
  return ['scylla-client.databases.svc.cluster.local'];
};

const resolveLocalDataCenter = (): string => {
  return process.env.SCYLLA_LOCAL_DC?.trim() || 'datacenter1';
};

const resolveKeyspace = (): string => {
  return process.env.SCYLLA_KEYSPACE?.trim() || 'tessaro_admin';
};

const resolveAuthProvider = (): ScyllaConfig['authProvider'] => {
  const username = process.env.SCYLLA_USERNAME;
  const password = process.env.SCYLLA_PASSWORD;
  if (username && password) {
    return { username, password };
  }

  return undefined;
};

export const resolveScyllaConfig = (): ScyllaConfig => {
  return {
    contactPoints: resolveContactPoints(),
    localDataCenter: resolveLocalDataCenter(),
    keyspace: resolveKeyspace(),
    authProvider: resolveAuthProvider()
  };
};

export const createScyllaClient = (): ScyllaClient => {
  return new ScyllaClient(resolveScyllaConfig());
};
