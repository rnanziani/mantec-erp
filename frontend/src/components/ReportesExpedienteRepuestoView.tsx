import React, { useEffect, useState } from 'react';
import './BodegaView.css';
import './ReportesNeumaticoView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

type Tab = 'resumen' | 'garantia';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  umbralDias?: number;
}

interface PorEstado {
  estado_86: string;
  n: number;
}

interface EnProveedor {
  folio_86?: string;
  maquina_numinterno?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  proveedor_nombre?: string;
  fecha_entrega_proveedor_86?: string | null;
  dias_en_proveedor?: number | null;
}

interface Garantia {
  folio_86?: string;
  fecha_recepcion_86?: string;
  maquina_numinterno?: string;
  repuesto_nombre?: string;
  folio_anterior?: string | null;
  fecha_instalacion_anterior?: string | null;
  dias_vida?: number | null;
}

const ESTADOS: Record<string, string> = {
  MAQUINA_A_BODEGA: 'Máquina → Bodega',
  BODEGA_A_PROVEEDOR: 'Bodega → Proveedor',
  PROVEEDOR_A_BODEGA: 'Proveedor → Bodega',
  BODEGA_A_MAQUINA: 'Bodega → Máquina',
};

const fechaCorta = (v?: string | null) => (v ? String(v).slice(0, 10) : '—');

