import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Movimiento {
  idmovimiento_84: number;
  idunidad_84: number;
  idtipo_84: number;
  idtecnico_84?: number | null;
  idmaquina_84?: number | null;
  idproveedor_84?: number | null;
  fecha_84: string;
  hora_84: string;
  observacion_84?: string | null;
  codigo_81?: string;
  nombre_tipo_57?: string;
  origen_descripcion?: string;
  destino_descripcion?: string;
  tipo_codigo?: string;
  tipo_descripcion?: string;
  tecnico_nombre?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  proveedor_nombre?: string;
}

interface Unidad {
  idunidad_81: number;
  codigo_81: string;
  nombre_tipo_57?: string;
  ubicacion_actual?: string | null;
}

interface TipoMov {
  idtipo_83: number;
  codigo_83: string;
  descripcion_83: string;
  codigo_origen_83: string;
  codigo_destino_83: string;
}

interface Tecnico {
  id_tecnico_21: number;
  nombres_21: string;
  a_paterno_21: string;
  a_materno_21: string;
}

interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
}

interface Proveedor {
  idproveedor_58: number;
  nombre_58: string;
  activo_58: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

function toFechaISO(value?: string): string {
  const raw = String(value || '');
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : '';
}

const MovimientoRepuestoView: React.FC = () => {
  const [items, setItems] = useState<Movimiento[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [tipos, setTipos] = useState<TipoMov[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [idUnidad, setIdUnidad] = useState('');
  const [idTipo, setIdTipo] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [idMaquina, setIdMaquina] = useState('');
  const [idProveedor, setIdProveedor] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(() => new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [filtro, setFiltro] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroMaquina, setFiltroMaquina] = useState('');

  const tipoSel = tipos.find((t) => String(t.idtipo_83) === idTipo);
  const usaMaquina = tipoSel?.codigo_origen_83 === 'MAQUINA' || tipoSel?.codigo_destino_83 === 'MAQUINA';
  const usaProveedor = tipoSel?.codigo_origen_83 === 'PROVEEDOR' || tipoSel?.codigo_destino_83 === 'PROVEEDOR';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [m, u, t, tec, maq, pr] = await Promise.all([
        apiFetch(apiUrl('/movimientos-repuesto')),
        apiFetch(apiUrl('/unidades-repuesto')),
        apiFetch(apiUrl('/movimientos-repuesto/tipos')),
        apiFetch(apiUrl('/tecnicos')),
        apiFetch(apiUrl('/maquinas')),
        apiFetch(apiUrl('/proveedores')),
      ]);
      const mj: ApiResponse<Movimiento[]> = await m.json();
      const uj: ApiResponse<Unidad[]> = await u.json();
      const tj: ApiResponse<TipoMov[]> = await t.json();
      const tecj: ApiResponse<Tecnico[]> = await tec.json();
      const maqj: ApiResponse<Maquina[]> = await maq.json();
      const prj: ApiResponse<Proveedor[]> = await pr.json();
      if (mj.success && Array.isArray(mj.data)) setItems(mj.data);
      if (uj.success && Array.isArray(uj.data)) setUnidades(uj.data);
      if (tj.success && Array.isArray(tj.data)) setTipos(tj.data);
      if (tecj.success && Array.isArray(tecj.data)) setTecnicos(tecj.data);
      if (maqj.success && Array.isArray(maqj.data)) setMaquinas(maqj.data);
      if (prj.success && Array.isArray(prj.data)) setProveedores(prj.data.filter((p) => p.activo_58 !== false));
    } catch {
      await showError('Error', 'No se pudieron cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const resetForm = () => {
    setIdUnidad('');
    setIdTipo('');
    setIdTecnico('');
    setIdMaquina('');
    setIdProveedor('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idUnidad || !idTipo) {
      await showError('Validación', 'Unidad y tipo de movimiento son requeridos');
      return;
    }
    try {
      const res = await apiFetch(apiUrl('/movimientos-repuesto'), {
        method: 'POST',
        body: JSON.stringify({
          idunidad_84: Number(idUnidad),
          idtipo_84: Number(idTipo),
          idtecnico_84: idTecnico ? Number(idTecnico) : null,
          idmaquina_84: usaMaquina && idMaquina ? Number(idMaquina) : null,
          idproveedor_84: usaProveedor && idProveedor ? Number(idProveedor) : null,
          fecha_84: fecha,
          hora_84: hora,
          observacion_84: observacion.trim() || null,
        }),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('Listo', data.message || 'Movimiento registrado', 0);
        await fetchAll();
        resetForm();
      } else {
        await showError('Error', [data.error, data.message].filter(Boolean).join(': ') || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('este movimiento (solo el último de la pieza)');
    if (!ok) return;
    try {
      const res = await apiFetch(apiUrl(`/movimientos-repuesto/${id}`), { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Listo', data.message || 'Eliminado');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const hayFiltros = Boolean(
    filtro.trim() || filtroFechaDesde || filtroFechaHasta || filtroUnidad || filtroTipo || filtroTecnico || filtroMaquina
  );

  const processed = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return items.filter((m) => {
      const fechaIso = toFechaISO(String(m.fecha_84));
      if (filtroFechaDesde && (!fechaIso || fechaIso < filtroFechaDesde)) return false;
      if (filtroFechaHasta && (!fechaIso || fechaIso > filtroFechaHasta)) return false;
      if (filtroUnidad && String(m.idunidad_84) !== filtroUnidad) return false;
      if (filtroTipo && String(m.idtipo_84) !== filtroTipo) return false;
      if (filtroTecnico && String(m.idtecnico_84 || '') !== filtroTecnico) return false;
      if (filtroMaquina && String(m.idmaquina_84 || '') !== filtroMaquina) return false;
      if (!q) return true;
      return [
        m.codigo_81,
        m.nombre_tipo_57,
        m.tipo_codigo,
        m.tipo_descripcion,
        m.origen_descripcion,
        m.destino_descripcion,
        m.tecnico_nombre,
        m.maquina_numinterno,
        m.maquina_ppu,
        m.proveedor_nombre,
        m.observacion_84,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, filtro, filtroFechaDesde, filtroFechaHasta, filtroUnidad, filtroTipo, filtroTecnico, filtroMaquina]);

  const unidadOpts = unidades.map((u) => ({
    value: String(u.idunidad_81),
    label: `${u.codigo_81} — ${u.nombre_tipo_57 || ''}${u.ubicacion_actual ? ` (${u.ubicacion_actual})` : ''}`,
  }));
  const tipoOpts = tipos.map((t) => ({
    value: String(t.idtipo_83),
    label: `${t.codigo_83} — ${t.descripcion_83}`,
  }));
  const tecOpts = tecnicos.map((t) => ({
    value: String(t.id_tecnico_21),
    label: `${t.nombres_21} ${t.a_paterno_21 || ''} ${t.a_materno_21 || ''}`.trim(),
  }));
  const maqOpts = maquinas.map((m) => ({
    value: String(m.idmaquina_11),
    label: `${m.numinterno_11 || ''} (${m.ppu_11 || ''})`.trim(),
  }));
  const provOpts = proveedores.map((p) => ({
    value: String(p.idproveedor_58),
    label: p.nombre_58,
  }));

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Movimientos de repuesto</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            + Nuevo movimiento
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>Nuevo movimiento</h3>
          <p className="form-help-text">
            Mismo ciclo de trazabilidad: 1. Taller → Bodega (en mal estado) → 2. Bodega → Proveedor
            (a reparar) → 3. Proveedor → Bodega (reparado) → 4. Bodega → Máquina (instalado).
            Cada movimiento deja técnico y unidad.
          </p>
          <form onSubmit={handleCreate}>
            <div className="movimiento-tres-campos">
              <div className="form-group">
                <label htmlFor="mov-tipo">Tipo *</label>
                <SearchableSelect
                  id="mov-tipo"
                  value={idTipo}
                  onChange={setIdTipo}
                  options={tipoOpts}
                  placeholder="Elija el paso del ciclo…"
                  required
                />
                {tipoSel && (
                  <small className="form-help-text">
                    {tipoSel.codigo_origen_83} → {tipoSel.codigo_destino_83}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="mov-unidad">Unidad *</label>
                <SearchableSelect
                  id="mov-unidad"
                  value={idUnidad}
                  onChange={setIdUnidad}
                  options={unidadOpts}
                  placeholder="RD-000001…"
                  required
                  emptyMessage="Cree la unidad primero"
                />
              </div>
              <div className="form-group">
                <label htmlFor="mov-tec">Técnico</label>
                <SearchableSelect
                  id="mov-tec"
                  value={idTecnico}
                  onChange={setIdTecnico}
                  options={[{ value: '', label: 'Sin técnico' }, ...tecOpts]}
                  placeholder="Opcional…"
                  uppercase={false}
                />
              </div>
            </div>
            {(usaMaquina || usaProveedor) && (
              <div className="movimiento-tres-campos">
                {usaMaquina && (
                  <div className="form-group">
                    <label htmlFor="mov-maq">Máquina *</label>
                    <SearchableSelect
                      id="mov-maq"
                      value={idMaquina}
                      onChange={setIdMaquina}
                      options={maqOpts}
                      placeholder="Interno o patente…"
                      required
                    />
                  </div>
                )}
                {usaProveedor && (
                  <div className="form-group">
                    <label htmlFor="mov-prov">Proveedor *</label>
                    <SearchableSelect
                      id="mov-prov"
                      value={idProveedor}
                      onChange={setIdProveedor}
                      options={provOpts}
                      placeholder="Quién repara…"
                      required
                    />
                  </div>
                )}
              </div>
            )}
            <div className="movimiento-tres-campos">
              <div className="form-group">
                <label htmlFor="mov-fecha">Fecha *</label>
                <input id="mov-fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="mov-hora">Hora *</label>
                <input id="mov-hora" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="mov-obs">Observación</label>
                <input
                  id="mov-obs"
                  type="text"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value.toUpperCase())}
                  maxLength={250}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">
                Guardar
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="form-container" role="search" aria-label="Filtros de movimientos" style={{ position: 'relative', zIndex: 5 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
            <label htmlFor="f-desde">Desde</label>
            <input id="f-desde" type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
            <label htmlFor="f-hasta">Hasta</label>
            <input id="f-hasta" type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label htmlFor="f-uni">Unidad</label>
            <SearchableSelect
              id="f-uni"
              value={filtroUnidad}
              onChange={setFiltroUnidad}
              options={[{ value: '', label: 'Todas' }, ...unidadOpts]}
              placeholder="Todas…"
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label htmlFor="f-tipo">Tipo</label>
            <SearchableSelect
              id="f-tipo"
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={[{ value: '', label: 'Todos' }, ...tipoOpts]}
              placeholder="Todos…"
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label htmlFor="f-tec">Técnico</label>
            <SearchableSelect
              id="f-tec"
              value={filtroTecnico}
              onChange={setFiltroTecnico}
              options={[{ value: '', label: 'Todos' }, ...tecOpts]}
              placeholder="Todos…"
              uppercase={false}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label htmlFor="f-maq">Máquina</label>
            <SearchableSelect
              id="f-maq"
              value={filtroMaquina}
              onChange={setFiltroMaquina}
              options={[{ value: '', label: 'Todas' }, ...maqOpts]}
              placeholder="Todas…"
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 100%' }}>
            <label htmlFor="f-txt">Búsqueda</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                id="f-txt"
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Origen, destino, observación…"
                style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 4, border: '1px solid #ced4da' }}
              />
              {hayFiltros && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setFiltro('');
                    setFiltroFechaDesde('');
                    setFiltroFechaHasta('');
                    setFiltroUnidad('');
                    setFiltroTipo('');
                    setFiltroTecnico('');
                    setFiltroMaquina('');
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 14 }}>
          Mostrando <strong>{processed.length}</strong> de {items.length}
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Unidad</th>
              <th>Tipo pieza</th>
              <th>Movimiento</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Máquina</th>
              <th>Proveedor</th>
              <th>Técnico</th>
              <th>Obs.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={11}>Cargando...</td>
              </tr>
            ) : processed.length === 0 ? (
              <tr>
                <td colSpan={11}>{hayFiltros ? 'No hay movimientos con esos filtros' : 'No hay movimientos'}</td>
              </tr>
            ) : (
              processed.map((m) => (
                <tr key={m.idmovimiento_84}>
                  <td>
                    {toFechaISO(String(m.fecha_84))
                      ? new Date(m.fecha_84).toLocaleDateString('es-CL')
                      : 'N/A'}{' '}
                    {String(m.hora_84 || '').slice(0, 5)}
                  </td>
                  <td>
                    <strong>{m.codigo_81}</strong>
                  </td>
                  <td>{m.nombre_tipo_57}</td>
                  <td>
                    {m.tipo_codigo} — {m.tipo_descripcion}
                  </td>
                  <td>{m.origen_descripcion}</td>
                  <td>{m.destino_descripcion}</td>
                  <td>
                    {m.maquina_numinterno || '—'}
                    {m.maquina_ppu ? ` (${m.maquina_ppu})` : ''}
                  </td>
                  <td>{m.proveedor_nombre || '—'}</td>
                  <td>{m.tecnico_nombre || '—'}</td>
                  <td title={m.observacion_84 || ''}>{m.observacion_84 || '—'}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(m.idmovimiento_84)}
                      aria-label="Eliminar movimiento"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MovimientoRepuestoView;
