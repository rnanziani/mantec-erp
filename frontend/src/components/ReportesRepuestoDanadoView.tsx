import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './ReportesNeumaticoView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

type Tab = 'recepcion' | 'proveedor' | 'instalados';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FilaRecepcion {
  folio_59: string;
  fecha_59: string;
  hora_59?: string;
  cantidad_60: number;
  estado_60: string;
  repuesto_codigo: string;
  repuesto_nombre: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  tecnico_nombre?: string;
  proveedor_nombre?: string;
  responsable_nombre?: string;
}

interface ResumenSit {
  situacion: string;
  lineas: number;
  cantidad: number;
}

interface FilaProveedor {
  situacion: string;
  folio_59: string;
  fecha_59?: string;
  cantidad_60: number;
  estado_60: string;
  repuesto_codigo: string;
  repuesto_nombre: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  proveedor_recepcion?: string;
  folio_63?: string | null;
  fecha_entrega_63?: string | null;
  fecha_recepcion_64?: string | null;
  estado_nombre?: string | null;
  dias_transcurridos?: number | null;
  semaforo_nombre?: string | null;
  proveedor_entrega?: string | null;
}

interface FilaInstalado {
  fecha_instalacion?: string;
  hora_instalacion?: string;
  repuesto_codigo: string;
  repuesto_nombre: string;
  cantidad_60: number;
  valor_reparacion_64?: number;
  fecha_recepcion_64?: string;
  folio_63: string;
  folio_59: string;
  proveedor_nombre?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  maquina_origen_numinterno?: string;
  maquina_origen_ppu?: string;
  tecnico_nombre?: string;
  responsable_nombre?: string;
}

const SITUACION_LABEL: Record<string, string> = {
  PENDIENTE_ENVIO: 'Pendiente de enviar',
  EN_PROVEEDOR: 'En el proveedor',
  DEVUELTO_SIN_CERRAR: 'Volvió, sin asignar',
  DISPONIBLE_BODEGA: 'Disponible en bodega',
  INSTALADO: 'Instalado',
  ANULADO: 'Anulado',
};

const fechaCorta = (v?: string | null) => (v ? String(v).slice(0, 10) : '—');
const dinero = (v?: number | null) =>
  v == null || Number.isNaN(Number(v))
    ? '—'
    : Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const maquinaTxt = (n?: string, p?: string) => `${n || ''} ${p || ''}`.trim() || '—';

