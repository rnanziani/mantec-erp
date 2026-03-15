import React, { useCallback } from 'react';
import type { SessionTimeoutConfig } from '../config/session.config';
import useSessionTimeout from '../hooks/useSessionTimeout';
import './SessionWarningModal.css';

interface Props {
  config: SessionTimeoutConfig;
  onExtend: () => Promise<boolean>;
  onLogout: () => void;
  onActivity?: () => void;
}

const SessionInactivityModal: React.FC<Props> = ({ config, onExtend, onLogout, onActivity }) => {
  // FIX: renombrado isActive → showWarning para semántica clara
  const { showWarning, secondsRemaining, reactivate, stop } = useSessionTimeout(
    config,
    onLogout,
    onActivity
  );

  const handleReactivate = useCallback(() => {
    // FIX: primero reactivar el servicio (oculta modal vía estado),
    // luego llamar al backend. Sin requestAnimationFrame ni forceClosed.
    reactivate();
    onExtend().catch(() => {
      // Si el backend falla, no forzar logout aquí — el servicio
      // seguirá monitoreando y el usuario puede seguir trabajando.
      console.warn('No se pudo extender la sesión en el backend');
    });
  }, [reactivate, onExtend]);

  const handleLogout = useCallback(() => {
    stop();
    onLogout();
  }, [stop, onLogout]);

  // FIX: condición simple — sin forceClosed ni estado extra
  if (!showWarning) return null;

  const seconds = Math.max(0, secondsRemaining);

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-icon-container">
          <div className="session-ring-wrapper">
            <svg className="session-ring" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="ringGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
              <circle className="ring-bg" cx="60" cy="60" r="52" />
              <text x="60" y="67" textAnchor="middle" className="ring-text">
                {seconds}s
              </text>
            </svg>
          </div>
        </div>

        <div className="session-warning-message">
          <h2>Su sesión será finalizada</h2>
          <p className="session-warning-countdown">
            {seconds > 0
              ? `Reactivar ahora o será desconectado en ${seconds}s`
              : 'Cerrando sesión...'}
          </p>
        </div>

        <div className="session-warning-actions">
          <button
            type="button"
            className="session-warning-btn-logout"
            onClick={handleLogout}
          >
            CERRAR SESIÓN
          </button>
          <button
            type="button"
            className="session-warning-btn-reactivate"
            onClick={handleReactivate}
          >
            REACTIVAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionInactivityModal;
