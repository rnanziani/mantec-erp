import { useState, useEffect, useCallback, useRef } from 'react';
import SessionTimeoutService from '../services/session-timeout.service';
import type { SessionTimeoutConfig } from '../config/session.config';

interface UseSessionTimeoutReturn {
  showWarning: boolean;       // true = mostrar modal de advertencia
  secondsRemaining: number;
  reactivate: () => void;
  stop: () => void;
}

export function useSessionTimeout(
  config: SessionTimeoutConfig,
  onTimeout: () => void,
  onActivity?: () => void
): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // FIX: usar ref para onTimeout para evitar recrear el servicio si cambia la referencia
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const onActivityRef = useRef(onActivity);
  useEffect(() => { onActivityRef.current = onActivity; }, [onActivity]);

  const [service] = useState(() => new SessionTimeoutService(
    config,
    () => {
      setShowWarning(false);
      setSecondsRemaining(0);
      onTimeoutRef.current();
    },
    (s) => {
      if (s <= 0) {
        setShowWarning(false);
        setSecondsRemaining(0);
      } else {
        setShowWarning(true);
        setSecondsRemaining(s);
      }
    },
    () => onActivityRef.current?.(),
    () => {
      setShowWarning(false);
      setSecondsRemaining(0);
    }
  ));

  useEffect(() => {
    service.start();
    return () => { service.stop(); };
  }, [service]);

  const reactivate = useCallback(() => {
    // FIX: actualizar estado React ANTES de llamar al servicio
    setShowWarning(false);
    setSecondsRemaining(0);
    service.reactivate();
  }, [service]);

  const stop = useCallback(() => {
    service.stop();
    setShowWarning(false);
    setSecondsRemaining(0);
  }, [service]);

  return { showWarning, secondsRemaining, reactivate, stop };
}

export default useSessionTimeout;
