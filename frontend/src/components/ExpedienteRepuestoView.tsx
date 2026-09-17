import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

type Estado =
  | 'MAQUINA_A_BODEGA'
  | 'BODEGA_A_PROVEEDOR'
  | 'PROVEEDOR_A_BODEGA'
  | 'BODEGA_A_MAQUINA';

const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'MAQUINA_A_BODEGA', label: 'Máquina → Bodega' },
  { value: 'BODEGA_A_PROVEEDOR', label: 'Bodega → Proveedor' },
  { value: 'PROVEEDOR_A_BODEGA', label: 'Proveedor → Bodega' },
  { value: 'BODEGA_A_MAQUINA', label: 'Bodega → Máquina' },
];

const SIGUIENTE: Record<Estado, Estado | null> = {
  MAQUINA_A_BODEGA: 'BODEGA_A_PROVEEDOR',
  BODEGA_A_PROVEEDOR: 'PROVEEDOR_A_BODEGA',
  PROVEEDOR_A_BODEGA: 'BODEGA_A_MAQUINA',
  BODEGA_A_MAQUINA: null,
};

function labelEstado(v: string) {
  return ESTADOS.find((e) => e.value === v)?.label || v;
}

interface Expediente {
  idexpediente_86: number;
  folio_86?: string;
  estado_86: Estado;
  idmaquina_86: number;
  idtecnico_86: number;
  idresponsable_86: number;
  idrepuestodanado_86: number;
  observacion_86?: string | null;
  fecha_recepcion_86: string;
  hora_86: string;
  idproveedor_86?: number | null;
  fecha_entrega_proveedor_86?: string | null;
  fecha_vuelta_86?: string | null;
  valor_reparacion_86?: number | null;
  fecha_instalacion_86?: string | null;
  idtecnico_instalacion_86?: number | null;
  idmaquina_instalacion_86?: number | null;
  motivo_86?: string | null;
  observacion_instalacion_86?: string | null;
  maquina_numinterno?: string;
  tecnico_nombre?: string;
  responsable_nombre?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  proveedor_nombre?: string;
  dias_en_proveedor?: number | null;
}

