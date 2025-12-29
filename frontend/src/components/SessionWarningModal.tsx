import React, { useEffect, useState } from 'react';
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
          <div className="session-warning-icon-orange">
            <span className="session-warning-exclamation">!</span>
          </div>
        </div>
        <div className="session-warning-message">
          <h2>Su sesión será finalizada</h2>
          <p className="session-warning-countdown">en {segundos} Segundos</p>
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
