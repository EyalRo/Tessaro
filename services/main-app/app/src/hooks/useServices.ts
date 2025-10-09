import { useCallback, useState } from 'react';
import type { Service } from 'shared/libs/api-client';
import { ServiceApiClient } from 'shared/libs/api-client';
import { SERVICES_API_BASE_URL } from '../config/api';

const serviceApiClient = new ServiceApiClient(SERVICES_API_BASE_URL);

type UseServicesResult = {
  services: Service[];
  loading: boolean;
  error: string | null;
  fetchServices(): Promise<void>;
  clearError(): void;
};

const useServices = (): UseServicesResult => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const remoteServices = await serviceApiClient.listServices();
      setServices(remoteServices);
    } catch (fetchError: unknown) {
      const message = fetchError instanceof Error
        ? fetchError.message
        : 'Unable to load services';
      setError(message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    services,
    loading,
    error,
    fetchServices,
    clearError
  };
};

export default useServices;