const ReportesExpedienteRepuestoView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [porEstado, setPorEstado] = useState<PorEstado[]>([]);
  const [enProveedor, setEnProveedor] = useState<EnProveedor[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [umbral, setUmbral] = useState(180);
  const [umbralAplicado, setUmbralAplicado] = useState(180);

  const cargarResumen = async () => {
    const res = await apiFetch(apiUrl('/expedientes-repuesto/resumen'));
    const data: ApiResponse<{ porEstado: PorEstado[]; enProveedor: EnProveedor[] }> = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.error || 'No se pudo cargar el resumen');
    }
    setPorEstado(data.data.porEstado || []);
    setEnProveedor(data.data.enProveedor || []);
  };

  const cargarGarantias = async (dias = umbral) => {
    const res = await apiFetch(apiUrl(`/expedientes-repuesto/garantias?dias=${dias}`));
    const data: ApiResponse<Garantia[]> = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'No se pudo cargar la garantía');
    }
    setGarantias(Array.isArray(data.data) ? data.data : []);
    setUmbralAplicado(data.umbralDias || dias);
  };

  const consultar = async (tipo: Tab = tab) => {
    try {
      setLoading(true);
      setError('');
      if (tipo === 'resumen') await cargarResumen();
      else await cargarGarantias();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void consultar('resumen');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportar = () => {
    if (tab === 'resumen') {
      exportToExcel(
        [
          ...porEstado.map((r) => ({
            Tipo: 'Conteo',
            Estado: ESTADOS[r.estado_86] || r.estado_86,
            Cantidad: Number(r.n),
          })),
          ...enProveedor.map((r) => ({
            Tipo: 'En proveedor',
            Folio: r.folio_86,
            Máquina: r.maquina_numinterno,
            Repuesto: `${r.repuesto_codigo || ''} ${r.repuesto_nombre || ''}`.trim(),
            Proveedor: r.proveedor_nombre,
            Entrega: fechaCorta(r.fecha_entrega_proveedor_86),
            Días: r.dias_en_proveedor ?? '',
          })),
        ],
        'expediente_resumen',
        'Resumen'
      );
    } else {
      exportToExcel(
        garantias.map((r) => ({
          Folio: r.folio_86,
          Máquina: r.maquina_numinterno,
          Repuesto: r.repuesto_nombre,
          Recepción: fechaCorta(r.fecha_recepcion_86),
          'Folio anterior': r.folio_anterior,
          'Instalación anterior': fechaCorta(r.fecha_instalacion_anterior),
          'Días de vida': r.dias_vida ?? '',
        })),
        'expediente_garantia',
        'Garantía'
      );
    }
    void showSuccess('Exportación', 'El Excel se descargó.');
  };

  const conteo = (estado: string) =>
    Number(porEstado.find((r) => r.estado_86 === estado)?.n || 0);

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Reportes / garantía del expediente</h2>
        <div className="reportes-neumatico-actions">
          <button type="button" className="btn-primary" onClick={() => void consultar()} disabled={loading}>
            Consultar
          </button>
          <button type="button" className="btn-secondary" onClick={exportar} disabled={loading}>
            Excel
          </button>
        </div>
      </div>

      <p className="reportes-neumatico-note">
        Un expediente = un viaje. La garantía compara un daño nuevo con la última instalación cerrada
        del mismo tipo en esa máquina (no reabre la fila anterior).
      </p>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div className="reportes-neumatico-tabs" role="tablist" aria-label="Tipo de reporte">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'resumen'}
          className={`reportes-neumatico-tab${tab === 'resumen' ? ' is-active' : ''}`}
          onClick={() => { setTab('resumen'); void consultar('resumen'); }}
        >
          Dónde está cada pieza
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'garantia'}
          className={`reportes-neumatico-tab${tab === 'garantia' ? ' is-active' : ''}`}
          onClick={() => { setTab('garantia'); void consultar('garantia'); }}
        >
          Candidatos a garantía
        </button>
      </div>

      {tab === 'resumen' && (
        <>
          <div className="table-container" style={{ marginBottom: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Expedientes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2}>Cargando...</td></tr>
                ) : (
                  Object.entries(ESTADOS).map(([value, label]) => (
                    <tr key={value}>
                      <td>{label}</td>
                      <td>{conteo(value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="reportes-neumatico-section-title">Ahora en proveedor</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Máquina</th>
                  <th>Repuesto</th>
                  <th>Proveedor</th>
                  <th>Entrega</th>
                  <th>Días</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}>Cargando...</td></tr>
                ) : enProveedor.length === 0 ? (
                  <tr><td colSpan={6}>No hay expedientes en Bodega → Proveedor.</td></tr>
                ) : (
                  enProveedor.map((r) => (
                    <tr key={r.folio_86}>
                      <td>{r.folio_86}</td>
                      <td>{r.maquina_numinterno}</td>
                      <td>{r.repuesto_codigo ? `${r.repuesto_codigo} — ` : ''}{r.repuesto_nombre}</td>
                      <td>{r.proveedor_nombre || '—'}</td>
                      <td>{fechaCorta(r.fecha_entrega_proveedor_86)}</td>
                      <td>{r.dias_en_proveedor ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'garantia' && (
        <>
          <div className="reportes-neumatico-filters" style={{ gridTemplateColumns: '200px auto' }}>
            <div className="form-group">
              <label htmlFor="umbral-dias">Umbral (días)</label>
              <input
                id="umbral-dias"
                className="form-input"
                type="number"
                min={1}
                value={umbral}
                onChange={(e) => setUmbral(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <p className="reportes-neumatico-note" style={{ margin: 0, alignSelf: 'end' }}>
              Daños que vuelven antes de {umbralAplicado} días desde la última instalación cerrada.
            </p>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Folio nuevo</th>
                  <th>Máquina</th>
                  <th>Repuesto</th>
                  <th>Recepción</th>
                  <th>Folio anterior</th>
                  <th>Instalación anterior</th>
                  <th>Días de vida</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Cargando...</td></tr>
                ) : garantias.length === 0 ? (
                  <tr><td colSpan={7}>No hay candidatos bajo ese umbral.</td></tr>
                ) : (
                  garantias.map((r) => (
                    <tr key={`${r.folio_86}-${r.folio_anterior}`}>
                      <td>{r.folio_86}</td>
                      <td>{r.maquina_numinterno}</td>
                      <td>{r.repuesto_nombre}</td>
                      <td>{fechaCorta(r.fecha_recepcion_86)}</td>
                      <td>{r.folio_anterior || '—'}</td>
                      <td>{fechaCorta(r.fecha_instalacion_anterior)}</td>
                      <td>{r.dias_vida ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportesExpedienteRepuestoView;
