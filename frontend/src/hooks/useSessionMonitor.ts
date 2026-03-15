import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionStatus {
  sessionExpired: boolean;
  minutosRestantes: number;
  segundosRestantes: number;
  debeAdvertir: boolean;
  minutosAdvertencia: number;
  fechaExpiracion?: string;
  diasRestantesPassword?: number;
  passwordExpired?: boolean;
}

const API_URL = 'http://localhost:3001/api/auth/session-status';

export const useSessionMonitor = (enabled: boolean = true) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(true);
  useEffect(() => {
    return () => { activeRef.current = false; };
  }, []);

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
        if (response.status === 401 || response.status === 404) {
          // Sesión expirada o no encontrada (404 = sesión ya expiró en BD)
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
      if (!activeRef.current) return;
      if (data.success) {
        // Calcular segundos totales restantes (minutos * 60 + segundos)
        const segundosTotales = (data.data.minutosRestantes * 60) + data.data.segundosRestantes;
        const newStatus = {
          ...data.data,
          segundosRestantes: segundosTotales
        };
        setSessionStatus(newStatus);
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adjustRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SessionStatus | null>(null);
  useEffect(() => {
    statusRef.current = sessionStatus;
  }, [sessionStatus]);

  const clearTimers = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (adjustRef.current) { clearInterval(adjustRef.current); adjustRef.current = null; }
    if (initialTimeoutRef.current) { clearTimeout(initialTimeoutRef.current); initialTimeoutRef.current = null; }
  };

  useEffect(() => {
    // Siempre limpiar timers cuando cambie enabled
    clearTimers();
    if (!enabled) return;

    // Verificar inmediatamente
    checkSessionStatus();

    const setupCheck = () => {
      // Limpiar intervalo anterior si existe
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Determinar intervalo basado en el estado actual
      const currentStatus = statusRef.current;
      
      if (!currentStatus || currentStatus.sessionExpired) {
        // Sin estado o expirado: verificar cada 10 segundos
        intervalRef.current = setInterval(() => {
          checkSessionStatus();
        }, 10000);
      } else if (currentStatus.segundosRestantes !== undefined) {
        if (currentStatus.segundosRestantes <= 60) {
          // Cerca de expirar (60 segundos o menos): verificar cada segundo
          intervalRef.current = setInterval(() => {
            checkSessionStatus();
          }, 1000);
        } else if (currentStatus.segundosRestantes <= 120) {
          // Sesión muy corta (≤2 min): verificar cada 2 segundos
          intervalRef.current = setInterval(() => {
            checkSessionStatus();
          }, 2000);
        } else if (currentStatus.segundosRestantes <= 300) {
          // Menos de 5 minutos: verificar cada 3 segundos
          intervalRef.current = setInterval(() => {
            checkSessionStatus();
          }, 3000);
        } else {
          // Sesión larga: verificar cada 10 segundos
          intervalRef.current = setInterval(() => {
            checkSessionStatus();
          }, 10000);
        }
      }
    };

    // Configurar intervalo inicial después de un pequeño delay para tener el estado
    initialTimeoutRef.current = setTimeout(() => { setupCheck(); }, 1000);

    // También configurar un intervalo que se ajuste dinámicamente cada 2 segundos
    adjustRef.current = setInterval(() => { setupCheck(); }, 2000);

    return () => {
      clearTimers();
    };
  }, [enabled, checkSessionStatus]);

  const clearSessionStatus = useCallback(() => {
    setSessionStatus(null);
    setError(null);
  }, []);

  return {
    sessionStatus,
    loading,
    error,
    refresh: checkSessionStatus,
    clearSessionStatus
  };
};
