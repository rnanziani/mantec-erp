import React, { useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import './SessionTopBar.css';

type Props = {
  segundosRestantes: number;
};

const SessionTopBar: React.FC<Props> = ({ segundosRestantes }) => {
  const { showToast } = useToast();
  const total = Math.max(1, segundosRestantes); // dinámico según SESSION_TIMEOUT_SECONDS
  const clamped = Math.max(0, Math.min(total, segundosRestantes));
  const pct = useMemo(() => (clamped / total) * 100, [clamped]);
  const widthStyle = { width: `${pct}%` };

  /* TEMPORAL - Eliminar tras verificar que el contador funciona */
  useEffect(() => {
    showToast(
      `Contador regresivo iniciado (${clamped}s restantes) - Verificación de funcionamiento. Eliminar este mensaje tras comprobar.`,
      'info',
      8000
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="session-topbar">
      {/* TEMPORAL - Eliminar tras verificar */}
      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>
        VERIFICACIÓN: Contador iniciado ({clamped}s)
      </div>
      <div className="session-topbar-track">
        <div className="session-topbar-fill" style={widthStyle} />
      </div>
      <div className="session-topbar-text">{clamped}s</div>
    </div>
  );
};

export default SessionTopBar;

