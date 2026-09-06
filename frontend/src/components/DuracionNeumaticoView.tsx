import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './ReportesNeumaticoView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { formatEnteroKm } from '../utils/formatKm';
import { showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface FilaDuracion {
  id_neumatico_31: number;
  cod_neumatico_31: string;
  marca_32?: string;
  estado_33?: string;
  fecha_montaje?: string | null;
  km_montaje?: number | null;
  folio_montaje?: string | null;
  fecha_baja?: string | null;
  km_baja?: number | null;
  folio_baja?: string | null;
  km_duracion?: number | null;
  dias_duracion?: number | null;
  dano_codigo?: string | null;
  dano_descripcion?: string | null;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  conductor_nombre?: string;
  tecnico_nombre?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const fechaCorta = (v?: string | null) => (v ? String(v).slice(0, 10) : '—');

const DuracionNeumaticoView: React.FC = () => {
  const [filas, setFilas] = useState<FilaDuracion[]>([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [idMarca, setIdMarca] = useState('');
  const [idMaquina, setIdMaquina] = useState('');
  const [marcas, setMarcas] = useState<Array<{ id_marca_32: number; marca_32: string }>>([]);
  const [maquinas, setMaquinas] = useState<Array<{ idmaquina_11: number; numinterno_11?: string; ppu_11?: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const loadLookups = async () => {
      const [mr, mq] = await Promise.all([
        apiFetch(apiUrl('/marcas-neumatico')),
        apiFetch(apiUrl('/maquinas')),
      ]);
      const md: ApiResponse<typeof marcas> = await mr.json();
      const qd: ApiResponse<typeof maquinas> = await mq.json();
      if (md.success && Array.isArray(md.data)) setMarcas(md.data);
      if (qd.success && Array.isArray(qd.data)) setMaquinas(qd.data);
    };
    void loadLookups();
  }, []);

  const marcaOptions = useMemo(
    () => marcas.map((m) => ({ value: String(m.id_marca_32), label: m.marca_32 })),
    [marcas]
  );
  const maquinaOptions = useMemo(
    () =>
      maquinas.map((m) => ({
        value: String(m.idmaquina_11),
        label: `${m.ppu_11 || 'N/A'} - ${m.numinterno_11 || 'N/A'}`,
      })),
    [maquinas]
  );

  const consultar = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (desde) qs.set('desde', desde);
      if (hasta) qs.set('hasta', hasta);
      if (idMarca) qs.set('id_marca', idMarca);
      if (idMaquina) qs.set('id_maquina', idMaquina);
      const res = await apiFetch(apiUrl(`/reportes-neumatico/duracion${qs.toString() ? `?${qs}` : ''}`));
      const data: ApiResponse<FilaDuracion[]> = await res.json();
      if (!data.success || !Array.isArray(data.data)) {
        await showError('Reporte', data.error || 'No se pudo obtener la duración');
        return;
      }
      setFilas(data.data);
      setCurrentPage(1);
    } catch {
      await showError('Reporte', 'No se pudo obtener la duración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void consultar();
    // Primera carga sin filtros
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(filas.length / itemsPerPage));
  const pageItems = filas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportar = () => {
    exportToExcel(
      filas.map((r) => ({
        Código: r.cod_neumatico_31,
        Marca: r.marca_32 || '',
        Estado: r.estado_33 || '',
        'Folio montaje': r.folio_montaje || '',
        'Fecha montaje': fechaCorta(r.fecha_montaje),
        'KM montaje': formatEnteroKm(r.km_montaje),
        'Folio baja': r.folio_baja || '',
        'Fecha baja': fechaCorta(r.fecha_baja),
        'KM baja': formatEnteroKm(r.km_baja),
        'KM duración': r.km_duracion != null ? formatEnteroKm(r.km_duracion) : '',
        Días: r.dias_duracion ?? '',
        Daño: r.dano_codigo || '',
        Máquina: `${r.maquina_numinterno || ''} ${r.maquina_ppu || ''}`.trim(),
        Conductor: r.conductor_nombre || '',
        Técnico: r.tecnico_nombre || '',
      })),
      'duracion_neumaticos',
      'Duración'
    );
    void showSuccess('Exportación', 'El Excel de duración se descargó.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Duración de neumáticos</h2>
        <div className="reportes-neumatico-actions">
          <button type="button" className="btn-primary" onClick={() => void consultar()} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#17a2b8' }} onClick={exportar} disabled={filas.length === 0}>
            Exportar
          </button>
        </div>
      </div>

      <p className="reportes-neumatico-note">
        KM y días desde el <strong>primer montaje</strong> hasta la <strong>última baja</strong> del código. Solo incluye neumáticos dados de baja.
      </p>

      <div className="form-container">
        <div className="reportes-neumatico-filters">
          <div className="form-group">
            <label htmlFor="dur-desde">Baja desde</label>
            <input id="dur-desde" type="date" className="form-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="dur-hasta">Baja hasta</label>
            <input id="dur-hasta" type="date" className="form-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="dur-marca">Marca</label>
            <SearchableSelect id="dur-marca" value={idMarca} onChange={setIdMarca} options={marcaOptions} placeholder="Todas..." emptyMessage="Sin marcas" />
          </div>
          <div className="form-group">
            <label htmlFor="dur-maq">Máquina</label>
            <SearchableSelect id="dur-maq" value={idMaquina} onChange={setIdMaquina} options={maquinaOptions} placeholder="Todas..." emptyMessage="Sin máquinas" />
          </div>
        </div>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Marca</th>
                <th>Montaje</th>
                <th>KM montaje</th>
                <th>Baja</th>
                <th>KM baja</th>
                <th>KM duración</th>
                <th>Días</th>
                <th>Daño</th>
                <th>Máquina</th>
                <th>Conductor</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="no-data">Sin bajas en el período</td>
                </tr>
              ) : (
                pageItems.map((r) => (
                  <tr key={`${r.id_neumatico_31}-${r.folio_baja}`}>
                    <td><strong>{r.cod_neumatico_31}</strong></td>
                    <td>{r.marca_32 || '—'}</td>
                    <td>{fechaCorta(r.fecha_montaje)}</td>
                    <td>{formatEnteroKm(r.km_montaje)}</td>
                    <td>{fechaCorta(r.fecha_baja)}</td>
                    <td>{formatEnteroKm(r.km_baja)}</td>
                    <td>{r.km_duracion != null ? formatEnteroKm(r.km_duracion) : '—'}</td>
                    <td>{r.dias_duracion ?? '—'}</td>
                    <td>{r.dano_codigo || '—'}</td>
                    <td>{r.maquina_numinterno} {r.maquina_ppu}</td>
                    <td>{r.conductor_nombre || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filas.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default DuracionNeumaticoView;
