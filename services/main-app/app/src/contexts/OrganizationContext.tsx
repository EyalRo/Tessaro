import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Organization } from 'shared/libs/api-client';

type OrganizationContextValue = {
  organization: Organization | null;
  selectOrganization(organization: Organization): void;
  clearOrganization(): void;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);

  const selectOrganization = useCallback((nextOrganization: Organization) => {
    setOrganization(nextOrganization);
  }, []);

  const clearOrganization = useCallback(() => {
    setOrganization(null);
  }, []);

  const value = useMemo(() => ({
    organization,
    selectOrganization,
    clearOrganization
  }), [organization, selectOrganization, clearOrganization]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
};

export { OrganizationProvider, useOrganizationContext };
