import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showError } from '../utils/swal';
import { apiFetch, apiUrl, openAuthenticatedBlob } from '../lib/apiClient';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Proveedor {
  id_proveedor_90: number;
  razon_social_90: string;
  activo_90?: boolean;
}

interface FilaResumen {
  codigo: string;
  descripcion: string;
  solicitado: number;
  recibido: number;
  pendiente: number;
  lineas: number;
}

interface FilaDetalle {
  fecha: string;
  numero: string;
  codigo: string;
  descripcion: string;
  solicitado: number;
  recibido: number;
  pendiente: number;
  pago: string;
  recepcion: string;
}

interface ConsultaData {
  proveedor: string;
  desde: string;
  hasta: string;
  resumen: FilaResumen[];
  detalle: FilaDetalle[];
  totales: {
    lineas: number;
    insumos: number;
    solicitado: number;
    recibido: number;
    pendiente: number;
  };
}

function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function primerDiaMesChile(): string {
  const hoy = hoyChile();
  return `${hoy.slice(0, 7)}-01`;
}

function fechaClVista(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
}

const ConsultaPedidoProveedorView: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [idProveedor, setIdProveedor] = useState('');
  const [desde, setDesde] = useState(primerDiaMesChile);
  const [hasta, setHasta] = useState(hoyChile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState<ConsultaData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(apiUrl('/proveedores-pedido'));
        const data: ApiResponse<Proveedor[]> = await res.json();
        if (data.success && Array.isArray(data.data)) setProveedores(data.data);
      } catch {
        setError('No se pudieron cargar los proveedores');
      }
    };
    void load();
  }, []);

  const proveedorOptions = useMemo(
    () =>
      [...proveedores]
        .sort((a, b) => a.razon_social_90.localeCompare(b.razon_social_90, 'es'))
        .map((p) => ({
          value: String(p.id_proveedor_90),
          label: p.activo_90 === false ? `${p.razon_social_90} (inactivo)` : p.razon_social_90,
        })),
    [proveedores]
  );

  const consultar = async () => {
    if (!idProveedor) {
      await showError('Consulta', 'Elija un proveedor del catálogo');
      return;
    }
    if (!desde || !hasta) {
      await showError('Consulta', 'Indique fecha desde y hasta');
      return;
    }
    if (hasta < desde) {
      await showError('Consulta', 'La fecha hasta no puede ser menor que desde');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        id_proveedor: idProveedor,
        desde,
        hasta,
      });
      const res = await apiFetch(apiUrl(`/pedidos/consulta-proveedor?${params.toString()}`));
      const data: ApiResponse<ConsultaData> = await res.json();
      if (!data.success || !data.data) {
        setConsulta(null);
        setError(data.error || 'No se pudo consultar');
        return;
      }
      setConsulta(data.data);
      setCurrentPage(1);
    } catch {
      setConsulta(null);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!consulta) return;
    exportToExcel(
      consulta.detalle.map((r) => ({
        Fecha: fechaClVista(r.fecha),
        Orden: r.numero,
        Código: r.codigo,
        Descripción: r.descripcion,
        Solicitado: r.solicitado,
        Recibido: r.recibido,
        Pendiente: r.pendiente,
        Pago: r.pago,
        Recepción: r.recepcion,
      })),
      `${consulta.proveedor}-${consulta.desde}-${consulta.hasta}`,
      'Detalle'
    );
  };

  const exportarPdf = async () => {
    if (!idProveedor || !desde || !hasta) {
      await showError('PDF', 'Consulte primero con proveedor y fechas');
      return;
    }
    const params = new URLSearchParams({
      id_proveedor: idProveedor,
      desde,
      hasta,
    });
    try {
      await openAuthenticatedBlob(`/pedidos/consulta-proveedor/pdf?${params.toString()}`);
    } catch {
      await showError('PDF', 'No se pudo generar el PDF');
    }
  };

  const detalle = consulta?.detalle || [];
  const totalPages = Math.max(1, Math.ceil(detalle.length / itemsPerPage));
  const pageItems = detalle.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Consulta por proveedor</h2>
        <div className="view-header-actions">
          <button type="submit" form="consulta-pedido-proveedor" className="btn-primary" disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button type="button" className="btn-info" onClick={exportarExcel} disabled={!consulta || detalle.length === 0}>
            Excel
          </button>
          <button type="button" className="btn-export" onClick={() => void exportarPdf()} disabled={!consulta}>
            PDF
          </button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <p className="form-help-text">
        Qué le pidió a un proveedor entre dos fechas. Usa el proveedor de cada línea, no el de la cabecera del PED.
        Los pedidos anulados no entran.
      </p>

      <div className="form-container">
        <form id="consulta-pedido-proveedor" onSubmit={(e) => { e.preventDefault(); void consultar(); }}>
          <div className="form-fila-tres">
            <div className="form-group">
              <label htmlFor="consulta_id_proveedor">Proveedor *</label>
              <SearchableSelect
                id="consulta_id_proveedor"
                value={idProveedor}
                onChange={setIdProveedor}
                options={proveedorOptions}
                placeholder="Buscar proveedor..."
                emptyMessage="No coincide. Elíjalo del catálogo en Pedidos → Proveedores"
                aria-label="Proveedor a consultar"
              />
            </div>
            <div className="form-group">
              <label htmlFor="consulta_desde">Desde *</label>
              <input
                id="consulta_desde"
                type="date"
                className="form-input"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="consulta_hasta">Hasta *</label>
              <input
                id="consulta_hasta"
                type="date"
                className="form-input"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </div>

      {consulta && (
        <>
          <div className="pedido-reporte-kpis" aria-label="Totales de la consulta">
            <div className="pedido-reporte-kpi">
              <span>Proveedor</span>
              <strong>{consulta.proveedor}</strong>
            </div>
            <div className="pedido-reporte-kpi">
              <span>Insumos</span>
              <strong>{consulta.totales.insumos}</strong>
            </div>
            <div className="pedido-reporte-kpi">
              <span>Solicitado</span>
              <strong>{consulta.totales.solicitado}</strong>
            </div>
            <div className="pedido-reporte-kpi">
              <span>Recibido</span>
              <strong>{consulta.totales.recibido}</strong>
            </div>
            <div className="pedido-reporte-kpi">
              <span>Pendiente</span>
              <strong>{consulta.totales.pendiente}</strong>
            </div>
          </div>

          <h3 className="pedido-reporte-titulo">Resumen por insumo</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Solicitado</th>
                  <th>Recibido</th>
                  <th>Pendiente</th>
                  <th>Líneas</th>
                </tr>
              </thead>
              <tbody>
                {consulta.resumen.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>
                      Sin solicitudes a este proveedor en el rango
                    </td>
                  </tr>
                ) : (
                  consulta.resumen.map((r) => (
                    <tr key={`${r.codigo}-${r.descripcion}`}>
                      <td>{r.codigo}</td>
                      <td>{r.descripcion}</td>
                      <td>{r.solicitado}</td>
                      <td>{r.recibido}</td>
                      <td>{r.pendiente}</td>
                      <td>{r.lineas}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="pedido-reporte-titulo">Detalle por pedido</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Orden</th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Solicitado</th>
                  <th>Recibido</th>
                  <th>Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center' }}>
                      Sin líneas
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r, i) => (
                    <tr key={`${r.numero}-${r.codigo}-${i}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fechaClVista(r.fecha)}</td>
                      <td>{r.numero}</td>
                      <td>{r.codigo}</td>
                      <td>{r.descripcion}</td>
                      <td>{r.solicitado}</td>
                      <td>{r.recibido}</td>
                      <td>{r.pendiente}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {detalle.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={detalle.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ConsultaPedidoProveedorView;
