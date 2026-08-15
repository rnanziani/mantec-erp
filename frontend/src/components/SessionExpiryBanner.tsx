import React, { useCallback, useEffect, useRef, useState } from 'react';
import './SessionExpiryBanner.css';

interface Props {
  minutosRestantes: number;
  segundosRestantes: number;
  onExtend: () => void;
  onLogout: () => void;
}

type Pos = { x: number; y: number };

const STORAGE_KEY = 'mantec-session-banner-pos';

function loadPos(): Pos | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function clampPos(x: number, y: number, width: number, height: number): Pos {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

/** Aviso compacto y arrastrable: no tapa la barra de acciones */
const SessionExpiryBanner: React.FC<Props> = ({
  minutosRestantes,
  segundosRestantes,
  onExtend,
  onLogout,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<Pos | null>(() => loadPos());

  const totalSec = minutosRestantes * 60 + segundosRestantes;
  const mm = String(minutosRestantes).padStart(2, '0');
  const ss = String(segundosRestantes % 60).padStart(2, '0');
  const label =
    totalSec <= 60
      ? `Expira en ${Math.max(0, totalSec)}s`
      : `Expira en ${mm}:${ss}`;

  /** Posición por defecto: abajo a la derecha (no cubre + Nuevo / Guardar / etc.) */
  useEffect(() => {
    if (pos || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setPos(
      clampPos(
        window.innerWidth - rect.width - 16,
        window.innerHeight - rect.height - 16,
        rect.width,
        rect.height
      )
    );
  }, [pos]);

  useEffect(() => {
    if (!pos) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setPos(
        clampPos(
          e.clientX - dragOffset.current.x,
          e.clientY - dragOffset.current.y,
          rect.width,
          rect.height
        )
      );
    },
    [dragging]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    setDragging(false);
    try {
      panelRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        if (!prev || !panelRef.current) return prev;
        const rect = panelRef.current.getBoundingClientRect();
        return clampPos(prev.x, prev.y, rect.width, rect.height);
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      ref={panelRef}
      role="status"
      aria-live="polite"
      className={`session-expiry-banner${dragging ? ' is-dragging' : ''}`}
      style={
        pos
          ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
          : { right: 16, bottom: 16, left: 'auto', top: 'auto' }
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="session-expiry-banner-drag" title="Arrastrar aviso" aria-hidden="true">
        ⋮⋮
      </div>
      <div className="session-expiry-banner-body">
        <p className="session-expiry-banner-text">
          <span className="session-expiry-banner-label">{label}</span>
          <span className="session-expiry-banner-hint">Guarde o extienda</span>
        </p>
        <div className="session-expiry-banner-actions">
          <button
            type="button"
            className="session-warning-btn-reactivate session-expiry-banner-btn"
            onClick={onExtend}
          >
            Extender
          </button>
          <button
            type="button"
            className="session-warning-btn-logout session-expiry-banner-btn"
            onClick={onLogout}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiryBanner;
