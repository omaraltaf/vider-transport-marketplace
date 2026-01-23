/**
 * Safe Auth Hook
 * Provides safe token access using TokenManager as fallback
 */

import { useAuth } from '../contexts/EnhancedAuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { useState, useEffect } from 'react';

export function useSafeAuth() {
  const auth = useAuth();
  const [safeToken, setSafeToken] = useState<string | null>(auth.token);

  useEffect(() => {
    // If auth.token is available, use it
    if (auth.token) {
      setSafeToken(auth.token);
      return;
    }

    // If auth.token is null, try to get it from TokenManager
    const getSafeToken = async () => {
      try {
        const validToken = await tokenManager.getValidToken();
        setSafeToken(validToken);
      } catch (error) {
        console.warn('Could not get valid token from TokenManager:', error);
        setSafeToken(null);
      }
    };

    getSafeToken();
  }, [auth.token]);

  return {
    ...auth,
    token: safeToken,
    getSafeToken: async () => {
      try {
        return await tokenManager.getValidToken();
      } catch (error) {
        return auth.token;
      }
    }
  };
}