interface Historial {
  idhistorial_87: number;
  estado_anterior_87?: string | null;
  estado_nuevo_87: string;
  creado_en: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_URL = apiUrl('/expedientes-repuesto');
const hoyISO = () => new Date().toISOString().slice(0, 10);
const horaNow = () => new Date().toTimeString().slice(0, 5);
const fechaISO = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
const formatCLP = (n?: number | null) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const parseMoney = (raw: string) => {
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const ExpedienteRepuestoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<Expediente[]>([]);
  const [maquinas, setMaquinas] = useState<Array<{
    idmaquina_11: number;
    numinterno_11?: string;
    descripcion_11?: string;
    estado_11?: boolean;
  }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{
    id_tecnico_21: number;
    nombres_21: string;
    a_paterno_21?: string;
    a_materno_21?: string;
    estado_21?: boolean;
  }>>([]);
  const [responsables, setResponsables] = useState<Array<{
    idresponsableentrega_08: number;
    nombreresponsableentrega_08: string;
    apaternoresponsableentrega_08?: string;
    amaternoresponsableentrega_08?: string;
  }>>([]);
  const [proveedores, setProveedores] = useState<Array<{
    idproveedor_58: number;
    nombre_58: string;
    activo_58: boolean;
  }>>([]);
  const [repuestos, setRepuestos] = useState<Array<{
    idrepuestodanado_57: number;
    codigo_57?: string | null;
    nombre_57: string;
    activo_57: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idMaquina, setIdMaquina] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [idRepuesto, setIdRepuesto] = useState('');
  const [fechaRecepcion, setFechaRecepcion] = useState(hoyISO());
  const [hora, setHora] = useState(horaNow());
  const [observacion, setObservacion] = useState('');
  const [estado, setEstado] = useState<Estado>('MAQUINA_A_BODEGA');
  const [estadoGuardado, setEstadoGuardado] = useState<Estado>('MAQUINA_A_BODEGA');
  const [idProveedor, setIdProveedor] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [fechaVuelta, setFechaVuelta] = useState('');
  const [valorReparacion, setValorReparacion] = useState('');
  const [fechaInstalacion, setFechaInstalacion] = useState('');
  const [idTecnicoInst, setIdTecnicoInst] = useState('');
  const [idMaquinaInst, setIdMaquinaInst] = useState('');
  const [motivo, setMotivo] = useState('');
  const [obsInst, setObsInst] = useState('');

  const origenCongelado = Boolean(editingId && estadoGuardado !== 'MAQUINA_A_BODEGA');

  const maquinaOptions = useMemo(
    () =>
      maquinas
        .filter((m) => m.estado_11 !== false)
        .map((m) => ({
          value: String(m.idmaquina_11),
          label: `${m.numinterno_11 || m.idmaquina_11} ${m.descripcion_11 ? `(${m.descripcion_11})` : ''}`.trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [maquinas]
  );
  const tecnicoOptions = useMemo(
    () =>
      tecnicos
        .filter((t) => t.estado_21 !== false)
        .map((t) => ({
          value: String(t.id_tecnico_21),
          label: `${t.nombres_21} ${t.a_paterno_21 || ''} ${t.a_materno_21 || ''}`.trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [tecnicos]
  );
  const responsableOptions = useMemo(
    () =>
      responsables
        .map((r) => ({
          value: String(r.idresponsableentrega_08),
          label: `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''}`.trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [responsables]
  );
  const repuestoOptions = useMemo(
    () =>
      repuestos
        .filter((r) => r.activo_57 !== false)
        .map((r) => ({
          value: String(r.idrepuestodanado_57),
          label: `${r.codigo_57 || ''} — ${r.nombre_57}`.replace(/^ — /, ''),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [repuestos]
  );
  const proveedorOptions = useMemo(
    () =>
      proveedores
        .filter((p) => p.activo_58 !== false)
        .map((p) => ({ value: String(p.idproveedor_58), label: p.nombre_58 }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [proveedores]
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [rExp, rMaq, rTec, rResp, rProv, rRep] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(apiUrl('/maquinas')),
        apiFetch(apiUrl('/tecnicos')),
        apiFetch(apiUrl('/responsables-entrega')),
        apiFetch(apiUrl('/proveedores')),
        apiFetch(apiUrl('/repuestos-danados')),
      ]);
      const [dExp, dMaq, dTec, dResp, dProv, dRep] = await Promise.all([
        rExp.json(), rMaq.json(), rTec.json(), rResp.json(), rProv.json(), rRep.json(),
      ]);
      if (dExp.success && Array.isArray(dExp.data)) setRegistros(dExp.data);
      else setError(dExp.error || 'Error al cargar expedientes');
      if (dMaq.success && Array.isArray(dMaq.data)) setMaquinas(dMaq.data);
      if (dTec.success && Array.isArray(dTec.data)) setTecnicos(dTec.data);
      if (dResp.success && Array.isArray(dResp.data)) setResponsables(dResp.data);
      if (dProv.success && Array.isArray(dProv.data)) setProveedores(dProv.data);
      if (dRep.success && Array.isArray(dRep.data)) setRepuestos(dRep.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return registros.filter((r) => {
      if (filtroEstado && r.estado_86 !== filtroEstado) return false;
      if (!q) return true;
      return (
        String(r.folio_86 || '').toLowerCase().includes(q) ||
        (r.maquina_numinterno || '').toLowerCase().includes(q) ||
        (r.tecnico_nombre || '').toLowerCase().includes(q) ||
        (r.responsable_nombre || '').toLowerCase().includes(q) ||
        (r.repuesto_nombre || '').toLowerCase().includes(q) ||
        (r.proveedor_nombre || '').toLowerCase().includes(q)
      );
    });
  }, [registros, searchTerm, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetForm = () => {
    setEditingId(null);
    setHistorial([]);
    setIdMaquina('');
    setIdTecnico('');
    setIdResponsable('');
    setIdRepuesto('');
    setFechaRecepcion(hoyISO());
    setHora(horaNow());
    setObservacion('');
    setEstado('MAQUINA_A_BODEGA');
    setEstadoGuardado('MAQUINA_A_BODEGA');
    setIdProveedor('');
    setFechaEntrega('');
    setFechaVuelta('');
    setValorReparacion('');
    setFechaInstalacion('');
    setIdTecnicoInst('');
    setIdMaquinaInst('');
    setMotivo('');
    setObsInst('');
    setShowForm(false);
  };

  const fillForm = (e: Expediente, hist: Historial[] = []) => {
    setEditingId(e.idexpediente_86);
    setHistorial(hist);
    setIdMaquina(String(e.idmaquina_86));
    setIdTecnico(String(e.idtecnico_86));
    setIdResponsable(String(e.idresponsable_86));
    setIdRepuesto(String(e.idrepuestodanado_86));
    setFechaRecepcion(fechaISO(e.fecha_recepcion_86));
    setHora(String(e.hora_86 || '').slice(0, 5));
    setObservacion(e.observacion_86 || '');
    setEstado(e.estado_86);
    setEstadoGuardado(e.estado_86);
    setIdProveedor(e.idproveedor_86 ? String(e.idproveedor_86) : '');
    setFechaEntrega(fechaISO(e.fecha_entrega_proveedor_86));
    setFechaVuelta(fechaISO(e.fecha_vuelta_86));
    setValorReparacion(e.valor_reparacion_86 == null ? '' : String(e.valor_reparacion_86));
    setFechaInstalacion(fechaISO(e.fecha_instalacion_86));
    setIdTecnicoInst(e.idtecnico_instalacion_86 ? String(e.idtecnico_instalacion_86) : '');
    setIdMaquinaInst(e.idmaquina_instalacion_86 ? String(e.idmaquina_instalacion_86) : String(e.idmaquina_86));
    setMotivo(e.motivo_86 || '');
    setObsInst(e.observacion_instalacion_86 || '');
    setShowForm(true);
  };

  const startEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ expediente: Expediente; historial: Historial[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar');
        return;
      }
      fillForm(data.data.expediente, data.data.historial);
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!idMaquina || !idTecnico || !idResponsable || !idRepuesto) {
      await showError('Validación', 'Complete máquina, técnico, responsable y tipo de repuesto');
      return;
    }
    if (ESTADOS.findIndex((e) => e.value === estado) >= 2 && parseMoney(valorReparacion) == null) {
      await showError('Validación', 'Indique el valor de reparación (0 si es garantía o no cobró)');
      return;
    }
    const payload: Record<string, unknown> = {
      estado_86: estado,
      idmaquina_86: Number(idMaquina),
      idtecnico_86: Number(idTecnico),
      idresponsable_86: Number(idResponsable),
      idrepuestodanado_86: Number(idRepuesto),
      fecha_recepcion_86: fechaRecepcion,
      hora_86: hora,
      observacion_86: observacion.trim() || null,
      idproveedor_86: idProveedor ? Number(idProveedor) : null,
      fecha_entrega_proveedor_86: fechaEntrega || null,
      fecha_vuelta_86: fechaVuelta || null,
      valor_reparacion_86: parseMoney(valorReparacion),
      fecha_instalacion_86: fechaInstalacion || null,
      idtecnico_instalacion_86: idTecnicoInst ? Number(idTecnicoInst) : null,
      idmaquina_instalacion_86: idMaquinaInst ? Number(idMaquinaInst) : null,
      motivo_86: motivo.trim() || null,
      observacion_instalacion_86: obsInst.trim() || null,
    };
    try {
      const res = await apiFetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (!data.success) {
        await showError('Error', data.error || 'No se pudo guardar');
        return;
      }
      await showSuccess('Listo', editingId ? 'Expediente actualizado' : 'Expediente creado');
      resetForm();
      fetchAll();
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('este expediente (solo si aún no salió a proveedor)');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (!data.success) {
        await showError('Error', data.error || 'No se pudo eliminar');
        return;
      }
      await showSuccess('Listo', 'Expediente eliminado');
      fetchAll();
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const idx = ESTADOS.findIndex((e) => e.value === estado);
  const idxGuardado = ESTADOS.findIndex((e) => e.value === estadoGuardado);
  const opcionesEstado = ESTADOS.filter((_, i) => i <= idxGuardado + (SIGUIENTE[estadoGuardado] ? 1 : 0));
  const mostrarProveedor = idx >= 1;
  const mostrarVuelta = idx >= 2;
  const mostrarInstalacion = idx >= 3;
  const freezeProv = idxGuardado >= 1;
  const freezeVuelta = idxGuardado >= 2;
  const freezeValor = idxGuardado >= 3;
  const freezeInst = idxGuardado >= 3;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Tablero de expedientes</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + Nuevo
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>Salir</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? `Expediente ${registros.find((r) => r.idexpediente_86 === editingId)?.folio_86 || ''}` : 'Nuevo expediente (Máquina → Bodega)'}</h3>
          <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
            Un viaje = una fila. Las fechas ya grabadas no se pisan. Un daño nuevo después de instalar es otro expediente.
          </p>
          <form ref={formRef} onSubmit={handleSubmit}>
            {editingId && (
              <div className="form-group" style={{ maxWidth: 360 }}>
                <label htmlFor="exp-estado">Estado</label>
                <select
                  id="exp-estado"
                  className="form-input"
                  value={estado}
                  onChange={(e) => {
                    const next = e.target.value as Estado;
                    setEstado(next);
                    if (next !== 'MAQUINA_A_BODEGA' && !idMaquinaInst) setIdMaquinaInst(idMaquina);
                  }}
                >
                  {opcionesEstado.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="exp-maq">Máquina *</label>
                <SearchableSelect
                  id="exp-maq"
                  value={idMaquina}
                  onChange={(v) => { setIdMaquina(v); if (!idMaquinaInst) setIdMaquinaInst(v); }}
                  options={maquinaOptions}
                  placeholder="Buscar máquina..."
                  required
                  disabled={origenCongelado}
                  aria-label="Máquina de origen"
                />
              </div>
              <div className="form-group">
                <label htmlFor="exp-tec">Técnico *</label>
                <SearchableSelect
                  id="exp-tec"
                  value={idTecnico}
                  onChange={setIdTecnico}
                  options={tecnicoOptions}
                  placeholder="Buscar técnico..."
                  required
                  disabled={origenCongelado}
                  aria-label="Técnico de origen"
                />
              </div>
              <div className="form-group">
                <label htmlFor="exp-resp">Responsable bodega *</label>
                <SearchableSelect
                  id="exp-resp"
                  value={idResponsable}
                  onChange={setIdResponsable}
                  options={responsableOptions}
                  placeholder="Buscar responsable..."
                  required
                  disabled={origenCongelado}
                  aria-label="Responsable de entrega"
                />
              </div>
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="exp-rep">Tipo de repuesto *</label>
                <SearchableSelect
                  id="exp-rep"
                  value={idRepuesto}
                  onChange={setIdRepuesto}
                  options={repuestoOptions}
                  placeholder="Buscar repuesto..."
                  required
                  disabled={origenCongelado}
                  aria-label="Tipo de repuesto dañado"
                />
              </div>
              <div className="form-group">
                <label htmlFor="exp-fecha">Fecha recepción *</label>
                <input id="exp-fecha" className="form-input" type="date" value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} required disabled={origenCongelado} />
              </div>
              <div className="form-group">
                <label htmlFor="exp-hora">Hora *</label>
                <input id="exp-hora" className="form-input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required disabled={origenCongelado} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="exp-obs">Observación</label>
              <textarea id="exp-obs" className="form-input" rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value.toUpperCase())} />
            </div>

            {mostrarProveedor && (
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label htmlFor="exp-prov">Proveedor / taller *</label>
                  <SearchableSelect
                    id="exp-prov"
                    value={idProveedor}
                    onChange={setIdProveedor}
                    options={proveedorOptions}
                    placeholder="Buscar proveedor..."
                    required={!freezeProv}
                    disabled={freezeProv}
                    aria-label="Proveedor"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exp-fent">Fecha entrega *</label>
                  <input id="exp-fent" className="form-input" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} required={!freezeProv} disabled={freezeProv} />
                </div>
              </div>
            )}

            {mostrarVuelta && (
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label htmlFor="exp-fvu">Fecha de vuelta *</label>
                  <input id="exp-fvu" className="form-input" type="date" value={fechaVuelta} onChange={(e) => setFechaVuelta(e.target.value)} required={!freezeVuelta} disabled={freezeVuelta} />
                </div>
                <div className="form-group">
                  <label htmlFor="exp-valor">Valor reparación (CLP) *</label>
                  <input
                    id="exp-valor"
                    className="form-input"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={valorReparacion}
                    onChange={(e) => setValorReparacion(e.target.value)}
                    required={!freezeValor}
                    disabled={freezeValor}
                    aria-describedby="exp-valor-help"
                  />
                  <small id="exp-valor-help" style={{ color: '#6b7280' }}>0 si es garantía o no cobró</small>
                </div>
              </div>
            )}

            {mostrarInstalacion && (
              <>
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label htmlFor="exp-finst">Fecha instalación *</label>
                    <input id="exp-finst" className="form-input" type="date" value={fechaInstalacion} onChange={(e) => setFechaInstalacion(e.target.value)} required={!freezeInst} disabled={freezeInst} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exp-tecinst">Técnico instalación *</label>
                    <SearchableSelect id="exp-tecinst" value={idTecnicoInst} onChange={setIdTecnicoInst} options={tecnicoOptions} placeholder="Buscar técnico..." required={!freezeInst} disabled={freezeInst} aria-label="Técnico instalación" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exp-maqinst">Máquina instalación *</label>
                    <SearchableSelect id="exp-maqinst" value={idMaquinaInst} onChange={setIdMaquinaInst} options={maquinaOptions} placeholder="Buscar máquina..." required={!freezeInst} disabled={freezeInst} aria-label="Máquina instalación" />
                  </div>
                </div>
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label htmlFor="exp-mot">Motivo</label>
                    <input id="exp-mot" className="form-input" value={motivo} onChange={(e) => setMotivo(e.target.value.toUpperCase())} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="exp-obsinst">Observación instalación</label>
                    <input id="exp-obsinst" className="form-input" value={obsInst} onChange={(e) => setObsInst(e.target.value.toUpperCase())} />
                  </div>
                </div>
              </>
            )}

            {historial.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ marginBottom: 8 }}>Historia de este viaje</h4>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
                  {historial.map((h) => (
                    <li key={h.idhistorial_87}>
                      {String(h.creado_en).slice(0, 16).replace('T', ' ')} — {h.estado_anterior_87 ? `${labelEstado(h.estado_anterior_87)} → ` : ''}
                      {labelEstado(h.estado_nuevo_87)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Crear'}</button>
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
          <label htmlFor="filtro-est">Estado</label>
          <select id="filtro-est" className="form-input" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setCurrentPage(1); }}>
            <option value="">Todos ({registros.length})</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label} ({registros.filter((r) => r.estado_86 === e.value).length})
              </option>
            ))}
          </select>
        </div>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Buscar folio, máquina, técnico, repuesto..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value.toUpperCase()); setCurrentPage(1); }}
          aria-label="Buscar expedientes"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Estado</th>
              <th>Máquina</th>
              <th>Repuesto</th>
              <th>Responsable</th>
              <th>Proveedor</th>
              <th>Valor</th>
              <th>Recepción</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>Cargando...</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={9}>No hay expedientes. Use Nuevo para Máquina → Bodega.</td></tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.idexpediente_86}>
                  <td>{r.folio_86}</td>
                  <td>{labelEstado(r.estado_86)}</td>
                  <td>{r.maquina_numinterno}</td>
                  <td>{r.repuesto_codigo ? `${r.repuesto_codigo} — ` : ''}{r.repuesto_nombre}</td>
                  <td>{r.responsable_nombre}</td>
                  <td>{r.proveedor_nombre || '—'}</td>
                  <td>{r.valor_reparacion_86 == null ? '—' : formatCLP(r.valor_reparacion_86)}</td>
                  <td>{fechaISO(r.fecha_recepcion_86)}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" title="Editar / avanzar" aria-label={`Editar ${r.folio_86}`} onClick={() => startEdit(r.idexpediente_86)}>✏️</button>
                    {r.estado_86 === 'MAQUINA_A_BODEGA' && (
                      <button type="button" className="btn-delete" title="Eliminar" aria-label={`Eliminar ${r.folio_86}`} onClick={() => handleDelete(r.idexpediente_86)}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

export default ExpedienteRepuestoView;
