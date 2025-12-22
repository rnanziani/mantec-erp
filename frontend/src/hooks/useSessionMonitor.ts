import { useState, useEffect, useCallback } from 'react';

interface SessionStatus {
  sessionExpired: boolean;
  minutosRestantes: number;
  segundosRestantes: number;
  debeAdvertir: boolean;
  minutosAdvertencia: number;
}

const API_URL = 'http://localhost:3001/api/auth/session-status';

export const useSessionMonitor = (enabled: boolean = true) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSessionStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSessionStatus(null);
        setLoading(false);
        return;
      }

      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Sesión expirada
          setSessionStatus({
            sessionExpired: true,
            minutosRestantes: 0,
            segundosRestantes: 0,
            debeAdvertir: false,
            minutosAdvertencia: 5
          });
          return;
        }
        throw new Error('Error al verificar sesión');
      }

      const data = await response.json();
      if (data.success) {
        setSessionStatus(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error al verificar estado de sesión:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Verificar inmediatamente
    checkSessionStatus();

    // Verificar cada 30 segundos
    const interval = setInterval(() => {
      checkSessionStatus();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [enabled, checkSessionStatus]);

  return {
    sessionStatus,
    loading,
    error,
    refresh: checkSessionStatus
  };
};


