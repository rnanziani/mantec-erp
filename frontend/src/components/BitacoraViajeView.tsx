import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { filtrarResponsablesActivos } from '../utils/responsablesEntrega';
import { filtrarTrabajadoresPorApellido } from '../utils/trabajadorSearch';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface Vehiculo {
  id_vehiculo_95: number;
  patente_95: string;
  marca_95: string;
  modelo_95: string;
  kilometraje_actual_95: number;
  estado_vehiculo_95: string;
}
interface Trabajador {
  idtrabajador_06: number;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
  ruttrabajador_06?: string;
}
interface Responsable {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  estado_08?: boolean;
}
interface Control {
  id_control_97?: number;
  tipo_control_97: string;
  kilometraje_97: number;
  nivel_combustible_97: string;
  estado_limpieza_97: string;
  tiene_danos_97: boolean;
  descripcion_danos_97?: string | null;
  observaciones_97?: string | null;
  id_responsable_entrega_97: number;
  responsable_nombre?: string;
}
interface Bitacora {
  id_bitacora_96: number;
  id_vehiculo_96: number;
  id_conductor_96: number;
  id_responsable_autoriza_96: number;
  motivo_salida_96?: string | null;
  destino_96?: string | null;
  fecha_hora_salida_96: string;
  fecha_hora_regreso_96?: string | null;
  estado_bitacora_96: string;
  patente_95?: string;
  marca_95?: string;
  modelo_95?: string;
  kilometraje_actual_95?: number;
  conductor_nombre?: string;
  autoriza_nombre?: string;
  controles?: Control[];
}
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyCtrl = {
  kilometraje_97: '',
  nivel_combustible_97: 'F',
  estado_limpieza_97: 'Limpio',
  tiene_danos_97: false,
  descripcion_danos_97: '',
  observaciones_97: '',
  id_responsable_entrega_97: '',
};

