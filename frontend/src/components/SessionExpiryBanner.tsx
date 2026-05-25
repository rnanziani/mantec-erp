import React from 'react';

interface Props {
  minutosRestantes: number;
  segundosRestantes: number;
  onExtend: () => void;
  onLogout: () => void;
}

/** Banner superior: avisa antes de que expire la sesión */
const SessionExpiryBanner: React.FC<Props> = ({
  minutosRestantes,
  segundosRestantes,
  onExtend,
  onLogout,
}) => {
  const totalSec = minutosRestantes * 60 + segundosRestantes;
  const label =
    totalSec <= 60
      ? `Su sesión expira en ${Math.max(0, totalSec)} segundos`
      : `Su sesión expira en ${minutosRestantes} min ${segundosRestantes % 60} seg`;

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #f59e0b, #d97706)',
        color: '#1f2937',
        padding: '0.65rem 1rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontSize: '0.95rem',
      }}
    >
      <span>
        <strong>⚠️ {label}.</strong> Guarde su trabajo ahora o extienda la sesión.
      </span>
      <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="session-warning-btn-reactivate"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
          onClick={onExtend}
        >
          Extender sesión
        </button>
        <button
          type="button"
          className="session-warning-btn-logout"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
          onClick={onLogout}
        >
          Cerrar sesión
        </button>
      </span>
    </div>
  );
};

export default SessionExpiryBanner;
