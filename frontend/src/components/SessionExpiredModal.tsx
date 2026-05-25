import React from 'react';
import './SessionWarningModal.css';

interface Props {
  message: string;
  onLogin: () => void;
}

/** Modal bloqueante: sesión expirada — evita seguir cargando datos */
const SessionExpiredModal: React.FC<Props> = ({ message, onLogin }) => (
  <div className="session-warning-overlay" role="alertdialog" aria-modal="true" aria-labelledby="session-expired-title">
    <div className="session-warning-modal">
      <div className="session-warning-icon-container">
        <span style={{ fontSize: '3rem' }} aria-hidden="true">
          ⏱️
        </span>
      </div>
      <div className="session-warning-message">
        <h2 id="session-expired-title">Sesión expirada</h2>
        <p className="session-warning-countdown">{message}</p>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.75rem' }}>
          Los datos que no se hayan guardado se perderán. Vuelva a iniciar sesión para continuar.
        </p>
      </div>
      <div className="session-warning-actions">
        <button type="button" className="session-warning-btn-reactivate" onClick={onLogin}>
          IR AL LOGIN
        </button>
      </div>
    </div>
  </div>
);

export default SessionExpiredModal;
