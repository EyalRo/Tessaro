import ConfigService from '../../../../libs/database/src/config-service';
import { createBaseApp as createSharedBaseApp, resolveHost as resolveSharedHost, resolvePort as resolveSharedPort } from '../../shared/app';
import { createScyllaClient } from '../../shared/scylla';

let cachedConfigService: ConfigService | null = null;

const createConfigService = (): ConfigService => {
  const client = createScyllaClient();
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
