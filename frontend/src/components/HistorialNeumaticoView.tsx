import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './HistorialNeumaticoView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { formatEnteroKm } from '../utils/formatKm';
import { showError, showSuccess } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface HistorialNeumatico {
  id_historial_34: number;
  cod_neumatico_34: string;
  kilometraje_34?: number;
  balanceo_34: boolean;
  fecha_movimiento_34: string;
  observaciones_34?: string;
  conductor_nombre?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  tecnico_nombre?: string;
}

interface Neumatico {
  id_neumatico_31: number;
  cod_neumatico_31: string;
  marca_32?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const formatFecha = (f: string) => {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
};

const API_URL = apiUrl('/historial-neumatico');
const NEUMATICOS_URL = apiUrl('/neumaticos');

const HistorialNeumaticoView: React.FC = () => {
  const [historial, setHistorial] = useState<HistorialNeumatico[]>([]);
  const [neumaticos, setNeumaticos] = useState<Neumatico[]>([]);
  const [codFiltro, setCodFiltro] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [hr, nr] = await Promise.all([fetch(API_URL), fetch(NEUMATICOS_URL)]);
        const hd: ApiResponse<HistorialNeumatico[]> = await hr.json();
        const nd: ApiResponse<Neumatico[]> = await nr.json();
        if (hd.success && Array.isArray(hd.data)) setHistorial(hd.data);
        else await showError('Consulta', hd.error || 'No se pudo cargar el historial');
        if (nd.success && Array.isArray(nd.data)) setNeumaticos(nd.data);
      } catch {
        await showError('Consulta', 'No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const neumaticoOptions = useMemo(
    () =>
      neumaticos.map((n) => ({
        value: n.cod_neumatico_31,
        label: `${n.cod_neumatico_31}${n.marca_32 ? ` - ${n.marca_32}` : ''}`,
      })),
    [neumaticos]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return historial.filter((h) => {
      if (codFiltro && h.cod_neumatico_34 !== codFiltro) return false;
      if (!q) return true;
      return [
        h.cod_neumatico_34,
        h.conductor_nombre,
        h.maquina_numinterno,
        h.maquina_ppu,
        h.tecnico_nombre,
        h.observaciones_34,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [historial, codFiltro, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [codFiltro, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    exportToExcel(
      filtered.map((h) => ({
        ID: h.id_historial_34,
        'Cód. Neumático': h.cod_neumatico_34,
        Conductor: h.conductor_nombre || '',
        Máquina: h.maquina_numinterno ? `${h.maquina_numinterno} (${h.maquina_ppu || ''})` : '',
        Kilometraje: formatEnteroKm(h.kilometraje_34),
        Técnico: h.tecnico_nombre || '',
        Balanceo: h.balanceo_34 ? 'SÍ' : 'NO',
        Fecha: formatFecha(h.fecha_movimiento_34),
        Observaciones: h.observaciones_34 || '',
      })),
      'consulta_historial_neumatico',
      'Historial'
    );
    void showSuccess('Exportación', 'La consulta se exportó a Excel.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Consulta de historial</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#17a2b8' }} onClick={handleExport} disabled={filtered.length === 0}>
            Exportar
          </button>
        </div>
      </div>

      <p className="historial-consulta-note">
        Solo lectura. Los movimientos se generan al guardar una intervención en <strong>Trazabilidad</strong>.
      </p>

      <div className="form-container">
        <div className="historial-buscadores-row">
          <div className="form-group">
            <label htmlFor="hist-cod">Neumático</label>
            <SearchableSelect
              id="hist-cod"
              value={codFiltro}
              onChange={setCodFiltro}
              options={neumaticoOptions}
              placeholder="Todos los códigos..."
              emptyMessage="Sin neumáticos"
            />
          </div>
          <div className="form-group">
            <label htmlFor="hist-q">Buscar</label>
            <input
              id="hist-q"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Folio, conductor, máquina, técnico..."
              aria-label="Buscar en el historial"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-container historial-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Neumático</th>
                <th>Fecha</th>
                <th>Máquina</th>
                <th>KM</th>
                <th>Conductor</th>
                <th>Técnico</th>
                <th>Balanceo</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    {codFiltro || searchTerm ? 'Sin movimientos para este filtro' : 'Sin movimientos'}
                  </td>
                </tr>
              ) : (
                pageItems.map((h) => (
                  <tr key={h.id_historial_34}>
                    <td className="historial-cod">{h.cod_neumatico_34}</td>
                    <td>{formatFecha(h.fecha_movimiento_34)}</td>
                    <td>{h.maquina_numinterno ? `${h.maquina_numinterno} (${h.maquina_ppu || ''})` : '—'}</td>
                    <td>{h.kilometraje_34 != null ? formatEnteroKm(h.kilometraje_34) : '—'}</td>
                    <td>{h.conductor_nombre || '—'}</td>
                    <td>{h.tecnico_nombre || '—'}</td>
                    <td>{h.balanceo_34 ? 'SÍ' : 'NO'}</td>
                    <td className="historial-obs">{h.observaciones_34 || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default HistorialNeumaticoView;
