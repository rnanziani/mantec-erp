import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface LineaGrid {
  iddetalle_64: number;
  identrega_64: number;
  iddetalle_recepcion_64: number;
  idestado_reparacion_64: number;
  fecha_recepcion_64?: string | null;
  valor_reparacion_64?: number;
  folio_entrega?: string;
  folio_recepcion?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60?: number;
  estado_nombre?: string;
  fecha_entrega_63?: string;
  hora_63?: string;
  responsable_nombre?: string;
  proveedor_nombre?: string;
  dias_transcurridos?: number;
  semaforo_color?: string | null;
  semaforo_nombre?: string | null;
}

interface Pendiente {
  iddetalle_60: number;
  folio_59?: string | null;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60: number;
}

interface EstadoOpt {
  idestado_61: number;
  codigo_61: string;
  nombre_61: string;
  activo_61: boolean;
}

interface DetalleForm {
  iddetalle_recepcion_64: number;
  idestado_reparacion_64: number;
  fecha_recepcion_64: string;
  valor_unitario: string;
  label: string;
  cantidad: number;
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const parseMoney = (raw: string) => {
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const unitarioDesdeTotal = (total: number, cantidad: number) => {
  const cant = Math.max(1, Number(cantidad) || 1);
  const t = Number(total) || 0;
  return String(Math.round((t / cant) * 100) / 100);
};

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const EntregaRepuestoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [lineas, setLineas] = useState<LineaGrid[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [estados, setEstados] = useState<EstadoOpt[]>([]);
  const [responsables, setResponsables] = useState<
    Array<{
      idresponsableentrega_08: number;
      nombreresponsableentrega_08: string;
      apaternoresponsableentrega_08?: string;
      amaternoresponsableentrega_08?: string;
    }>
  >([]);
  const [proveedores, setProveedores] = useState<
    Array<{ idproveedor_58: number; nombre_58: string; activo_58: boolean }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [idResponsable, setIdResponsable] = useState('');
  const [idProveedor, setIdProveedor] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<DetalleForm[]>([]);
  const [pendienteSel, setPendienteSel] = useState('');

  const API_URL = apiUrl('/entregas-repuestos');

  const estadoDefaultId = useMemo(() => {
    const e = estados.find((x) => x.codigo_61 === 'EN_REPARACION' && x.activo_61);
    return e?.idestado_61 || estados.find((x) => x.activo_61)?.idestado_61 || 0;
  }, [estados]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [rLin, rPend, rEst, rResp, rProv] = await Promise.all([
        apiFetch(`${API_URL}/lineas`),
        apiFetch(`${API_URL}/pendientes-recepcion`),
        apiFetch(apiUrl('/estados-reparacion')),
        apiFetch(apiUrl('/responsables-entrega')),
        apiFetch(apiUrl('/proveedores')),
      ]);
      const [dLin, dPend, dEst, dResp, dProv] = await Promise.all([
        rLin.json(),
        rPend.json(),
        rEst.json(),
        rResp.json(),
        rProv.json(),
      ]);
      if (dLin.success && Array.isArray(dLin.data)) setLineas(dLin.data);
      else setError(dLin.error || 'Error al cargar entregas');
      if (dPend.success && Array.isArray(dPend.data)) setPendientes(dPend.data);
      if (dEst.success && Array.isArray(dEst.data)) setEstados(dEst.data);
      if (dResp.success && Array.isArray(dResp.data)) setResponsables(dResp.data);
      if (dProv.success && Array.isArray(dProv.data)) setProveedores(dProv.data);
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
    if (!q) return lineas;
    return lineas.filter(
      (r) =>
        String(r.folio_entrega || '').toLowerCase().includes(q) ||
        String(r.folio_recepcion || '').toLowerCase().includes(q) ||
        (r.repuesto_codigo || '').toLowerCase().includes(q) ||
        (r.repuesto_nombre || '').toLowerCase().includes(q) ||
        (r.proveedor_nombre || '').toLowerCase().includes(q) ||
        (r.responsable_nombre || '').toLowerCase().includes(q)
    );
  }, [lineas, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setIdResponsable('');
    setIdProveedor('');
    setFechaEntrega(new Date().toISOString().slice(0, 10));
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setDetalles([]);
    setPendienteSel('');
  };

  const addPendiente = () => {
    const id = Number(pendienteSel);
    if (!id) {
      showError('Validación', 'Seleccione una línea pendiente de recepción');
      return;
    }
    if (detalles.some((d) => d.iddetalle_recepcion_64 === id)) {
      showError('Validación', 'Esa línea ya está en el detalle');
      return;
    }
    const p = pendientes.find((x) => x.iddetalle_60 === id);
    if (!p) {
      showError('Validación', 'Línea no encontrada');
      return;
    }
    setDetalles((prev) => [
      ...prev,
      {
        iddetalle_recepcion_64: id,
        idestado_reparacion_64: estadoDefaultId,
        fecha_recepcion_64: '',
        valor_unitario: '0',
        label: `${p.folio_59 || ''} · ${p.repuesto_codigo || ''} ${p.repuesto_nombre || ''} (x${p.cantidad_60})`,
        cantidad: p.cantidad_60,
      },
    ]);
    setPendienteSel('');
  };

  const startEdit = async (identrega: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${identrega}`);
      const data: ApiResponse<{
        maestro: {
          identrega_63: number;
          idresponsable_63: number;
          idproveedor_63: number;
          fecha_entrega_63: string;
          hora_63: string;
          observacion_63?: string | null;
        };
        detalles: Array<{
          iddetalle_recepcion_64: number;
          idestado_reparacion_64: number;
          fecha_recepcion_64?: string | null;
          valor_reparacion_64?: number | null;
          folio_recepcion?: string;
          repuesto_codigo?: string;
          repuesto_nombre?: string;
          cantidad_60?: number;
        }>;
      }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar');
        return;
      }
      const { maestro, detalles: dets } = data.data;
      setEditingId(identrega);
      setIdResponsable(String(maestro.idresponsable_63));
      setIdProveedor(String(maestro.idproveedor_63));
      setFechaEntrega(String(maestro.fecha_entrega_63).slice(0, 10));
      setHora(String(maestro.hora_63).slice(0, 5));
      setObservacion(maestro.observacion_63 || '');
      setDetalles(
        (dets || []).map((d) => ({
          iddetalle_recepcion_64: d.iddetalle_recepcion_64,
          idestado_reparacion_64: d.idestado_reparacion_64,
          fecha_recepcion_64: d.fecha_recepcion_64
            ? String(d.fecha_recepcion_64).slice(0, 10)
            : '',
          valor_unitario: unitarioDesdeTotal(Number(d.valor_reparacion_64 ?? 0), d.cantidad_60 || 1),
          label: `${d.folio_recepcion || ''} · ${d.repuesto_codigo || ''} ${d.repuesto_nombre || ''} (x${d.cantidad_60 || 1})`,
          cantidad: d.cantidad_60 || 1,
        }))
      );
      setShowForm(true);
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idResponsable || !idProveedor) {
      await showError('Validación', 'Complete responsable y proveedor');
      return;
    }
    if (!detalles.length) {
      await showError('Validación', 'Agregue al menos un repuesto pendiente');
      return;
    }
    if (detalles.some((d) => !d.idestado_reparacion_64)) {
      await showError('Validación', 'Cada línea necesita estado de reparación');
      return;
    }
    const payload = {
      idresponsable_63: Number(idResponsable),
      idproveedor_63: Number(idProveedor),
      fecha_entrega_63: fechaEntrega || null,
      hora_63: hora || null,
      observacion_63: observacion.trim() || null,
      detalles: detalles.map((d) => ({
        iddetalle_recepcion_64: d.iddetalle_recepcion_64,
        idestado_reparacion_64: d.idestado_reparacion_64,
        fecha_recepcion_64: d.fecha_recepcion_64 || null,
        valor_reparacion_64: parseMoney(d.valor_unitario),
        observacion_64: null,
      })),
    };
    setSaving(true);
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess(editingId ? 'Actualizado' : 'Creado', data.message || 'OK');
      } else {
        await showError('Error', data.error || data.message || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (identrega: number) => {
    const ok = await showDeleteConfirm('esta entrega a proveedor');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${identrega}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Eliminado', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const pendientesDisponibles = pendientes.filter(
    (p) => !detalles.some((d) => d.iddetalle_recepcion_64 === p.iddetalle_60)
  );

  if (loading) return <div className="loading">Cargando entregas...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Entrega a proveedor (reparación)</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Nueva entrega
          </button>
          <button
            type="button"
            className="btn-success"
            disabled={!showForm || saving}
            onClick={() => formRef.current?.requestSubmit()}
          >
            Guardar
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              window.location.hash = 'dashboard';
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? `Editar entrega #${editingId}` : 'Nueva entrega a proveedor'}</h3>
          <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
            Solo aparecen líneas de recepción en estado <strong>PENDIENTE</strong>. Al guardar pasan a{' '}
            <strong>ENVIADO_PROVEEDOR</strong>. Si completa fecha de recepción, el contador de días se congela.
          </p>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idresponsable_63">Responsable entrega *</label>
                <select
                  id="idresponsable_63"
                  className="form-input"
                  required
                  value={idResponsable}
                  onChange={(e) => setIdResponsable(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {responsables.map((r) => (
                    <option key={r.idresponsableentrega_08} value={r.idresponsableentrega_08}>
                      {r.nombreresponsableentrega_08} {r.apaternoresponsableentrega_08 || ''}{' '}
                      {r.amaternoresponsableentrega_08 || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="idproveedor_63">Proveedor que repara *</label>
                <select
                  id="idproveedor_63"
                  className="form-input"
                  required
                  value={idProveedor}
                  onChange={(e) => setIdProveedor(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {proveedores
                    .filter((p) => p.activo_58)
                    .map((p) => (
                      <option key={p.idproveedor_58} value={p.idproveedor_58}>
                        {p.nombre_58}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="fecha_entrega_63">Fecha entrega *</label>
                <input
                  id="fecha_entrega_63"
                  type="date"
                  className="form-input"
                  required
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hora_63">Hora *</label>
                <input
                  id="hora_63"
                  type="time"
                  className="form-input"
                  required
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="observacion_63">Observación</label>
                <input
                  id="observacion_63"
                  className="form-input"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row form-row-3" style={{ alignItems: 'end' }}>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label htmlFor="pendiente_sel">Agregar línea pendiente (recepción etapa 1)</label>
                <select
                  id="pendiente_sel"
                  className="form-input"
                  value={pendienteSel}
                  onChange={(e) => setPendienteSel(e.target.value)}
                >
                  <option value="">Seleccione línea PENDIENTE...</option>
                  {pendientesDisponibles.map((p) => (
                    <option key={p.iddetalle_60} value={p.iddetalle_60}>
                      {p.folio_59} · {p.repuesto_codigo} {p.repuesto_nombre} (x{p.cantidad_60})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <button type="button" className="btn-primary" onClick={addPendiente}>
                  + Agregar
                </button>
              </div>
            </div>

            <div className="table-container" style={{ marginBottom: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Repuesto (recepción)</th>
                    <th>Estado reparación</th>
                    <th>Fecha recepción</th>
                    <th>Valor unitario</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Sin líneas. Agregue al menos un repuesto pendiente.</td>
                    </tr>
                  ) : (
                    detalles.map((d) => (
                      <tr key={d.iddetalle_recepcion_64}>
                        <td>{d.label}</td>
                        <td>
                          <select
                            className="form-input"
                            value={d.idestado_reparacion_64}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setDetalles((prev) =>
                                prev.map((x) =>
                                  x.iddetalle_recepcion_64 === d.iddetalle_recepcion_64
                                    ? { ...x, idestado_reparacion_64: v }
                                    : x
                                )
                              );
                            }}
                            aria-label="Estado de reparación"
                          >
                            {estados
                              .filter((e) => e.activo_61)
                              .map((e) => (
                                <option key={e.idestado_61} value={e.idestado_61}>
                                  {e.nombre_61}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            className="form-input"
                            value={d.fecha_recepcion_64}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDetalles((prev) =>
                                prev.map((x) =>
                                  x.iddetalle_recepcion_64 === d.iddetalle_recepcion_64
                                    ? { ...x, fecha_recepcion_64: v }
                                    : x
                                )
                              );
                            }}
                            aria-label="Fecha de recepción del proveedor"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            className="form-input"
                            value={d.valor_unitario}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDetalles((prev) =>
                                prev.map((x) =>
                                  x.iddetalle_recepcion_64 === d.iddetalle_recepcion_64
                                    ? { ...x, valor_unitario: v }
                                    : x
                                )
                              );
                            }}
                            aria-label={`Valor unitario de ${d.label}`}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <strong>
                            {formatCLP(parseMoney(d.valor_unitario) * Math.max(1, d.cantidad || 1))}
                          </strong>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {formatCLP(parseMoney(d.valor_unitario))} × {d.cantidad || 1}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() =>
                              setDetalles((prev) =>
                                prev.filter(
                                  (x) => x.iddetalle_recepcion_64 !== d.iddetalle_recepcion_64
                                )
                              )
                            }
                            aria-label="Quitar línea"
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

            <div className="form-actions">
              <button type="submit" className="btn-success" disabled={saving}>
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          placeholder="🔍 BUSCAR POR FOLIO, REPUESTO, PROVEEDOR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar entregas"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Folio entrega</th>
              <th>Repuesto</th>
              <th>Cant.</th>
              <th>Responsable</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Entrega</th>
              <th>Recepción</th>
              <th>Valor</th>
              <th>Días</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={11}>No hay registros</td></tr>
            ) : (
              pageItems.map((t) => (
                <tr
                  key={t.iddetalle_64}
                  style={{
                    backgroundColor: t.semaforo_color ? `${t.semaforo_color}33` : undefined,
                  }}
                  title={t.semaforo_nombre || undefined}
                >
                  <td>
                    <strong>{t.folio_entrega || '-'}</strong>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{t.folio_recepcion}</div>
                  </td>
                  <td>
                    <strong>{t.repuesto_codigo || '-'}</strong> {t.repuesto_nombre}
                  </td>
                  <td>{t.cantidad_60 ?? '-'}</td>
                  <td>{t.responsable_nombre}</td>
                  <td>{t.proveedor_nombre}</td>
                  <td>{t.estado_nombre}</td>
                  <td>
                    {t.fecha_entrega_63 ? String(t.fecha_entrega_63).slice(0, 10) : '-'}
                    <div style={{ fontSize: 12 }}>{t.hora_63 ? String(t.hora_63).slice(0, 5) : ''}</div>
                  </td>
                  <td>
                    {t.fecha_recepcion_64
                      ? String(t.fecha_recepcion_64).slice(0, 10)
                      : '—'}
                  </td>
                  <td>
                    {formatCLP(Number(t.valor_reparacion_64) || 0)}
                  </td>
                  <td>
                    <strong>{t.dias_transcurridos ?? 0}</strong>
                    {t.fecha_recepcion_64 ? (
                      <span style={{ fontSize: 11, display: 'block', color: '#6b7280' }}>
                        congelado
                      </span>
                    ) : null}
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(t.identrega_64)}
                      aria-label="Editar entrega"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(t.identrega_64)}
                      aria-label="Eliminar entrega"
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

export default EntregaRepuestoView;
