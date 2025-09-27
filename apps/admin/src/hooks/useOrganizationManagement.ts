import React, { useState, useCallback } from 'react';
import useApi from './useApi';

interface Organization {
  id: string;
  name: string;
  plan: string;
  status: string;
}

const useOrganizationManagement = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const { loading, error, executeRequest, clearError } = useApi();

  const fetchOrganizations = useCallback(async () => {
    // In a real app, this would call the API
    // For now, we'll use mock data
    const mockOrganizations: Organization[] = [
      { id: '1', name: 'Acme Corp', plan: 'Enterprise', status: 'Active' },
      { id: '2', name: 'Globex Inc', plan: 'Professional', status: 'Active' },
      { id: '3', name: 'Wayne Enterprises', plan: 'Enterprise', status: 'Suspended' }
    ];
    
    await executeRequest(async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrganizations(mockOrganizations);
    });
  }, [executeRequest]);

  const createOrganization = useCallback(async (orgData: Omit<Organization, 'id'>) => {
    return executeRequest(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const newOrg = { id: Math.random().toString(36).substr(2, 9), ...orgData };
      setOrganizations(prev => [...prev, newOrg]);
      return newOrg;
    });
  }, [executeRequest]);

  const updateOrganization = useCallback(async (id: string, orgData: Partial<Organization>) => {
    return executeRequest(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrganizations(prev => prev.map(org => org.id === id ? { ...org, ...orgData } : org));
      setCurrentOrganization(prev => prev?.id === id ? { ...prev, ...orgData } : prev);
      return { id, ...orgData };
    });
  }, [executeRequest]);

  const deleteOrganization = useCallback(async (id: string) => {
    return executeRequest(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
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
