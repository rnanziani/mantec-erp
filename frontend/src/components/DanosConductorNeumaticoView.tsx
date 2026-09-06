import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './ReportesNeumaticoView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

type Tab = 'neumatico' | 'llanta';

interface Resumen {
  idconductor_76: number;
  conductor_nombre: string;
  ruttrabajador_06?: string;
  dano_codigo: string;
  dano_descripcion?: string;
  cantidad: number;
  maquinas: number;
}

interface DetalleNeu {
  folio_76: string;
  fecha_76: string;
  cod_neumatico_31: string;
  marca_32?: string;
  dano_codigo: string;
  dano_descripcion?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  conductor_nombre: string;
  tecnico_nombre?: string;
}

interface DetalleLla {
  folio_76: string;
  fecha_76: string;
  llanta: string;
  dano_codigo: string;
  dano_descripcion?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  conductor_nombre: string;
  tecnico_nombre?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const fechaCorta = (v?: string) => (v ? String(v).slice(0, 10) : '—');

const DanosConductorNeumaticoView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('neumatico');
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [detalleNeu, setDetalleNeu] = useState<DetalleNeu[]>([]);
  const [detalleLla, setDetalleLla] = useState<DetalleLla[]>([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [idConductor, setIdConductor] = useState('');
  const [trabajadores, setTrabajadores] = useState<Array<{
    idtrabajador_06: number;
    nombre_06: string;
    apaterno_06?: string;
    amaterno_06?: string;
    ruttrabajador_06?: string;
  }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch(apiUrl('/trabajadores'));
      const data: ApiResponse<typeof trabajadores> = await res.json();
      if (data.success && Array.isArray(data.data)) setTrabajadores(data.data);
    };
    void load();
  }, []);

  const conductorOptions = useMemo(
    () =>
      trabajadores.map((t) => {
        const nombre = `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06 || ''}`.replace(/\s+/g, ' ').trim();
        return {
          value: String(t.idtrabajador_06),
          label: t.ruttrabajador_06 ? `${nombre} - ${t.ruttrabajador_06}` : nombre,
        };
      }),
    [trabajadores]
  );

  const consultar = async (tipo: Tab = tab) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (desde) qs.set('desde', desde);
      if (hasta) qs.set('hasta', hasta);
      if (idConductor) qs.set('id_conductor', idConductor);
      const path = tipo === 'neumatico' ? '/reportes-neumatico/danos-neumatico' : '/reportes-neumatico/danos-llanta';
      const res = await apiFetch(apiUrl(`${path}${qs.toString() ? `?${qs}` : ''}`));
      const data: ApiResponse<{ resumen: Resumen[]; detalle: DetalleNeu[] | DetalleLla[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Reporte', data.error || 'No se pudo obtener el reporte');
        return;
      }
      setResumen(data.data.resumen || []);
      if (tipo === 'neumatico') {
        setDetalleNeu((data.data.detalle || []) as DetalleNeu[]);
      } else {
        setDetalleLla((data.data.detalle || []) as DetalleLla[]);
      }
      setCurrentPage(1);
    } catch {
      await showError('Reporte', 'No se pudo obtener el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void consultar('neumatico');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarTab = (next: Tab) => {
    setTab(next);
    void consultar(next);
  };

  const detalle = tab === 'neumatico' ? detalleNeu : detalleLla;
  const totalPages = Math.max(1, Math.ceil(detalle.length / itemsPerPage));
  const pageItems = detalle.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportar = () => {
    if (tab === 'neumatico') {
      exportToExcel(
        detalleNeu.map((r) => ({
          Folio: r.folio_76,
          Fecha: fechaCorta(r.fecha_76),
          Conductor: r.conductor_nombre,
          Código: r.cod_neumatico_31,
          Marca: r.marca_32 || '',
          Daño: r.dano_codigo,
          Máquina: `${r.maquina_numinterno || ''} ${r.maquina_ppu || ''}`.trim(),
          Técnico: r.tecnico_nombre || '',
        })),
        'danos_neumatico_conductor',
        'Daños neumático'
      );
    } else {
      exportToExcel(
        detalleLla.map((r) => ({
          Folio: r.folio_76,
          Fecha: fechaCorta(r.fecha_76),
          Conductor: r.conductor_nombre,
          Llanta: r.llanta,
          Daño: r.dano_codigo,
          Máquina: `${r.maquina_numinterno || ''} ${r.maquina_ppu || ''}`.trim(),
          Técnico: r.tecnico_nombre || '',
        })),
        'danos_llanta_conductor',
        'Daños llanta'
      );
    }
    void showSuccess('Exportación', 'El Excel de daños se descargó.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Daños por conductor</h2>
        <div className="reportes-neumatico-actions">
          <button type="button" className="btn-primary" onClick={() => void consultar()} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#17a2b8' }} onClick={exportar} disabled={detalle.length === 0}>
            Exportar
          </button>
        </div>
      </div>

      <p className="reportes-neumatico-note">
        El conductor es quien figuraba en la intervención al registrar el daño, no un juicio de culpabilidad.
      </p>

      <div className="reportes-neumatico-tabs" role="tablist" aria-label="Tipo de daño">
        <button type="button" role="tab" aria-selected={tab === 'neumatico'} className={`reportes-neumatico-tab${tab === 'neumatico' ? ' is-active' : ''}`} onClick={() => cambiarTab('neumatico')}>
          Neumático
        </button>
        <button type="button" role="tab" aria-selected={tab === 'llanta'} className={`reportes-neumatico-tab${tab === 'llanta' ? ' is-active' : ''}`} onClick={() => cambiarTab('llanta')}>
          Llanta
        </button>
      </div>

      <div className="form-container">
        <div className="reportes-neumatico-filters">
          <div className="form-group">
            <label htmlFor="dan-desde">Desde</label>
            <input id="dan-desde" type="date" className="form-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="dan-hasta">Hasta</label>
            <input id="dan-hasta" type="date" className="form-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="dan-cond">Conductor</label>
            <SearchableSelect id="dan-cond" value={idConductor} onChange={setIdConductor} options={conductorOptions} placeholder="Todos..." emptyMessage="Sin conductores" />
          </div>
        </div>
      </div>

      <h3 className="reportes-neumatico-section-title">Resumen</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Conductor</th>
              <th>RUT</th>
              <th>Daño</th>
              <th>Cantidad</th>
              <th>Máquinas</th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">Sin daños en el período</td>
              </tr>
            ) : (
              resumen.map((r) => (
                <tr key={`${r.idconductor_76}-${r.dano_codigo}`}>
                  <td>{r.conductor_nombre}</td>
                  <td>{r.ruttrabajador_06 || '—'}</td>
                  <td>{r.dano_codigo}{r.dano_descripcion ? ` — ${r.dano_descripcion}` : ''}</td>
                  <td>{r.cantidad}</td>
                  <td>{r.maquinas}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="reportes-neumatico-section-title">Detalle</h3>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Conductor</th>
                <th>{tab === 'neumatico' ? 'Neumático' : 'Llanta'}</th>
                <th>Daño</th>
                <th>Máquina</th>
                <th>Técnico</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">Sin líneas de detalle</td>
                </tr>
              ) : tab === 'neumatico' ? (
                (pageItems as DetalleNeu[]).map((r, i) => (
                  <tr key={`${r.folio_76}-${r.cod_neumatico_31}-${i}`}>
                    <td><strong>{r.folio_76}</strong></td>
                    <td>{fechaCorta(r.fecha_76)}</td>
                    <td>{r.conductor_nombre}</td>
                    <td>{r.cod_neumatico_31}{r.marca_32 ? ` · ${r.marca_32}` : ''}</td>
                    <td>{r.dano_codigo}</td>
                    <td>{r.maquina_numinterno} {r.maquina_ppu}</td>
                    <td>{r.tecnico_nombre}</td>
                  </tr>
                ))
              ) : (
                (pageItems as DetalleLla[]).map((r, i) => (
                  <tr key={`${r.folio_76}-${r.llanta}-${i}`}>
                    <td><strong>{r.folio_76}</strong></td>
                    <td>{fechaCorta(r.fecha_76)}</td>
                    <td>{r.conductor_nombre}</td>
                    <td>{r.llanta}</td>
                    <td>{r.dano_codigo}</td>
                    <td>{r.maquina_numinterno} {r.maquina_ppu}</td>
                    <td>{r.tecnico_nombre}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={detalle.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default DanosConductorNeumaticoView;
