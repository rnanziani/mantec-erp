import React, { useEffect, useState } from 'react';
import './SessionWarningModal.css';

interface SessionWarningModalProps {
  minutosRestantes: number;
  segundosRestantes: number;
  onExtendSession: () => void;
  onLogout: () => void;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  minutosRestantes,
  segundosRestantes,
  onExtendSession,
  onLogout
}) => {
  const [timeLeft, setTimeLeft] = useState({ minutos: minutosRestantes, segundos: segundosRestantes });

  useEffect(() => {
    setTimeLeft({ minutos: minutosRestantes, segundos: segundosRestantes });
  }, [minutosRestantes, segundosRestantes]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.segundos > 0) {
          return { ...prev, segundos: prev.segundos - 1 };
        } else if (prev.minutos > 0) {
          return { minutos: prev.minutos - 1, segundos: 59 };
        }
        return { minutos: 0, segundos: 0 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const tiempoFormateado = `${timeLeft.minutos.toString().padStart(2, '0')}:${timeLeft.segundos.toString().padStart(2, '0')}`;

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-header">
          <h2>⚠️ Tu sesión está por expirar</h2>
        </div>
        <div className="session-warning-content">
          <p>
            Tu sesión expirará en <strong className="time-remaining">{tiempoFormateado}</strong>
          </p>
          <p className="warning-message">
            Para continuar trabajando, haz clic en "Extender Sesión". 
            De lo contrario, serás redirigido al inicio de sesión.
          </p>
        </div>
        <div className="session-warning-actions">
          <button 
            onClick={onExtendSession}
            className="btn btn-primary btn-extend"
          >
            🔄 Extender Sesión
          </button>
          <button 
            onClick={onLogout}
            className="btn btn-secondary btn-logout"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;


