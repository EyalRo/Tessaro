import ConfigService from 'shared/libs/database/config-service';
import {
  createBaseApp as createSharedBaseApp,
  resolveHost as resolveSharedHost,
  resolvePort as resolveSharedPort
} from 'shared/config/app';
import { createRavenClient } from 'shared/config/ravendb';

let cachedConfigService: ConfigService | null = null;

const createConfigService = (): ConfigService => {
  const client = createRavenClient();
  return new ConfigService(client);
};

export const getConfigService = (): ConfigService => {
  if (!cachedConfigService) {
    cachedConfigService = createConfigService();
  }

  return cachedConfigService;
};

export const createBaseApp = createSharedBaseApp;
export const resolvePort = resolveSharedPort;
export const resolveHost = resolveSharedHost;
