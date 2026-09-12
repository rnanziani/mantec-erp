import React, { useEffect, useRef, useState } from 'react';
import { apiFetch, apiUrl, openAuthenticatedBlob } from '../lib/apiClient';
import { showError } from '../utils/swal';
import './AsignacionPrendasView.css';
import './ActaEntregaCargoModal.css';

interface ActaHerramienta {
  codigo: string;
  nombre: string;
  marca: string;
  serie: string;
  cantidad: number;
  valorFmt: string;
}

interface ActaEntregaCargo {
  codigoDoc: string;
  versionDoc: string;
  titulo: string;
  folio: string;
  intro: { dia: number; mes: string; anio: number };
  empresaLegal: { nombre: string; rut: string };
  trabajador: { nombre: string; rut: string; cargo: string; ccosto: string };
  fechaEntrega: string;
  herramientas: ActaHerramienta[];
  observacion: string | null;
  declaraciones: {
    intro: string;
    compromisos: string[];
    cierre: string;
  };
  firmas: {
    trabajadorNombre: string;
    trabajadorRut: string;
    encargadoNombre: string;
    encargadoRut: string;
  };
}

interface ActaEntregaCargoModalProps {
  entregaId: number | null;
  onClose: () => void;
}

const ActaEntregaCargoModal: React.FC<ActaEntregaCargoModalProps> = ({ entregaId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [acta, setActa] = useState<ActaEntregaCargo | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (entregaId == null) {
      setActa(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setActa(null);
      try {
        const res = await apiFetch(apiUrl(`/entregas-cargo/${entregaId}/acta-datos`));
        const data: { success?: boolean; data?: ActaEntregaCargo; error?: string } = await res.json();
        if (cancelled) return;
        if (data.success && data.data) {
          setActa(data.data);
        } else {
          await showError('Error', data.error || 'No se pudieron cargar los datos del acta');
          onCloseRef.current();
        }
      } catch {
        if (cancelled) return;
        await showError('Error', 'Error de conexión al cargar el acta');
        onCloseRef.current();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [entregaId]);

  useEffect(() => {
    if (entregaId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entregaId]);

  if (entregaId == null) return null;

  return (
    <div
      className="acta-cargo-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acta-cargo-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="acta-cargo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acta-cargo-toolbar acta-cargo-no-print">
          <h3 id="acta-cargo-title">Vista previa — Anexo de entrega de herramientas</h3>
          <div className="acta-cargo-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.print()}
              disabled={!acta}
              style={{ backgroundColor: '#007bff' }}
            >
              Imprimir
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                openAuthenticatedBlob(`/entregas-cargo/${entregaId}/acta-pdf`).catch((err) =>
                  showError('PDF', err instanceof Error ? err.message : 'No se pudo generar el PDF')
                );
              }}
              disabled={!acta}
              style={{ backgroundColor: '#28a745' }}
            >
              Generar PDF
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="acta-cargo-content">
          {loading ? (
            <div className="acta-cargo-loading">Cargando registro...</div>
          ) : acta ? (
            <article className="uniforme-document">
              <p className="uniforme-doc-code" aria-label="Código del documento">
                {acta.codigoDoc}
                <br />
                Versión {acta.versionDoc}
              </p>

              <header className="acta-cargo-header">
                <img
                  className="acta-cargo-logo"
                  src="/acta-epp/logo-transantin.svg"
                  alt="Logo TranSantin"
                />
                <h2>{acta.titulo}</h2>
              </header>

              <p className="uniforme-doc-intro">
                A <strong>{acta.intro.dia}</strong> de <strong>{acta.intro.mes}</strong> de{' '}
                <strong>{acta.intro.anio}</strong>, la <strong>{acta.empresaLegal.nombre}</strong>,
                Rut <strong>{acta.empresaLegal.rut}</strong> hace entrega de las siguientes
                herramientas y/o equipos de trabajo para el desempeño de sus funciones laborales a
                Don(ña) <strong>{acta.trabajador.nombre || '—'}</strong>, cédula de identidad{' '}
                <strong>{acta.trabajador.rut || '—'}</strong>.
              </p>

              <h3 className="uniforme-section-title">Datos del Trabajador</h3>
              <table className="uniforme-worker-table" aria-label="Datos del trabajador">
                <tbody>
                  <tr>
                    <th scope="row">Nombre</th>
                    <td>{acta.trabajador.nombre}</td>
                    <th scope="row">Cargo</th>
                    <td>{acta.trabajador.cargo || '—'}</td>
                  </tr>
                  <tr>
                    <th scope="row">RUT</th>
                    <td>{acta.trabajador.rut || '—'}</td>
                    <th scope="row">CCosto</th>
                    <td>{acta.trabajador.ccosto || '—'}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="uniforme-section-title">Detalle de las herramientas de trabajo</h3>
              <table
                className="uniforme-items-table"
                aria-label="Herramientas entregadas"
              >
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '48px' }}>Nº</th>
                    <th scope="col">Herramienta / equipo</th>
                    <th scope="col" style={{ width: '90px' }}>Marca</th>
                    <th scope="col" style={{ width: '60px' }}>Cant.</th>
                    <th scope="col" style={{ width: '90px' }}>Valor</th>
                    <th scope="col" style={{ width: '110px' }}>Fecha de Entrega (DD/MM/AA)</th>
                  </tr>
                </thead>
                <tbody>
                  {acta.herramientas.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Sin herramientas</td>
                    </tr>
                  ) : (
                    acta.herramientas.map((h, i) => (
                      <tr key={`${h.codigo}-${i}`}>
                        <td>{String(i + 1).padStart(2, '0')}</td>
                        <td className="uniforme-item-name">
                          {h.nombre}
                          {h.serie ? ` — Serie ${h.serie}` : ''}
                        </td>
                        <td>{h.marca || '—'}</td>
                        <td>{h.cantidad}</td>
                        <td>{h.valorFmt}</td>
                        <td>{acta.fechaEntrega}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {acta.observacion ? (
                <p className="uniforme-lead">Observaciones: {acta.observacion}</p>
              ) : null}

              <h3 className="uniforme-section-title">Declaraciones del trabajador</h3>
              <p className="uniforme-lead">{acta.declaraciones.intro}</p>
              <ol className="acta-cargo-ol">
                {acta.declaraciones.compromisos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <p className="uniforme-declaration">{acta.declaraciones.cierre}</p>

              <div className="uniforme-firma-digital" aria-label="Firma digital">
                <p className="uniforme-firma-digital-title">Firmado digitalmente por:</p>
                <p>
                  Trabajador: {acta.firmas.trabajadorNombre || '—'}, cédula de identidad{' '}
                  {acta.firmas.trabajadorRut || '—'}
                </p>
                <p>
                  Encargado de Bodega: {acta.firmas.encargadoNombre}, cédula de identidad{' '}
                  {acta.firmas.encargadoRut}
                </p>
                <p className="uniforme-footer" style={{ border: 'none', paddingTop: 8, textAlign: 'left' }}>
                  Folio: {acta.folio}
                </p>
              </div>

              <footer className="uniforme-footer">
                {acta.codigoDoc} · Versión {acta.versionDoc}
              </footer>
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ActaEntregaCargoModal;
