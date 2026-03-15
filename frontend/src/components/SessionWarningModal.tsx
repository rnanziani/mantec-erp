import React, { useEffect, useMemo, useState } from 'react';
import './SessionWarningModal.css';

interface SessionWarningModalProps {
  segundosRestantes: number;
  onExtend: () => void;
  onLogout: () => void;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  segundosRestantes,
  onExtend,
  onLogout
}) => {
  const [segundos, setSegundos] = useState(segundosRestantes);
  const [total] = useState(() => Math.max(1, segundosRestantes)); // fijar al montar según SESSION_TIMEOUT_SECONDS
  const progress = useMemo(() => {
    const clamp = Math.max(0, Math.min(total, segundos));
    return total > 0 ? (clamp / total) * 100 : 0;
  }, [segundos, total]);

  useEffect(() => {
    setSegundos(segundosRestantes);
  }, [segundosRestantes]);

  useEffect(() => {
    if (segundos <= 0) {
      onLogout();
      return;
    }

    const interval = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [segundos, onLogout]);

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-icon-container">
          <div className="session-ring-wrapper">
            <svg className="session-ring" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF8A00" />
                  <stop offset="100%" stopColor="#FF3D00" />
                </linearGradient>
              </defs>
              <circle className="ring-bg" cx="60" cy="60" r="52" />
              <circle
                className="ring-fg"
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={`${(2 * Math.PI * 52).toFixed(2)}`}
                strokeDashoffset={`${(((100 - progress) / 100) * 2 * Math.PI * 52).toFixed(2)}`}
              />
              <text x="60" y="67" textAnchor="middle" className="ring-text">
                {segundos}s
              </text>
            </svg>
          </div>
        </div>
        <div className="session-warning-message">
          <h2>Su sesión será finalizada</h2>
          <p className="session-warning-countdown">Reactivar ahora o será desconectado</p>
          {/* TEMPORAL - Eliminar tras verificar que el contador funciona */}
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.85 }}>
            [Verificación: contador en {segundos}s]
          </p>
        </div>
        <div className="session-warning-actions">
          <button 
            className="session-warning-btn-logout" 
            onClick={onLogout}
          >
            CERRAR SESIÓN
          </button>
          <button 
            className="session-warning-btn-reactivate" 
            onClick={onExtend}
          >
            REACTIVAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;
