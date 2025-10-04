import RavenDbClient from 'shared/libs/database/ravendb-client';
import { RavenConfig } from 'shared/libs/database/types';

const resolveUrls = (): string[] => {
  const raw = process.env.RAVEN_URLS;
  if (raw) {
    return raw
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);
  }

  return ['http://ravendb:8080'];
};

const resolveDatabase = (): string => {
  return process.env.RAVEN_DATABASE?.trim() || 'Tessaro';
};

export const resolveRavenConfig = (): RavenConfig => {
  return {
    urls: resolveUrls(),
    database: resolveDatabase()
  };
};

export const createRavenClient = (): RavenDbClient => {
  return new RavenDbClient(resolveRavenConfig());
};
