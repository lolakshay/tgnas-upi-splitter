import { useState, useEffect, useCallback } from 'react';
import { PaymentSession } from '../types';
import { api } from '../services/api';

const SESSION_STORAGE_KEY = 'upi_split_pay_active_session_id';

export function usePaymentSession() {
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from storage on load
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSession(sessionId);
      setSession(data);
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.message || 'Session not found');
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessionId) {
      loadSession(savedSessionId);
    } else {
      setLoading(false);
    }
  }, [loadSession]);

  const startSession = (newSession: PaymentSession) => {
    setSession(newSession);
    sessionStorage.setItem(SESSION_STORAGE_KEY, newSession.session_id);
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  };

  const updateSession = (updatedSession: PaymentSession) => {
    setSession(updatedSession);
  };

  return {
    session,
    loading,
    error,
    startSession,
    clearSession,
    updateSession,
    loadSession,
    setSession
  };
}
