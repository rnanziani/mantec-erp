import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface Fila {
  id_bitacora_96: number;
  patente_95: string;
  vehiculo?: string;
  conductor?: string;
  rut_conductor?: string;
  autoriza_salida?: string;
  responsable_entrega?: string | null;
  responsable_recepcion?: string | null;
  motivo_salida_96?: string | null;
  destino_96?: string | null;
  fecha_hora_salida_96: string;
  fecha_hora_regreso_96?: string | null;
  estado_bitacora_96: string;
  km_salida?: number | null;
  comb_salida?: string | null;
  km_regreso?: number | null;
  comb_regreso?: string | null;
  km_recorridos?: number | null;
  alerta_flota?: string | null;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const VerificadorFlotaView: React.FC = () => {
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
      const res = await apiFetch(apiUrl('/bitacoras-viaje/verificador'));
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
      if (soloAlerta && (r.alerta_flota === 'OK' || !r.alerta_flota)) return false;
      if (!q) return true;
      return [r.patente_95, r.vehiculo, r.conductor, r.destino_96, r.estado_bitacora_96, r.alerta_flota]
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

  if (loading) return <div className="loading">Cargando verificador de flota...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Verificador de flota</h2>
        <div className="header-actions">
          <button type="button" className="btn-info" onClick={fetchData}>Actualizar</button>
          <button
            type="button"
            className="btn-success"
            onClick={() =>
              exportToExcel(
                filtered.map((r) => ({
                  Patente: r.patente_95,
                  Vehículo: r.vehiculo,
                  Conductor: r.conductor,
                  Destino: r.destino_96,
                  Estado: r.estado_bitacora_96,
                  'Km salida': r.km_salida,
                  'Km regreso': r.km_regreso,
                  Recorridos: r.km_recorridos,
                  Entrega: r.responsable_entrega,
                  Recepción: r.responsable_recepcion,
                  Alerta: r.alerta_flota,
                })),
                'verificador-flota'
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
        <div className="error-message" role="alert">{error}</div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, minWidth: 220, textTransform: 'uppercase' }}
          placeholder="Buscar patente, conductor, destino..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar en verificador de flota"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={soloAlerta} onChange={(e) => setSoloAlerta(e.target.checked)} />
          Solo alertas (daño nuevo / viaje excedido)
        </label>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Conductor</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Km sal.</th>
              <th>Km reg.</th>
              <th>Recorridos</th>
              <th>Entrega</th>
              <th>Recepción</th>
              <th>Alerta</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center' }}>Sin viajes</td>
              </tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.id_bitacora_96} style={r.alerta_flota && r.alerta_flota !== 'OK' ? { background: '#ffe8e8' } : undefined}>
                  <td>{r.patente_95}</td>
                  <td>{r.conductor}</td>
                  <td>{r.destino_96 || '—'}</td>
                  <td>{r.estado_bitacora_96}</td>
                  <td>{r.km_salida ?? '—'}</td>
                  <td>{r.km_regreso ?? '—'}</td>
                  <td>{r.km_recorridos ?? '—'}</td>
                  <td>{r.responsable_entrega || '—'}</td>
                  <td>{r.responsable_recepcion || '—'}</td>
                  <td>{r.alerta_flota || 'OK'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
    </div>
  );
};

export default VerificadorFlotaView;
