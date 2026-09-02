import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { filtrarTrabajadoresPorApellido } from '../utils/trabajadorSearch';
import { showError } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface InventarioRow {
  idtrabajador_06: number;
  trabajador_nombre: string;
  trabajador_rut?: string;
  identrega_67: number;
  folio_67?: string | null;
  iddetalle_68: number;
  idherramienta_66: number;
  codigo_66: string;
  nombre_66: string;
  cantidad_asignada: number;
  cantidad_devuelta: number;
  cantidad_pendiente: number;
  fecha_entrega: string;
  ccosto_nombre: string;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06?: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const InventarioCargoView: React.FC = () => {
  const [rows, setRows] = useState<InventarioRow[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [idTrabajador, setIdTrabajador] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchData = async (trabajadorId?: string) => {
    try {
      setLoading(true);
      setError('');
      const qs = trabajadorId ? `?idtrabajador=${trabajadorId}` : '';
      const [iRes, tRes] = await Promise.all([
        apiFetch(apiUrl(`/entregas-cargo/inventario-vigente${qs}`)),
        apiFetch(apiUrl('/trabajadores')),
      ]);
      const iData: ApiResponse<InventarioRow[]> = await iRes.json();
      const tData: ApiResponse<Trabajador[]> = await tRes.json();
      if (iData.success && Array.isArray(iData.data)) setRows(iData.data);
      else setError(iData.error || 'Error al cargar inventario');
      if (tData.success && Array.isArray(tData.data)) setTrabajadores(tData.data);
    } catch {
      setError('Error de conexión con el servidor');
      await showError('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const trabajadorOptions = useMemo(
    () =>
      filtrarTrabajadoresPorApellido(trabajadores, '').map((t) => ({
        value: String(t.idtrabajador_06),
        label:
          `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06}`.trim() +
          (t.ruttrabajador_06 ? ` — ${t.ruttrabajador_06}` : ''),
      })),
    [trabajadores]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.trabajador_nombre.toLowerCase().includes(q) ||
        (r.trabajador_rut || '').toLowerCase().includes(q) ||
        r.codigo_66.toLowerCase().includes(q) ||
        r.nombre_66.toLowerCase().includes(q) ||
        (r.folio_67 || '').toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, idTrabajador]);

  const handleExport = () => {
    exportToExcel(
      filtered.map((r) => ({
        Trabajador: r.trabajador_nombre,
        RUT: r.trabajador_rut || '',
        Folio: r.folio_67 || '',
        Fecha: String(r.fecha_entrega).slice(0, 10),
        CCosto: r.ccosto_nombre,
        Código: r.codigo_66,
        Herramienta: r.nombre_66,
        Asignada: r.cantidad_asignada,
        Devuelta: r.cantidad_devuelta,
        Pendiente: r.cantidad_pendiente,
      })),
      'inventario-herramienta-cargo'
    );
  };

  if (loading) return <div className="loading">Cargando inventario vigente...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Herramientas a cargo — Inventario vigente</h2>
        <div className="header-actions">
          <button type="button" className="btn-info" onClick={handleExport}>Excel</button>
          <button type="button" className="btn-secondary" onClick={() => fetchData(idTrabajador || undefined)}>
            Actualizar
          </button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group" style={{ minWidth: 280, margin: 0 }}>
          <label htmlFor="filtro-trab">Trabajador</label>
          <SearchableSelect
            id="filtro-trab"
            value={idTrabajador}
            onChange={(v) => {
              setIdTrabajador(v);
              fetchData(v || undefined);
            }}
            options={[{ value: '', label: 'Todos' }, ...trabajadorOptions]}
            placeholder="Todos los trabajadores..."
            aria-label="Filtrar por trabajador"
          />
        </div>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar en resultados..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar inventario"
        />
      </div>

      <p style={{ marginBottom: 8, color: '#4b5563' }}>
        Solo herramientas con cargo activo o parcial (cantidad pendiente &gt; 0).
      </p>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>RUT</th>
              <th>Folio</th>
              <th>Fecha</th>
              <th>CCosto</th>
              <th>Código</th>
              <th>Herramienta</th>
              <th>Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={8}>Sin cargo vigente</td></tr>
            ) : (
              pageItems.map((r) => (
                <tr key={`${r.iddetalle_68}-${r.idherramienta_66}`}>
                  <td>{r.trabajador_nombre}</td>
                  <td>{r.trabajador_rut || '—'}</td>
                  <td>{r.folio_67 || r.identrega_67}</td>
                  <td>{String(r.fecha_entrega).slice(0, 10)}</td>
                  <td>{r.ccosto_nombre}</td>
                  <td>{r.codigo_66}</td>
                  <td>{r.nombre_66}</td>
                  <td>{r.cantidad_pendiente}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default InventarioCargoView;