const BitacoraViajeView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Bitacora[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idVehiculo, setIdVehiculo] = useState('');
  const [idConductor, setIdConductor] = useState('');
  const [idAutoriza, setIdAutoriza] = useState('');
  const [motivo, setMotivo] = useState('');
  const [destino, setDestino] = useState('');
  const [salida, setSalida] = useState(emptyCtrl);

  const [detalle, setDetalle] = useState<Bitacora | null>(null);
  const [regreso, setRegreso] = useState(emptyCtrl);

  const API = apiUrl('/bitacoras-viaje');

  const nombreTrab = (t: Trabajador) =>
    `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06}`.trim() +
    (t.ruttrabajador_06 ? ` — ${t.ruttrabajador_06}` : '');
  const nombreResp = (r: Responsable) =>
    `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''}`.trim();

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [bRes, vRes, tRes, rRes] = await Promise.all([
        apiFetch(API),
        apiFetch(apiUrl('/vehiculos?activos=1')),
        apiFetch(apiUrl('/trabajadores')),
        apiFetch(apiUrl('/responsables-entrega?activo=1')),
      ]);
      const bData: ApiResponse<Bitacora[]> = await bRes.json();
      const vData: ApiResponse<Vehiculo[]> = await vRes.json();
      const tData: ApiResponse<Trabajador[]> = await tRes.json();
      const rData: ApiResponse<Responsable[]> = await rRes.json();
      if (bData.success && Array.isArray(bData.data)) setItems(bData.data);
      else setError(bData.error || 'Error al cargar bitácoras');
      if (vData.success && Array.isArray(vData.data)) setVehiculos(vData.data);
      if (tData.success && Array.isArray(tData.data)) setTrabajadores(tData.data);
      if (rData.success && Array.isArray(rData.data)) setResponsables(filtrarResponsablesActivos(rData.data));
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const vehiculoOptions = useMemo(
    () =>
      vehiculos.map((v) => ({
        value: String(v.id_vehiculo_95),
        label: `${v.patente_95} — ${v.marca_95} ${v.modelo_95} (km ${v.kilometraje_actual_95})`,
      })),
    [vehiculos]
  );
  const conductorOptions = useMemo(
    () =>
      filtrarTrabajadoresPorApellido(trabajadores, '').map((t) => ({
        value: String(t.idtrabajador_06),
        label: nombreTrab(t),
      })),
    [trabajadores]
  );
  const responsableOptions = useMemo(
    () => responsables.map((r) => ({ value: String(r.idresponsableentrega_08), label: nombreResp(r) })),
    [responsables]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) =>
      [b.patente_95, b.conductor_nombre, b.destino_96, b.estado_bitacora_96, b.motivo_salida_96]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const vehiculoSel = vehiculos.find((v) => String(v.id_vehiculo_95) === idVehiculo);

  const resetForm = () => {
    setIdVehiculo('');
    setIdConductor('');
    setIdAutoriza('');
    setMotivo('');
    setDestino('');
    setSalida(emptyCtrl);
    setShowForm(false);
    setDetalle(null);
  };

  const abrirDetalle = async (id: number) => {
    const res = await apiFetch(`${API}/${id}`);
    const data: ApiResponse<Bitacora> = await res.json();
    if (!data.success || !data.data) {
      await showError('Error', data.error || 'No se pudo abrir');
      return;
    }
    setDetalle(data.data);
    setShowForm(false);
    setRegreso(emptyCtrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idVehiculo || !idConductor || !idAutoriza || !salida.kilometraje_97 || !salida.id_responsable_entrega_97) {
      await showError('Validación', 'Vehículo, conductor, quien autoriza, km de salida y quien entrega');
      return;
    }
    const payload = {
      id_vehiculo_96: Number(idVehiculo),
      id_conductor_96: Number(idConductor),
      id_responsable_autoriza_96: Number(idAutoriza),
      motivo_salida_96: motivo.trim() || null,
      destino_96: destino.trim() || null,
      salida: {
        kilometraje_97: Number(salida.kilometraje_97),
        nivel_combustible_97: salida.nivel_combustible_97,
        estado_limpieza_97: salida.estado_limpieza_97,
        tiene_danos_97: salida.tiene_danos_97,
        descripcion_danos_97: salida.descripcion_danos_97 || null,
        observaciones_97: salida.observaciones_97 || null,
        id_responsable_entrega_97: Number(salida.id_responsable_entrega_97),
      },
    };
    try {
      const res = await apiFetch(API, { method: 'POST', body: JSON.stringify(payload) });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('Salida', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo registrar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleRegreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalle) return;
    if (!regreso.kilometraje_97 || !regreso.id_responsable_entrega_97) {
      await showError('Validación', 'Km de regreso y quién recepciona');
      return;
    }
    try {
      const res = await apiFetch(`${API}/${detalle.id_bitacora_96}/regreso`, {
        method: 'POST',
        body: JSON.stringify({
          kilometraje_97: Number(regreso.kilometraje_97),
          nivel_combustible_97: regreso.nivel_combustible_97,
          estado_limpieza_97: regreso.estado_limpieza_97,
          tiene_danos_97: regreso.tiene_danos_97,
          descripcion_danos_97: regreso.descripcion_danos_97 || null,
          observaciones_97: regreso.observaciones_97 || null,
          id_responsable_entrega_97: Number(regreso.id_responsable_entrega_97),
        }),
      });
      const data: ApiResponse<Bitacora> = await res.json();
      if (data.success) {
        await fetchAll();
        setDetalle(data.data || null);
        setRegreso(emptyCtrl);
        await showSuccess('Regreso', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo registrar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const postAccion = async (path: string) => {
    const res = await apiFetch(path, { method: 'POST' });
    const data: ApiResponse<Bitacora> = await res.json();
    if (!data.success) {
      await showError('Error', data.error || 'No se pudo completar');
      return;
    }
    await fetchAll();
    if (data.data) setDetalle(data.data);
    await showSuccess('Listo', data.message || 'OK');
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('esta bitácora');
    if (!ok) return;
    const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    const data: ApiResponse = await res.json();
    if (data.success) {
      await fetchAll();
      setDetalle(null);
      await showSuccess('Listo', data.message || 'Eliminada');
    } else {
      await showError('Error', data.error || 'No se pudo eliminar');
    }
  };

  if (loading) return <div className="loading">Cargando bitácoras...</div>;

  const controlBlock = (
    prefix: string,
    state: typeof emptyCtrl,
    setState: React.Dispatch<React.SetStateAction<typeof emptyCtrl>>
  ) => (
    <div className="form-row form-row-3">
      <div className="form-group">
        <label htmlFor={`${prefix}-km`}>Kilometraje *</label>
        <input
          id={`${prefix}-km`}
          type="number"
          min={0}
          step="0.01"
          className="form-input"
          required
          value={state.kilometraje_97}
          onChange={(e) => setState((p) => ({ ...p, kilometraje_97: e.target.value }))}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-comb`}>Combustible *</label>
        <select
          id={`${prefix}-comb`}
          className="form-input"
          value={state.nivel_combustible_97}
          onChange={(e) => setState((p) => ({ ...p, nivel_combustible_97: e.target.value }))}
        >
          {['E', '1/4', '1/2', '3/4', 'F'].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-lim`}>Limpieza</label>
        <select
          id={`${prefix}-lim`}
          className="form-input"
          value={state.estado_limpieza_97}
          onChange={(e) => setState((p) => ({ ...p, estado_limpieza_97: e.target.value }))}
        >
          <option value="Limpio">Limpio</option>
          <option value="Sucio">Sucio</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-resp`}>Quién {prefix === 'sal' ? 'entrega' : 'recepciona'} *</label>
        <SearchableSelect
          id={`${prefix}-resp`}
          value={state.id_responsable_entrega_97}
          onChange={(v) => setState((p) => ({ ...p, id_responsable_entrega_97: v }))}
          options={responsableOptions}
          placeholder="Responsable vigente..."
          aria-label={`Responsable ${prefix}`}
        />
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={state.tiene_danos_97}
            onChange={(e) => setState((p) => ({ ...p, tiene_danos_97: e.target.checked }))}
          />{' '}
          Tiene daños
        </label>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-dano`}>Descripción daños</label>
        <input
          id={`${prefix}-dano`}
          className="form-input"
          style={{ textTransform: 'uppercase' }}
          value={state.descripcion_danos_97}
          onChange={(e) => changeKeepingCaret(e, (v) => setState((p) => ({ ...p, descripcion_danos_97: v })))}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-obs`}>Observaciones</label>
        <input
          id={`${prefix}-obs`}
          className="form-input"
          style={{ textTransform: 'uppercase' }}
          value={state.observaciones_97}
          onChange={(e) => changeKeepingCaret(e, (v) => setState((p) => ({ ...p, observaciones_97: v })))}
        />
      </div>
    </div>
  );

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Flota — Bitácora de viajes</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Nueva salida
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar salida
          </button>
          <button
            type="button"
            className="btn-info"
            onClick={() =>
              exportToExcel(
                filtered.map((b) => ({
                  ID: b.id_bitacora_96,
                  Patente: b.patente_95,
                  Conductor: b.conductor_nombre,
                  Destino: b.destino_96,
                  Salida: b.fecha_hora_salida_96,
                  Estado: b.estado_bitacora_96,
                })),
                'bitacoras-viaje'
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

      {showForm && (
        <div className="form-container">
          <h3>Nueva salida</h3>
          <p style={{ color: '#6c757d' }}>
            El vehículo se da de alta en Flota → Vehículos. Aquí se registra la SALIDA (km, combustible, quién entrega). El REGRESO se carga después, cuando el auto vuelve.
          </p>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="id_vehiculo_96">Vehículo *</label>
                <SearchableSelect
                  id="id_vehiculo_96"
                  value={idVehiculo}
                  onChange={(v) => {
                    setIdVehiculo(v);
                    const found = vehiculos.find((x) => String(x.id_vehiculo_95) === v);
                    if (found) setSalida((p) => ({ ...p, kilometraje_97: String(found.kilometraje_actual_95 ?? 0) }));
                  }}
                  options={vehiculoOptions}
                  placeholder="Buscar patente..."
                  emptyMessage={vehiculoOptions.length === 0 ? 'No hay vehículos activos. Créelos en Flota → Vehículos' : 'Sin coincidencias'}
                  aria-label="Vehículo"
                />
                {vehiculoSel && (
                  <small>Km actual en catálogo: {vehiculoSel.kilometraje_actual_95}</small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="id_conductor_96">Conductor *</label>
                <SearchableSelect id="id_conductor_96" value={idConductor} onChange={setIdConductor} options={conductorOptions} placeholder="Buscar trabajador..." aria-label="Conductor" />
              </div>
              <div className="form-group">
                <label htmlFor="id_responsable_autoriza_96">Autoriza salida *</label>
                <SearchableSelect id="id_responsable_autoriza_96" value={idAutoriza} onChange={setIdAutoriza} options={responsableOptions} placeholder="Responsable vigente..." aria-label="Autoriza" />
              </div>
              <div className="form-group">
                <label htmlFor="destino_96">Destino</label>
                <input id="destino_96" className="form-input" maxLength={150} style={{ textTransform: 'uppercase' }} value={destino} onChange={(e) => changeKeepingCaret(e, setDestino)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="motivo_salida_96">Motivo</label>
                <input id="motivo_salida_96" className="form-input" style={{ textTransform: 'uppercase' }} value={motivo} onChange={(e) => changeKeepingCaret(e, setMotivo)} />
              </div>
            </div>
            <h4>Control físico de SALIDA</h4>
            {controlBlock('sal', salida, setSalida)}
          </form>
        </div>
      )}

      {detalle && !showForm && (
        <div className="form-container">
          <h3>
            {detalle.patente_95} — {detalle.conductor_nombre}{' '}
            <span className="badge">{detalle.estado_bitacora_96}</span>
          </h3>
          <p>
            Destino: {detalle.destino_96 || '—'} · Autoriza: {detalle.autoriza_nombre} · Salida:{' '}
            {String(detalle.fecha_hora_salida_96).replace('T', ' ').slice(0, 16)}
          </p>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Km</th>
                  <th>Comb.</th>
                  <th>Limpieza</th>
                  <th>Daños</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.controles || []).map((c) => (
                  <tr key={c.tipo_control_97}>
                    <td>{c.tipo_control_97}</td>
                    <td>{c.kilometraje_97}</td>
                    <td>{c.nivel_combustible_97}</td>
                    <td>{c.estado_limpieza_97}</td>
                    <td>{c.tiene_danos_97 ? (c.descripcion_danos_97 || 'SÍ') : 'NO'}</td>
                    <td>{c.responsable_nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detalle.estado_bitacora_96 === 'En Curso' && (
            <>
              <h4>Registrar REGRESO</h4>
              <form onSubmit={handleRegreso}>
                {controlBlock('reg', regreso, setRegreso)}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-success">Guardar regreso</button>
                  <button type="button" className="btn-delete" onClick={() => postAccion(`${API}/${detalle.id_bitacora_96}/anular`)}>
                    Anular viaje
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, textTransform: 'uppercase' }}
          placeholder="Buscar patente, conductor, destino..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar bitácoras"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patente</th>
              <th>Conductor</th>
              <th>Destino</th>
              <th>Salida</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>Sin viajes</td>
              </tr>
            ) : (
              pageItems.map((b) => (
                <tr key={b.id_bitacora_96}>
                  <td>{b.id_bitacora_96}</td>
                  <td>{b.patente_95}</td>
                  <td>{b.conductor_nombre}</td>
                  <td>{b.destino_96 || '—'}</td>
                  <td>{String(b.fecha_hora_salida_96).replace('T', ' ').slice(0, 16)}</td>
                  <td>{b.estado_bitacora_96}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => abrirDetalle(b.id_bitacora_96)} title="Ver / regreso">📋</button>
                    {b.estado_bitacora_96 !== 'Finalizado' && (
                      <button type="button" className="btn-delete" onClick={() => handleDelete(b.id_bitacora_96)} title="Eliminar">🗑️</button>
                    )}
                  </td>
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

export default BitacoraViajeView;
