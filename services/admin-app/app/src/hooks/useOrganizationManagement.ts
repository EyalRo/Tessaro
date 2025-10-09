import React, { useState, useCallback } from 'react';
import {
  CreateOrganizationPayload,
  Organization as ApiOrganization,
  OrganizationApiClient,
  UpdateOrganizationPayload,
} from 'shared/libs/api-client';
import { ORGANIZATIONS_API_BASE_URL } from '../config/api';
import useApi from './useApi';

type Organization = ApiOrganization;

const organizationApiClient = new OrganizationApiClient(ORGANIZATIONS_API_BASE_URL);

const normalizeOrganization = (organization: Organization): Organization => {
  const safeName = typeof organization.name === 'string' && organization.name.trim().length > 0
    ? organization.name
    : 'Unnamed organization';
  const safePlan = typeof organization.plan === 'string' && organization.plan.trim().length > 0
    ? organization.plan
    : 'Unknown';
  const safeStatus = typeof organization.status === 'string' && organization.status.trim().length > 0
    ? organization.status
    : 'Inactive';

  return {
    ...organization,
    name: safeName,
    plan: safePlan,
    status: safeStatus
  };
};

const useOrganizationManagement = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const { loading, error, executeRequest, clearError } = useApi();

  const fetchOrganizations = useCallback(async () => {
    await executeRequest(async () => {
      const remoteOrganizations = await organizationApiClient.listOrganizations();
      const normalizedOrganizations = remoteOrganizations.map(normalizeOrganization);
      setOrganizations(normalizedOrganizations);
      return normalizedOrganizations;
    });
  }, [executeRequest]);

  const createOrganization = useCallback(async (orgData: CreateOrganizationPayload) => {
    return executeRequest(async () => {
      const newOrg = await organizationApiClient.createOrganization(orgData);
      const normalized = normalizeOrganization(newOrg);
      setOrganizations(prev => [...prev, normalized]);
      return normalized;
    });
  }, [executeRequest]);

  const updateOrganization = useCallback(async (id: string, orgData: UpdateOrganizationPayload) => {
    return executeRequest(async () => {
      const updated = await organizationApiClient.updateOrganization(id, orgData);
      const normalized = normalizeOrganization(updated);
      setOrganizations(prev => prev.map(org => org.id === id ? normalized : org));
      setCurrentOrganization(prev => prev?.id === id ? normalized : prev);
      return normalized;
    });
  }, [executeRequest]);

  const deleteOrganization = useCallback(async (id: string) => {
    return executeRequest(async () => {
      await organizationApiClient.deleteOrganization(id);
      setOrganizations(prev => prev.filter(org => org.id !== id));
      if (currentOrganization?.id === id) {
        setCurrentOrganization(null);
      }
    });
  }, [currentOrganization, executeRequest]);

  const selectOrganization = useCallback((org: Organization) => {
    setCurrentOrganization(org);
  }, []);

  const deselectOrganization = useCallback(() => {
    setCurrentOrganization(null);
  }, []);

  return {
    organizations,
    currentOrganization,
    loading,
    error,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    selectOrganization,
    deselectOrganization,
    clearError
  };
};

export default useOrganizationManagement;
