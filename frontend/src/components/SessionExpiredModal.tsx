import React from 'react';
import './SessionExpiredModal.css';

interface SessionExpiredModalProps {
  onReLogin: () => void;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ onReLogin }) => {
  return (
    <div className="session-expired-overlay">
      <div className="session-expired-modal">
        <div className="session-expired-icon-container">
          <div className="session-expired-icon-blue">
            <span className="session-expired-info">i</span>
          </div>
        </div>
        <div className="session-expired-message">
          <h2>Sesión Finalizada</h2>
          <p>Por su seguridad, la sesión fue finalizada.</p>
          <p>Si desea continuar, debe volver a ingresar.</p>
        </div>
        <div className="session-expired-actions">
          <button 
            className="session-expired-btn-relogin" 
            onClick={onReLogin}
          >
            REINGRESAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;


