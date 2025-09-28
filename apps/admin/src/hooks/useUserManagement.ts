import React, { useState, useCallback } from 'react';
import { UserApiClient, UserProfile as ApiUserProfile } from 'libs/api-client';
import useApi from './useApi';
import { USERS_API_BASE_URL } from '../config/api';

type UserProfile = ApiUserProfile;

type CreateUserPayload = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
type UpdateUserPayload = Partial<CreateUserPayload>;

const userApiClient = new UserApiClient(USERS_API_BASE_URL);

const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const { loading, error, executeRequest, clearError } = useApi();

  const fetchUsers = useCallback(async () => {
    await executeRequest(async () => {
      const remoteUsers = await userApiClient.listUsers();
      setUsers(remoteUsers);
      return remoteUsers;
    });
  }, [executeRequest]);

  const createUser = useCallback(async (userData: CreateUserPayload) => {
    return executeRequest(async () => {
      const newUser = await userApiClient.createUser(userData);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    });
  }, [executeRequest]);

  const updateUser = useCallback(async (id: string, userData: UpdateUserPayload) => {
    return executeRequest(async () => {
      const updatedUser = await userApiClient.updateUser(id, userData);
      setUsers((prev: UserProfile[]) => prev.map(user => user.id === id ? updatedUser : user));
      setCurrentUser((prev: UserProfile | null) => prev?.id === id ? updatedUser : prev);
      return updatedUser;
    });
  }, [executeRequest]);

  const deleteUser = useCallback(async (id: string) => {
    return executeRequest(async () => {
      await userApiClient.deleteUser(id);
      setUsers((prev: UserProfile[]) => prev.filter(user => user.id !== id));
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
