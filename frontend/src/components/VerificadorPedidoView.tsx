import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface Fila {
  id_pedido_92: number;
  numero_orden_92?: string | null;
  fecha_pedido_92: string;
  proveedor: string;
  tipo_despacho_90?: string;
  responsable_genero?: string;
  estado_pago_92: string;
  estado_recepcion_92: string;
  total_items_solicitados?: number;
  total_items_recibidos?: number;
  estado_global_pedido?: string;
  alerta_critica?: string | null;
  pct_cumplimiento?: number | null;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const VerificadorPedidoView: React.FC = () => {
  const [rows, setRows] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [soloAlerta, setSoloAlerta] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(apiUrl('/pedidos/verificador'));
      const data: ApiResponse<Fila[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setRows(data.data);
      else setError(data.error || 'Error al cargar el verificador');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      if (soloAlerta && !r.alerta_critica) return false;
      if (!q) return true;
      return [r.numero_orden_92, r.proveedor, r.estado_global_pedido, r.alerta_critica]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, searchTerm, soloAlerta]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, soloAlerta]);

  if (loading) return <div className="loading">Cargando verificador de pedidos...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Verificador de pedidos</h2>
        <div className="header-actions">
          <button type="button" className="btn-info" onClick={fetchData}>
            Actualizar
          </button>
          <button
            type="button"
            className="btn-success"
            onClick={() =>
              exportToExcel(
                filtered.map((r) => ({
                  Orden: r.numero_orden_92,
                  Fecha: String(r.fecha_pedido_92).slice(0, 10),
                  Proveedor: r.proveedor,
                  Pago: r.estado_pago_92,
                  Recepción: r.estado_recepcion_92,
                  Global: r.estado_global_pedido,
                  '%': r.pct_cumplimiento,
                  Alerta: r.alerta_critica || '',
                })),
                'verificador-pedidos'
              )
            }
          >
            Excel
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

      <div className="filters-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Buscar orden, proveedor o estado..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar en verificador"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={soloAlerta} onChange={(e) => setSoloAlerta(e.target.checked)} />
          Solo pagado y no retirado
        </label>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Despacho</th>
              <th>Pago</th>
              <th>Recepción</th>
              <th>Global</th>
              <th>%</th>
              <th>Alerta</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center' }}>
                  Sin pedidos
                </td>
              </tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.id_pedido_92} style={r.alerta_critica ? { background: '#ffe8e8' } : undefined}>
                  <td>{r.numero_orden_92}</td>
                  <td>{String(r.fecha_pedido_92).slice(0, 10)}</td>
                  <td>{r.proveedor}</td>
                  <td>{r.tipo_despacho_90}</td>
                  <td>{r.estado_pago_92}</td>
                  <td>{r.estado_recepcion_92}</td>
                  <td>{r.estado_global_pedido}</td>
                  <td>{r.pct_cumplimiento ?? 0}</td>
                  <td>{r.alerta_critica || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
};

export default VerificadorPedidoView;
