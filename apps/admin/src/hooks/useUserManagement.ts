import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useApi from './useApi';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const { loading, error, executeRequest, clearError } = useApi();

  const fetchUsers = useCallback(async () => {
    // In a real app, this would call the API
    // For now, we'll use mock data
    const mockUsers: UserProfile[] = [
      { id: '1', email: 'john@example.com', name: 'John Doe', role: 'Administrator', avatar_url: 'https://example.com/avatar1.jpg' },
      { id: '2', email: 'jane@example.com', name: 'Jane Smith', role: 'Manager' },
      { id: '3', email: 'bob@example.com', name: 'Bob Johnson', role: 'User', avatar_url: 'https://example.com/avatar2.jpg' }
    ];
    
    await executeRequest(async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(mockUsers);
    });
  }, [executeRequest]);

  const createUser = useCallback(async (userData: Omit<UserProfile, 'id'>) => {
    return executeRequest(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const newUser = { id: uuidv4(), ...userData };
      setUsers(prev => [...prev, newUser]);
      return newUser;
    });
  }, [executeRequest]);

  const updateUser = useCallback(async (id: string, userData: Partial<UserProfile>) => {
    return executeRequest(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(prev => prev.map(user => user.id === id ? { ...user, ...userData } : user));
      setCurrentUser(prev => prev?.id === id ? { ...prev, ...userData } : prev);
      return { id, ...userData };
    });
  }, [executeRequest]);

  const deleteUser = useCallback(async (id: string) => {
    return executeRequest(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(prev => prev.filter(user => user.id !== id));
      if (currentUser?.id === id) {
        setCurrentUser(null);
      }
    });
  }, [currentUser, executeRequest]);

  const selectUser = useCallback((user: UserProfile) => {
    setCurrentUser(user);
  }, []);

  const deselectUser = useCallback(() => {
    setCurrentUser(null);
  }, []);

  return {
    users,
    currentUser,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    selectUser,
    deselectUser,
    clearError
  };
};

export default useUserManagement;
