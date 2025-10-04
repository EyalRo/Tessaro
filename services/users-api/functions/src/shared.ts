import UserService from 'shared/libs/database/user-service';
import {
  createBaseApp as createSharedBaseApp,
  resolveHost as resolveSharedHost,
  resolvePort as resolveSharedPort
} from 'shared/config/app';
import { createRavenClient } from 'shared/config/ravendb';

let cachedUserService: UserService | null = null;

const createUserService = (): UserService => {
  const client = createRavenClient();
  return new UserService(client);
};

export const getUserService = (): UserService => {
  if (!cachedUserService) {
    cachedUserService = createUserService();
  }

  return cachedUserService;
};

export const createBaseApp = createSharedBaseApp;
export const resolvePort = resolveSharedPort;
export const resolveHost = resolveSharedHost;
