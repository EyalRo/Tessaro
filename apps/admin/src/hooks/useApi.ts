import React, { useState, useCallback } from 'react';

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class ApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const handleError = useCallback((error: any) => {
    setLoading(false);
    
    if (error instanceof ApiError) {
      setError(error);
      return;
    }
    
    // Handle network errors
    if (!error.response) {
      setError(new ApiError('Network error - please check your connection', 'NETWORK_ERROR'));
      return;
    }
    
    // Handle HTTP errors
    const { status, data } = error.response;
    const message = data?.error || data?.message || 'An unexpected error occurred';
    
    setError(new ApiError(message, `HTTP_${status}`, status));
  }, []);

  const executeRequest = useCallback(async <T,>(requestFn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestFn();
      setLoading(false);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    executeRequest,
    clearError
  };
};

export default useApi;
export type { ApiError };