const ReportesRepuestoDanadoView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('recepcion');
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [idMaquina, setIdMaquina] = useState('');
  const [idProveedor, setIdProveedor] = useState('');
  const [estado, setEstado] = useState('');
  const [situacion, setSituacion] = useState('');
  const [recepciones, setRecepciones] = useState<FilaRecepcion[]>([]);
  const [resumen, setResumen] = useState<ResumenSit[]>([]);
  const [proveedor, setProveedor] = useState<FilaProveedor[]>([]);
  const [instalados, setInstalados] = useState<FilaInstalado[]>([]);
  const [maquinas, setMaquinas] = useState<Array<{ idmaquina_11: number; numinterno_11?: string; ppu_11?: string }>>([]);
  const [proveedores, setProveedores] = useState<Array<{ idproveedor_58: number; nombre_58: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const load = async () => {
      const [mq, pr] = await Promise.all([
        apiFetch(apiUrl('/maquinas')),
        apiFetch(apiUrl('/proveedores')),
      ]);
      const md: ApiResponse<typeof maquinas> = await mq.json();
      const pd: ApiResponse<typeof proveedores> = await pr.json();
      if (md.success && Array.isArray(md.data)) setMaquinas(md.data);
      if (pd.success && Array.isArray(pd.data)) setProveedores(pd.data);
    };
    void load();
  }, []);

  const maquinaOptions = useMemo(
    () =>
      maquinas.map((m) => ({
        value: String(m.idmaquina_11),
        label: `${m.ppu_11 || 'N/A'} - ${m.numinterno_11 || 'N/A'}`,
      })),
    [maquinas]
  );
  const proveedorOptions = useMemo(
    () => proveedores.map((p) => ({ value: String(p.idproveedor_58), label: p.nombre_58 })),
    [proveedores]
  );

  const consultar = async (tipo: Tab = tab) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (idProveedor) qs.set('id_proveedor', idProveedor);
      if (tipo === 'recepcion') {
        if (desde) qs.set('desde', desde);
        if (hasta) qs.set('hasta', hasta);
        if (idMaquina) qs.set('id_maquina', idMaquina);
        if (estado) qs.set('estado', estado);
        const res = await apiFetch(apiUrl(`/reportes-repuestos-danados/recepciones${qs.toString() ? `?${qs}` : ''}`));
        const data: ApiResponse<FilaRecepcion[]> = await res.json();
        if (!data.success || !Array.isArray(data.data)) {
          await showError('Reporte', data.error || 'No se pudo consultar');
          return;
        }
        setRecepciones(data.data);
      } else if (tipo === 'proveedor') {
        if (situacion) qs.set('situacion', situacion);
        const res = await apiFetch(apiUrl(`/reportes-repuestos-danados/estado-proveedor${qs.toString() ? `?${qs}` : ''}`));
        const data: ApiResponse<{ resumen: ResumenSit[]; detalle: FilaProveedor[] }> = await res.json();
        if (!data.success || !data.data) {
          await showError('Reporte', data.error || 'No se pudo consultar');
          return;
        }
        setResumen(data.data.resumen || []);
        setProveedor(data.data.detalle || []);
      } else {
        if (desde) qs.set('desde', desde);
        if (hasta) qs.set('hasta', hasta);
        if (idMaquina) qs.set('id_maquina', idMaquina);
        const res = await apiFetch(apiUrl(`/reportes-repuestos-danados/instalados${qs.toString() ? `?${qs}` : ''}`));
        const data: ApiResponse<FilaInstalado[]> = await res.json();
        if (!data.success || !Array.isArray(data.data)) {
          await showError('Reporte', data.error || 'No se pudo consultar');
          return;
        }
        setInstalados(data.data);
      }
      setCurrentPage(1);
    } catch {
      await showError('Reporte', 'No se pudo consultar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void consultar('recepcion');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarTab = (next: Tab) => {
    setTab(next);
    setCurrentPage(1);
    void consultar(next);
  };

  const filas =
    tab === 'recepcion' ? recepciones : tab === 'proveedor' ? proveedor : instalados;
  const totalPages = Math.max(1, Math.ceil(filas.length / itemsPerPage));
  const pageItems = filas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportar = () => {
    if (tab === 'recepcion') {
      exportToExcel(
        recepciones.map((r) => ({
          Folio: r.folio_59,
          Fecha: fechaCorta(r.fecha_59),
          Máquina: maquinaTxt(r.maquina_numinterno, r.maquina_ppu),
          Código: r.repuesto_codigo,
          Repuesto: r.repuesto_nombre,
          Cantidad: r.cantidad_60,
          Estado: r.estado_60,
          Técnico: r.tecnico_nombre,
          Proveedor: r.proveedor_nombre,
          Responsable: r.responsable_nombre,
        })),
        'recepciones_taller_bodega',
        'Recepciones'
      );
    } else if (tab === 'proveedor') {
      exportToExcel(
        proveedor.map((r) => ({
          Situación: SITUACION_LABEL[r.situacion] || r.situacion,
          'Folio RRD': r.folio_59,
          'Folio ERD': r.folio_63 || '',
          Código: r.repuesto_codigo,
          Repuesto: r.repuesto_nombre,
          Cantidad: r.cantidad_60,
          Máquina: maquinaTxt(r.maquina_numinterno, r.maquina_ppu),
          Proveedor: r.proveedor_entrega || r.proveedor_recepcion,
          'Estado taller': r.estado_nombre || '',
          'Fecha salida': fechaCorta(r.fecha_entrega_63),
          'Fecha vuelta': fechaCorta(r.fecha_recepcion_64),
          Días: r.dias_transcurridos ?? '',
          Semáforo: r.semaforo_nombre || '',
        })),
        'estado_repuestos_proveedor',
        'Estado proveedor'
      );
    } else {
      exportToExcel(
        instalados.map((r) => ({
          'Fecha instalación': fechaCorta(r.fecha_instalacion),
          Máquina: maquinaTxt(r.maquina_numinterno, r.maquina_ppu),
          'Máquina origen': maquinaTxt(r.maquina_origen_numinterno, r.maquina_origen_ppu),
          Código: r.repuesto_codigo,
          Repuesto: r.repuesto_nombre,
          Cantidad: r.cantidad_60,
          Valor: r.valor_reparacion_64 ?? '',
          Proveedor: r.proveedor_nombre,
          'Folio ERD': r.folio_63,
          'Folio RRD': r.folio_59,
          'Vuelta proveedor': fechaCorta(r.fecha_recepcion_64),
          Técnico: r.tecnico_nombre,
          Responsable: r.responsable_nombre,
        })),
        'repuestos_instalados_garantia',
        'Instalados'
      );
    }
    void showSuccess('Exportación', 'El Excel se descargó.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Reportes de repuestos dañados</h2>
        <div className="reportes-neumatico-actions">
          <button type="button" className="btn-primary" onClick={() => void consultar()} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#17a2b8' }} onClick={exportar} disabled={filas.length === 0}>
            Exportar
          </button>
        </div>
      </div>

      <div className="reportes-neumatico-tabs" role="tablist" aria-label="Tipo de reporte">
        <button type="button" role="tab" aria-selected={tab === 'recepcion'} className={`reportes-neumatico-tab${tab === 'recepcion' ? ' is-active' : ''}`} onClick={() => cambiarTab('recepcion')}>
          1. Taller → bodega
        </button>
        <button type="button" role="tab" aria-selected={tab === 'proveedor'} className={`reportes-neumatico-tab${tab === 'proveedor' ? ' is-active' : ''}`} onClick={() => cambiarTab('proveedor')}>
          2. Estado / pendientes
        </button>
        <button type="button" role="tab" aria-selected={tab === 'instalados'} className={`reportes-neumatico-tab${tab === 'instalados' ? ' is-active' : ''}`} onClick={() => cambiarTab('instalados')}>
          3. Instalados (garantía)
        </button>
      </div>

      <p className="reportes-neumatico-note">
        {tab === 'recepcion' && 'Lo que el taller entregó a bodega (folio RRD).'}
        {tab === 'proveedor' && 'Dónde está cada línea: pendiente de envío, en el proveedor, volvió o ya se cerró.'}
        {tab === 'instalados' && 'Fecha de instalación + máquina + proveedor + valor. Sirve para pedir garantía si falla.'}
      </p>

      <div className="form-container">
        <div className="reportes-neumatico-filters">
          {(tab === 'recepcion' || tab === 'instalados') && (
            <>
              <div className="form-group">
                <label htmlFor="rd-desde">{tab === 'instalados' ? 'Instalado desde' : 'Desde'}</label>
                <input id="rd-desde" type="date" className="form-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="rd-hasta">{tab === 'instalados' ? 'Instalado hasta' : 'Hasta'}</label>
                <input id="rd-hasta" type="date" className="form-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="rd-maq">Máquina</label>
                <SearchableSelect id="rd-maq" value={idMaquina} onChange={setIdMaquina} options={maquinaOptions} placeholder="Todas..." emptyMessage="Sin máquinas" />
              </div>
            </>
          )}
          {tab === 'recepcion' && (
            <div className="form-group">
              <label htmlFor="rd-est">Estado línea</label>
              <select id="rd-est" className="form-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="ENVIADO_PROVEEDOR">ENVIADO_PROVEEDOR</option>
                <option value="RECIBIDO">RECIBIDO</option>
                <option value="ANULADO">ANULADO</option>
              </select>
            </div>
          )}
          {tab === 'proveedor' && (
            <div className="form-group">
              <label htmlFor="rd-sit">Situación</label>
              <select id="rd-sit" className="form-input" value={situacion} onChange={(e) => setSituacion(e.target.value)}>
                <option value="">Todas</option>
                {Object.entries(SITUACION_LABEL).map(([k, lab]) => (
                  <option key={k} value={k}>{lab}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="rd-prov">Proveedor</label>
            <SearchableSelect id="rd-prov" value={idProveedor} onChange={setIdProveedor} options={proveedorOptions} placeholder="Todos..." emptyMessage="Sin proveedores" />
          </div>
        </div>
      </div>

      {tab === 'proveedor' && resumen.length > 0 && (
        <>
          <h3 className="reportes-neumatico-section-title">Resumen</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Situación</th>
                  <th>Líneas</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={r.situacion}>
                    <td>{SITUACION_LABEL[r.situacion] || r.situacion}</td>
                    <td>{r.lineas}</td>
                    <td>{r.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="reportes-neumatico-section-title">Detalle</h3>
        </>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : tab === 'recepcion' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Máquina</th>
                <th>Repuesto</th>
                <th>Cant.</th>
                <th>Estado</th>
                <th>Técnico</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={8} className="no-data">Sin recepciones</td></tr>
              ) : (pageItems as FilaRecepcion[]).map((r, i) => (
                <tr key={`${r.folio_59}-${r.repuesto_codigo}-${i}`}>
                  <td><strong>{r.folio_59}</strong></td>
                  <td>{fechaCorta(r.fecha_59)}</td>
                  <td>{maquinaTxt(r.maquina_numinterno, r.maquina_ppu)}</td>
                  <td>{r.repuesto_codigo} {r.repuesto_nombre}</td>
                  <td>{r.cantidad_60}</td>
                  <td>{r.estado_60}</td>
                  <td>{r.tecnico_nombre}</td>
                  <td>{r.proveedor_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'proveedor' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Situación</th>
                <th>RRD</th>
                <th>ERD</th>
                <th>Repuesto</th>
                <th>Cant.</th>
                <th>Máquina</th>
                <th>Proveedor</th>
                <th>Taller</th>
                <th>Días</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={9} className="no-data">Sin líneas</td></tr>
              ) : (pageItems as FilaProveedor[]).map((r, i) => (
                <tr key={`${r.folio_59}-${r.folio_63 || 'x'}-${i}`}>
                  <td>{SITUACION_LABEL[r.situacion] || r.situacion}</td>
                  <td>{r.folio_59}</td>
                  <td>{r.folio_63 || '—'}</td>
                  <td>{r.repuesto_codigo} {r.repuesto_nombre}</td>
                  <td>{r.cantidad_60}</td>
                  <td>{maquinaTxt(r.maquina_numinterno, r.maquina_ppu)}</td>
                  <td>{r.proveedor_entrega || r.proveedor_recepcion}</td>
                  <td>{r.estado_nombre || '—'}</td>
                  <td>{r.dias_transcurridos ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Instalación</th>
                <th>Máquina</th>
                <th>Repuesto</th>
                <th>Cant.</th>
                <th>Valor</th>
                <th>Proveedor</th>
                <th>ERD</th>
                <th>RRD</th>
                <th>Técnico</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={9} className="no-data">Sin instalados</td></tr>
              ) : (pageItems as FilaInstalado[]).map((r, i) => (
                <tr key={`${r.folio_63}-${r.repuesto_codigo}-${i}`}>
                  <td>{fechaCorta(r.fecha_instalacion)}</td>
                  <td>{maquinaTxt(r.maquina_numinterno, r.maquina_ppu)}</td>
                  <td>{r.repuesto_codigo} {r.repuesto_nombre}</td>
                  <td>{r.cantidad_60}</td>
                  <td>{dinero(r.valor_reparacion_64)}</td>
                  <td>{r.proveedor_nombre}</td>
                  <td>{r.folio_63}</td>
                  <td>{r.folio_59}</td>
                  <td>{r.tecnico_nombre || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filas.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default ReportesRepuestoDanadoView;
