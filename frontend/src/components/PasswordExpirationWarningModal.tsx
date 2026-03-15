import React from 'react';
import './PasswordExpirationWarningModal.css';

interface Props {
  diasRestantes: number;
  onCambiarPassword: () => void;
  onCerrar: () => void;
}

const DIAS_AVISO = 5;

const PasswordExpirationWarningModal: React.FC<Props> = ({
  diasRestantes,
  onCambiarPassword,
  onCerrar
}) => {
  const mensaje =
    diasRestantes <= 0
      ? 'Su contraseña ha expirado. Debe cambiarla para continuar.'
      : diasRestantes <= DIAS_AVISO
        ? `Su contraseña caducará en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}. Le recomendamos cambiarla pronto.`
        : null;

  if (!mensaje) return null;

  return (
    <div className="password-expiration-overlay" role="dialog" aria-labelledby="password-expiration-title">
      <div className="password-expiration-modal">
        <div className="password-expiration-icon">⚠️</div>
        <h2 id="password-expiration-title">Aviso de contraseña</h2>
        <p className="password-expiration-message">{mensaje}</p>
        <div className="password-expiration-actions">
          <button
            type="button"
            className="password-expiration-btn-primary"
            onClick={onCambiarPassword}
          >
            🔑 Cambiar contraseña ahora
          </button>
          {diasRestantes > 0 && (
            <button
              type="button"
              className="password-expiration-btn-secondary"
              onClick={onCerrar}
            >
              Recordar más tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordExpirationWarningModal;
