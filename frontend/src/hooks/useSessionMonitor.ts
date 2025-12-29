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
        // Calcular segundos totales restantes (minutos * 60 + segundos)
        const segundosTotales = (data.data.minutosRestantes * 60) + data.data.segundosRestantes;
        const newStatus = {
          ...data.data,
          segundosRestantes: segundosTotales
        };
        setSessionStatus(newStatus);
        console.log('📊 Estado de sesión actualizado:', {
          minutosRestantes: data.data.minutosRestantes,
          segundosParciales: data.data.segundosRestantes,
          segundosTotales,
          debeAdvertir: data.data.debeAdvertir,
          sessionExpired: data.data.sessionExpired,
          mostrarModalEn: segundosTotales > 60 ? `En ${segundosTotales - 60} segundos` : 'AHORA'
        });
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

    let interval: ReturnType<typeof setInterval> | null = null;

    // Verificar inmediatamente
    checkSessionStatus();

    const setupCheck = () => {
      // Limpiar intervalo anterior si existe
      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      // Determinar intervalo basado en el estado actual
      const currentStatus = sessionStatus;
      
      if (!currentStatus || currentStatus.sessionExpired) {
        // Sin estado o expirado: verificar cada 10 segundos
        interval = setInterval(() => {
          checkSessionStatus();
        }, 10000);
      } else if (currentStatus.segundosRestantes !== undefined) {
        if (currentStatus.segundosRestantes <= 60) {
          // Cerca de expirar (60 segundos o menos): verificar cada segundo
          console.log('⏱️ Configurando intervalo de 1 segundo. Segundos restantes:', currentStatus.segundosRestantes);
          interval = setInterval(() => {
            checkSessionStatus();
          }, 1000);
        } else if (currentStatus.segundosRestantes <= 300) {
          // Menos de 5 minutos: verificar cada 3 segundos (más frecuente para sesiones cortas)
          console.log('⏱️ Configurando intervalo de 3 segundos. Segundos restantes:', currentStatus.segundosRestantes);
          interval = setInterval(() => {
            checkSessionStatus();
          }, 3000);
        } else {
          // Sesión larga: verificar cada 10 segundos
          interval = setInterval(() => {
            checkSessionStatus();
          }, 10000);
        }
      }
    };

    // Configurar intervalo inicial después de un pequeño delay para tener el estado
    const initialTimeout = setTimeout(() => {
      setupCheck();
    }, 1000);

    // También configurar un intervalo que se ajuste dinámicamente cada 2 segundos
    const adjustInterval = setInterval(() => {
      setupCheck();
    }, 2000);

    return () => {
      if (interval) clearInterval(interval);
      clearInterval(adjustInterval);
      clearTimeout(initialTimeout);
    };
  }, [enabled, checkSessionStatus, sessionStatus?.segundosRestantes, sessionStatus?.sessionExpired]);

  return {
    sessionStatus,
    loading,
    error,
    refresh: checkSessionStatus
  };
};


