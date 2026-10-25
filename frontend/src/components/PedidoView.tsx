import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { filtrarResponsablesActivos } from '../utils/responsablesEntrega';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface Proveedor {
  id_proveedor_90: number;
  razon_social_90: string;
  activo_90: boolean;
}
interface Responsable {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  estado_08?: boolean;
}
interface Sku {
  idcodigo_89: number;
  codigo_89: string;
  descripcion_89: string;
  proveedor_89?: string;
  activo_89?: boolean;
}
interface Detalle {
  id_detalle_91?: number;
  cod_insumo_91?: number | null;
  descripcion_libre_91?: string | null;
  cantidad_solicitada_91: number;
  cantidad_recibida_91?: number;
  precio_unitario_91?: number | null;
  observaciones_det_91?: string | null;
  codigo_89?: string | null;
  descripcion_89?: string;
  proveedor_89?: string;
}
interface Pedido {
  id_pedido_92: number;
  numero_orden_92?: string | null;
  fecha_pedido_92: string;
  id_proveedor_92: number;
  id_responsable_92: number;
  estado_pago_92: string;
  estado_recepcion_92: string;
  observaciones_cab_92?: string | null;
  proveedor_nombre?: string;
  responsable_nombre?: string;
  detalles?: Detalle[];
}
interface Historial {
  id_historial_94: number;
  campo_modificado_94: string;
  valor_anterior_94?: string;
  valor_nuevo_94?: string;
  fecha_modificacion_94: string;
}
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyLinea = {
  cod_insumo_91: '',
  descripcion: '',
  idProveedorLinea: '',
  cantidad: '1',
  precio: '',
  obs: '',
};

/** Pedido: cantidad siempre entera (1, 2, 10). Evita 1,000 / 1.000. */
function cantidadEntera(value: unknown): string {
  const t = String(value ?? '').trim().replace(',', '.');
  if (t === '') return '';
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return '';
  return String(n);
}

function mostrarEntero(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n));
}

const PedidoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idProveedor, setIdProveedor] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [numero, setNumero] = useState('');
  const [obs, setObs] = useState('');
  const [lineas, setLineas] = useState<Array<typeof emptyLinea>>([{ ...emptyLinea }]);

  const [detalleAbierto, setDetalleAbierto] = useState<Pedido | null>(null);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [qtyRecibe, setQtyRecibe] = useState<Record<number, string>>({});
  const [idRecibe, setIdRecibe] = useState('');

  const API = apiUrl('/pedidos');

  const nombreResp = (r: Responsable) =>
    `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''} ${r.amaternoresponsableentrega_08 || ''}`.trim();

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [pRes, prRes, rRes, sRes] = await Promise.all([
        apiFetch(API),
        apiFetch(apiUrl('/proveedores-pedido?activos=1')),
        apiFetch(apiUrl('/responsables-entrega?activo=1')),
        apiFetch(apiUrl('/codigos-etiqueta?activos=1')),
      ]);
      const pData: ApiResponse<Pedido[]> = await pRes.json();
      const prData: ApiResponse<Proveedor[]> = await prRes.json();
      const rData: ApiResponse<Responsable[]> = await rRes.json();
      const sData: ApiResponse<Sku[]> = await sRes.json();
      if (pData.success && Array.isArray(pData.data)) setPedidos(pData.data);
      else setError(pData.error || 'Error al cargar pedidos');
      if (prData.success && Array.isArray(prData.data)) setProveedores(prData.data);
      if (rData.success && Array.isArray(rData.data)) setResponsables(filtrarResponsablesActivos(rData.data));
      if (sData.success && Array.isArray(sData.data)) setSkus(sData.data.filter((s) => s.activo_89 !== false));
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const proveedorOptions = useMemo(
    () => proveedores.map((p) => ({ value: String(p.id_proveedor_90), label: p.razon_social_90 })),
    [proveedores]
  );
  const responsableOptions = useMemo(
    () => responsables.map((r) => ({ value: String(r.idresponsableentrega_08), label: nombreResp(r) })),
    [responsables]
  );
  const skuOptions = useMemo(
    () =>
      skus.map((s) => ({
        value: String(s.idcodigo_89),
        label: `${s.codigo_89} — ${s.descripcion_89}`,
      })),
    [skus]
  );
  const skuPorId = useMemo(() => {
    const m = new Map<string, Sku>();
    skus.forEach((s) => m.set(String(s.idcodigo_89), s));
    return m;
  }, [skus]);

  const matchProveedorId = (nombre?: string | null) => {
    const q = String(nombre || '').trim().toUpperCase();
    if (!q) return '';
    const exact = proveedores.find((p) => p.razon_social_90.trim().toUpperCase() === q);
    if (exact) return String(exact.id_proveedor_90);
    const hits = proveedores.filter((p) => {
      const n = p.razon_social_90.trim().toUpperCase();
      return n.includes(q) || q.includes(n);
    });
    return hits.length === 1 ? String(hits[0].id_proveedor_90) : '';
  };

  const setLinea = (idx: number, patch: Partial<typeof emptyLinea>) => {
    setLineas((rows) => {
      let extra = patch;
      if (Object.prototype.hasOwnProperty.call(patch, 'cod_insumo_91')) {
        const sku = skuPorId.get(String(patch.cod_insumo_91 || ''));
        extra = sku
          ? {
              ...patch,
              idProveedorLinea: matchProveedorId(sku.proveedor_89),
              descripcion: sku.descripcion_89 || '',
            }
          : patch;
      }
      const next = rows.map((r, i) => (i === idx ? { ...r, ...extra } : r));
      const last = next[idx];
      const lastLlena = Boolean(String(last.cod_insumo_91 || '').trim() || last.descripcion.trim());
      if (idx === rows.length - 1 && lastLlena) next.push({ ...emptyLinea });
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return pedidos;
    return pedidos.filter((p) =>
      [p.numero_orden_92, p.proveedor_nombre, p.responsable_nombre, p.estado_pago_92, p.estado_recepcion_92]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [pedidos, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setIdProveedor('');
    setIdResponsable('');
    setFecha(new Date().toISOString().slice(0, 10));
    setNumero('');
    setObs('');
    setLineas([{ ...emptyLinea }]);
    setShowForm(false);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
    setDetalleAbierto(null);
  };

  const startEdit = async (id: number) => {
    const res = await apiFetch(`${API}/${id}`);
    const data: ApiResponse<Pedido> = await res.json();
    if (!data.success || !data.data) {
      await showError('Error', data.error || 'No se pudo abrir el pedido');
      return;
    }
    const p = data.data;
    setEditingId(p.id_pedido_92);
    setIdProveedor(String(p.id_proveedor_92));
    setIdResponsable(String(p.id_responsable_92));
    setFecha(String(p.fecha_pedido_92).slice(0, 10));
    setNumero(p.numero_orden_92 || '');
    setObs(p.observaciones_cab_92 || '');
    setLineas(
      (p.detalles || []).map((d) => ({
        cod_insumo_91: d.cod_insumo_91 ? String(d.cod_insumo_91) : '',
        descripcion: d.cod_insumo_91 ? d.descripcion_89 || '' : d.descripcion_libre_91 || d.descripcion_89 || '',
        idProveedorLinea: matchProveedorId(d.proveedor_89),
        cantidad: cantidadEntera(d.cantidad_solicitada_91) || '1',
        precio: d.precio_unitario_91 != null ? String(d.precio_unitario_91) : '',
        obs: d.observaciones_det_91 || '',
      }))
    );
    setShowForm(true);
    setDetalleAbierto(p);
  };

  const abrirDetalle = async (id: number) => {
    const [rPed, rHis] = await Promise.all([apiFetch(`${API}/${id}`), apiFetch(`${API}/${id}/historial`)]);
    const dPed: ApiResponse<Pedido> = await rPed.json();
    const dHis: ApiResponse<Historial[]> = await rHis.json();
    if (dPed.success && dPed.data) {
      setDetalleAbierto(dPed.data);
      setShowForm(false);
      setIdRecibe('');
      setQtyRecibe({});
    }
    if (dHis.success && Array.isArray(dHis.data)) setHistorial(dHis.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const detalles = lineas
      .filter((l) => (l.cod_insumo_91 || l.descripcion.trim()) && Number(l.cantidad) > 0)
      .map((l) => {
        const sku = l.cod_insumo_91 ? Number(l.cod_insumo_91) : null;
        return {
          cod_insumo_91: sku,
          descripcion_libre_91: sku ? null : l.descripcion.trim().toUpperCase(),
          cantidad_solicitada_91: Math.round(Number(l.cantidad)),
          precio_unitario_91: l.precio === '' ? null : Number(l.precio),
          observaciones_det_91: l.obs || null,
        };
      });
    if (!idProveedor || !idResponsable || detalles.length === 0) {
      await showError('Validación', 'Proveedor, responsable y al menos una línea (SKU o descripción) con cantidad');
      return;
    }
    const payload = {
      id_proveedor_92: Number(idProveedor),
      id_responsable_92: Number(idResponsable),
      fecha_pedido_92: fecha,
      numero_orden_92: numero.trim() || null,
      observaciones_cab_92: obs.trim() || null,
      detalles,
    };
    try {
      const res = await apiFetch(editingId ? `${API}/${editingId}` : API, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess(editingId ? 'Actualizado' : 'Creado', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const postAccion = async (path: string, body?: object) => {
    const res = await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
    const data: ApiResponse<Pedido> = await res.json();
    if (!data.success) {
      await showError('Error', data.error || 'No se pudo completar');
      return;
    }
    await fetchAll();
    if (data.data) setDetalleAbierto(data.data);
    await showSuccess('Listo', data.message || 'OK');
  };

  const handleRecepcion = async (idDetalle: number) => {
    const qty = Math.round(Number(qtyRecibe[idDetalle]));
    if (!idRecibe || !(qty >= 1)) {
      await showError('Validación', 'Indique cantidad y quién recibe');
      return;
    }
    if (!detalleAbierto) return;
    await postAccion(`${API}/${detalleAbierto.id_pedido_92}/recepciones`, {
      id_detalle_91: idDetalle,
      cantidad_recibida_93: qty,
      id_responsable_recibe_93: Number(idRecibe),
    });
    setQtyRecibe((p) => ({ ...p, [idDetalle]: '' }));
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('este pedido');
    if (!ok) return;
    const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    const data: ApiResponse = await res.json();
    if (data.success) {
      await fetchAll();
      setDetalleAbierto(null);
      await showSuccess('Listo', data.message || 'Eliminado');
    } else {
      await showError('Error', data.error || 'No se pudo eliminar');
    }
  };

  if (loading) return <div className="loading">Cargando pedidos...</div>;

  const anulado = detalleAbierto?.estado_recepcion_92 === 'Anulado';

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Pedidos</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            + Nuevo pedido
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
          </button>
          <button
            type="button"
            className="btn-info"
            onClick={() =>
              exportToExcel(
                filtered.map((p) => ({
                  Orden: p.numero_orden_92,
                  Fecha: String(p.fecha_pedido_92).slice(0, 10),
                  Proveedor: p.proveedor_nombre,
                  Pago: p.estado_pago_92,
                  Recepción: p.estado_recepcion_92,
                })),
                'pedidos'
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
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? `Editar ${numero || editingId}` : 'Nuevo pedido'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="id_proveedor_92">Proveedor *</label>
                <SearchableSelect
                  id="id_proveedor_92"
                  value={idProveedor}
                  onChange={setIdProveedor}
                  options={proveedorOptions}
                  placeholder="Buscar proveedor..."
                  emptyMessage={
                    proveedorOptions.length === 0
                      ? 'No hay proveedores. Créelo en Pedidos → Proveedores'
                      : 'No coincide. El proveedor se elige del catálogo, no se escribe aquí'
                  }
                  aria-label="Proveedor"
                />
                <small style={{ color: '#6c757d' }}>
                  Alta en{' '}
                  <button
                    type="button"
                    className="btn-link"
                    style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    onClick={() => {
                      window.location.hash = 'proveedores-pedido';
                    }}
                  >
                    Pedidos → Proveedores
                  </button>
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="id_responsable_92">Responsable *</label>
                <SearchableSelect
                  id="id_responsable_92"
                  value={idResponsable}
                  onChange={setIdResponsable}
                  options={responsableOptions}
                  placeholder="Buscar responsable..."
                  aria-label="Responsable"
                />
              </div>
              <div className="form-group">
                <label htmlFor="fecha_pedido_92">Fecha *</label>
                <input id="fecha_pedido_92" type="date" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="numero_orden_92">N° orden (opcional)</label>
                <input
                  id="numero_orden_92"
                  className="form-input"
                  value={numero}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => changeKeepingCaret(e, setNumero)}
                  placeholder="Se genera PED-000001"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="observaciones_cab_92">Observaciones</label>
                <input
                  id="observaciones_cab_92"
                  className="form-input"
                  value={obs}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => changeKeepingCaret(e, setObs)}
                />
              </div>
            </div>

            <h4>Detalle</h4>
            <p className="form-hint" style={{ marginTop: 0 }}>
              Código de catálogo o, si no existe, solo descripción y cantidad (extensión, unión, fabricar). Queda en el mismo pedido.
            </p>
            <div className="table-container table-container--combos">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descripción</th>
                    <th>Proveedor</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((ln, idx) => (
                      <tr key={idx}>
                        <td style={{ minWidth: 220 }}>
                          <SearchableSelect
                            id={`sku_linea_${idx}`}
                            value={ln.cod_insumo_91}
                            onChange={(v) => setLinea(idx, { cod_insumo_91: v })}
                            options={skuOptions}
                            placeholder="CÓDIGO O VACÍO..."
                            aria-label={`SKU línea ${idx + 1}`}
                          />
                        </td>
                        <td style={{ minWidth: 220 }}>
                          <input
                            id={`desc_linea_${idx}`}
                            className="form-input"
                            value={ln.descripcion}
                            disabled={Boolean(ln.cod_insumo_91)}
                            maxLength={200}
                            style={{ textTransform: 'uppercase' }}
                            placeholder="EXTENSIÓN CORTA..."
                            onChange={(e) => changeKeepingCaret(e, (v) => setLinea(idx, { descripcion: v }))}
                            aria-label={`Descripción línea ${idx + 1}`}
                          />
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <SearchableSelect
                            id={`prov_linea_${idx}`}
                            value={ln.idProveedorLinea}
                            onChange={(v) => setLinea(idx, { idProveedorLinea: v })}
                            options={proveedorOptions}
                            placeholder="PROVEEDOR..."
                            aria-label={`Proveedor línea ${idx + 1}`}
                          />
                        </td>
                        <td style={{ width: 110 }}>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            className="form-input"
                            value={ln.cantidad}
                            onChange={(e) => setLinea(idx, { cantidad: cantidadEntera(e.target.value) })}
                            aria-label={`Cantidad línea ${idx + 1}`}
                          />
                        </td>
                        <td style={{ width: 120 }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input"
                            value={ln.precio}
                            onChange={(e) => setLinea(idx, { precio: e.target.value })}
                            aria-label={`Precio línea ${idx + 1}`}
                          />
                        </td>
                        <td className="actions" style={{ width: 56, textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-delete"
                            title="Quitar línea"
                            aria-label={`Quitar línea ${idx + 1}`}
                            onClick={() =>
                              setLineas((rows) =>
                                rows.length === 1 ? [{ ...emptyLinea }] : rows.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 8 }}
              onClick={() => setLineas((rows) => [...rows, { ...emptyLinea }])}
            >
              + Línea
            </button>
          </form>
        </div>
      )}

      {detalleAbierto && !showForm && (
        <div className="form-container">
          <h3>
            {detalleAbierto.numero_orden_92} — {detalleAbierto.proveedor_nombre}{' '}
            <span className="badge">Pago {detalleAbierto.estado_pago_92}</span>{' '}
            <span className="badge">Recepción {detalleAbierto.estado_recepcion_92}</span>
          </h3>
          {!anulado && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {detalleAbierto.estado_pago_92 !== 'Pagado' && (
                <button
                  type="button"
                  className="btn-success"
                  onClick={() => postAccion(`${API}/${detalleAbierto.id_pedido_92}/pago`, { estado_pago_92: 'Pagado' })}
                >
                  Marcar pagado
                </button>
              )}
              {detalleAbierto.estado_pago_92 === 'Pendiente' && (
                <button
                  type="button"
                  className="btn-info"
                  onClick={() => postAccion(`${API}/${detalleAbierto.id_pedido_92}/pago`, { estado_pago_92: 'Parcial' })}
                >
                  Pago parcial
                </button>
              )}
              {detalleAbierto.estado_recepcion_92 === 'Pendiente' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => postAccion(`${API}/${detalleAbierto.id_pedido_92}/no-retirado`)}
                >
                  No retirado
                </button>
              )}
              <button type="button" className="btn-delete" onClick={() => postAccion(`${API}/${detalleAbierto.id_pedido_92}/anular`)}>
                Anular
              </button>
            </div>
          )}
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label>Quién recibe</label>
            <SearchableSelect
              value={idRecibe}
              onChange={setIdRecibe}
              options={responsableOptions}
              placeholder="Responsable que recibe..."
              aria-label="Responsable que recibe"
            />
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descripción</th>
                  <th>Proveedor</th>
                  <th>Solicitado</th>
                  <th>Recibido</th>
                  <th>Pendiente</th>
                  <th>Recibir</th>
                </tr>
              </thead>
              <tbody>
                {(detalleAbierto.detalles || []).map((d) => {
                  const pend = Math.round(Number(d.cantidad_solicitada_91) - Number(d.cantidad_recibida_91 || 0));
                  return (
                    <tr key={d.id_detalle_91}>
                      <td>{d.codigo_89 || 'SIN CÓDIGO'}</td>
                      <td>{d.descripcion_89}</td>
                      <td>{d.proveedor_89 || '—'}</td>
                      <td>{mostrarEntero(d.cantidad_solicitada_91)}</td>
                      <td>{mostrarEntero(d.cantidad_recibida_91 || 0)}</td>
                      <td>{mostrarEntero(pend)}</td>
                      <td>
                        {pend > 0 && !anulado ? (
                          <>
                            <input
                              type="number"
                              min={1}
                              max={pend}
                              step={1}
                              inputMode="numeric"
                              className="form-input"
                              style={{ width: 90, display: 'inline-block' }}
                              value={qtyRecibe[d.id_detalle_91 || 0] || ''}
                              onChange={(e) =>
                                setQtyRecibe((p) => ({
                                  ...p,
                                  [d.id_detalle_91 || 0]: cantidadEntera(e.target.value),
                                }))
                              }
                              aria-label={`Cantidad a recibir ${d.codigo_89 || d.descripcion_89}`}
                            />
                            <button type="button" className="btn-primary" onClick={() => handleRecepcion(d.id_detalle_91 || 0)}>
                              Recibir
                            </button>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {historial.length > 0 && (
            <>
              <h4>Historial de estados</h4>
              <ul>
                {historial.map((h) => (
                  <li key={h.id_historial_94}>
                    {String(h.fecha_modificacion_94).slice(0, 19).replace('T', ' ')} — {h.campo_modificado_94}:{' '}
                    {h.valor_anterior_94} → {h.valor_nuevo_94}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, textTransform: 'uppercase' }}
          placeholder="Buscar orden, proveedor, estado..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar pedidos"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Pago</th>
              <th>Recepción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>
                  Sin pedidos
                </td>
              </tr>
            ) : (
              pageItems.map((p) => (
                <tr key={p.id_pedido_92}>
                  <td>{p.numero_orden_92}</td>
                  <td>{String(p.fecha_pedido_92).slice(0, 10)}</td>
                  <td>{p.proveedor_nombre}</td>
                  <td>{p.estado_pago_92}</td>
                  <td>{p.estado_recepcion_92}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => abrirDetalle(p.id_pedido_92)} title="Ver / recibir">
                      📋
                    </button>
                    {p.estado_recepcion_92 === 'Pendiente' && p.estado_pago_92 !== 'Anulado' && (
                      <button type="button" className="btn-edit" onClick={() => startEdit(p.id_pedido_92)} title="Editar">
                        ✏️
                      </button>
                    )}
                    <button type="button" className="btn-delete" onClick={() => handleDelete(p.id_pedido_92)} title="Eliminar">
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
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
};

export default PedidoView;
