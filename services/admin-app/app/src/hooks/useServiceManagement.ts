import React, { useState, useCallback } from 'react';
import {
  CreateServicePayload,
  Service as ApiService,
  ServiceApiClient,
  UpdateServicePayload,
} from 'shared/libs/api-client';
import { SERVICES_API_BASE_URL } from '../config/api';
import useApi from './useApi';

type Service = ApiService;

const serviceApiClient = new ServiceApiClient(SERVICES_API_BASE_URL);

const normalizeService = (service: Service): Service => {
  const safeName = typeof service.name === 'string' && service.name.trim().length > 0
    ? service.name
    : 'Unnamed service';
  const safeType = typeof service.service_type === 'string' && service.service_type.trim().length > 0
    ? service.service_type
    : 'Unknown';
  const safeStatus = typeof service.status === 'string' && service.status.trim().length > 0
    ? service.status
    : 'Inactive';
  const normalizedCount = Number.isFinite(service.organization_count)
    ? Math.max(0, Math.floor(service.organization_count))
    : 0;

  return {
    ...service,
    name: safeName,
    service_type: safeType,
    status: safeStatus,
    organization_count: normalizedCount
  };
};

const useServiceManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const { loading, error, executeRequest, clearError } = useApi();

  const fetchServices = useCallback(async () => {
    await executeRequest(async () => {
      const remoteServices = await serviceApiClient.listServices();
      const normalized = remoteServices.map(normalizeService);
      setServices(normalized);
      return normalized;
    });
  }, [executeRequest]);

  const createService = useCallback(async (payload: CreateServicePayload) => {
    return executeRequest(async () => {
      const created = await serviceApiClient.createService(payload);
      const normalized = normalizeService(created);
      setServices(prev => [...prev, normalized]);
      return normalized;
    });
  }, [executeRequest]);

  const updateService = useCallback(async (id: string, payload: UpdateServicePayload) => {
    return executeRequest(async () => {
      const updated = await serviceApiClient.updateService(id, payload);
      const normalized = normalizeService(updated);
      setServices(prev => prev.map(service => service.id === id ? normalized : service));
      setCurrentService(prev => prev?.id === id ? normalized : prev);
      return normalized;
    });
  }, [executeRequest]);

  const deleteService = useCallback(async (id: string) => {
    return executeRequest(async () => {
      await serviceApiClient.deleteService(id);
      setServices(prev => prev.filter(service => service.id !== id));
      if (currentService?.id === id) {
        setCurrentService(null);
      }
    });
  }, [currentService, executeRequest]);

  const selectService = useCallback((service: Service) => {
    setCurrentService(service);
  }, []);

  const deselectService = useCallback(() => {
    setCurrentService(null);
  }, []);

  return {
    services,
    currentService,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
    selectService,
    deselectService,
    clearError
  };
};

export default useServiceManagement;
export type { Service };
