/**
 * useApi Hook
 * Custom hook for making API requests with authentication
 */

import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';

export function useApi() {
  const { token } = useAuth();

  return {
    get: <T>(endpoint: string) => apiClient.get<T>(endpoint, token || undefined),
    post: <T>(endpoint: string, data: unknown) =>
      apiClient.post<T>(endpoint, data, token || undefined),
    put: <T>(endpoint: string, data: unknown) =>
      apiClient.put<T>(endpoint, data, token || undefined),
    delete: <T>(endpoint: string) => apiClient.delete<T>(endpoint, token || undefined),
    patch: <T>(endpoint: string, data: unknown) =>
      apiClient.patch<T>(endpoint, data, token || undefined),
  };
}
