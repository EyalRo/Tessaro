const getImportMetaEnv = (): Record<string, string> | undefined => {
  try {
    return new Function('return import.meta.env;')();
  } catch (error) {
    return undefined;
  }
};

const importMetaEnv = getImportMetaEnv();

const getEnvVar = (key: string, fallback: string): string => {
  const importMetaValue = importMetaEnv?.[key];
  if (typeof importMetaValue === 'string' && importMetaValue.length > 0) {
    return importMetaValue;
  }

  const processEnvValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  if (typeof processEnvValue === 'string' && processEnvValue.length > 0) {
    return processEnvValue;
  }

  const globalValue = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>)[key] : undefined;
  if (typeof globalValue === 'string' && globalValue.length > 0) {
    return globalValue;
  }

  return fallback;
};

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

export const USERS_API_BASE_URL = getEnvVar('VITE_USERS_API_URL', DEFAULT_API_BASE_URL);
export const ORGANIZATIONS_API_BASE_URL = getEnvVar('VITE_ORGANIZATIONS_API_URL', USERS_API_BASE_URL);
export const SERVICES_API_BASE_URL = getEnvVar('VITE_SERVICES_API_URL', USERS_API_BASE_URL);

export const STORAGE_API_BASE_URL = getEnvVar('VITE_STORAGE_API_URL', '/api');
export const CONFIG_API_BASE_URL = getEnvVar('VITE_CONFIG_API_URL', '/api');
