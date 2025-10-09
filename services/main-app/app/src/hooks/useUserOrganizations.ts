import { useCallback, useState } from 'react';
import type { Organization } from 'shared/libs/api-client';
import { UserApiClient } from 'shared/libs/api-client';
import { USERS_API_BASE_URL } from '../config/api';

const userApiClient = new UserApiClient(USERS_API_BASE_URL);

type UseUserOrganizationsResult = {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  fetchOrganizations(userId: string | null | undefined): Promise<void>;
  clearError(): void;
};

const useUserOrganizations = (): UseUserOrganizationsResult => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async (userId: string | null | undefined) => {
    if (!userId) {
      setOrganizations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await userApiClient.getUser(userId);
      const safeOrganizations = Array.isArray(user.organizations)
        ? user.organizations
        : [];
      setOrganizations(safeOrganizations);
    } catch (fetchError: unknown) {
      const message = fetchError instanceof Error
        ? fetchError.message
        : 'Unable to load organizations';
      setError(message);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    organizations,
    loading,
    error,
    fetchOrganizations,
    clearError
  };
};

export default useUserOrganizations;
