import React, { useState, useCallback } from 'react';
import { UserApiClient, UserProfile as ApiUserProfile } from 'shared/libs/api-client';
import useApi from './useApi';
import { USERS_API_BASE_URL } from '../config/api';

type UserProfile = ApiUserProfile;

type CreateUserPayload = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
type UpdateUserPayload = Partial<CreateUserPayload>;

const userApiClient = new UserApiClient(USERS_API_BASE_URL);

const normalizeUserProfile = (user: UserProfile): UserProfile => {
  const safeEmail = typeof user.email === 'string' && user.email.trim().length > 0 ? user.email : '';
  const safeName = typeof user.name === 'string' && user.name.trim().length > 0
    ? user.name
    : (safeEmail || 'Unnamed user');
  const safeRole = typeof user.role === 'string' && user.role.trim().length > 0 ? user.role : 'User';

  return {
    ...user,
    email: safeEmail,
    name: safeName,
    role: safeRole,
    avatar_url: user.avatar_url ?? null
  };
};

const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const { loading, error, executeRequest, clearError } = useApi();

  const fetchUsers = useCallback(async () => {
    await executeRequest(async () => {
      const remoteUsers = await userApiClient.listUsers();
      const normalizedUsers = remoteUsers.map(normalizeUserProfile);
      setUsers(normalizedUsers);
      return normalizedUsers;
    });
  }, [executeRequest]);

  const createUser = useCallback(async (userData: CreateUserPayload) => {
    return executeRequest(async () => {
      const newUser = await userApiClient.createUser(userData);
      const normalizedUser = normalizeUserProfile(newUser);
      setUsers(prev => [...prev, normalizedUser]);
      return normalizedUser;
    });
  }, [executeRequest]);

  const updateUser = useCallback(async (id: string, userData: UpdateUserPayload) => {
    return executeRequest(async () => {
      const updatedUser = await userApiClient.updateUser(id, userData);
      const normalizedUser = normalizeUserProfile(updatedUser);
      setUsers((prev: UserProfile[]) => prev.map(user => user.id === id ? normalizedUser : user));
      setCurrentUser((prev: UserProfile | null) => prev?.id === id ? normalizedUser : prev);
      return normalizedUser;
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
