import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportExcelPedidoPorProveedor, exportToExcel } from '../utils/exportUtils';
import { showConfirm, showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl, openAuthenticatedBlob } from '../lib/apiClient';
import { filtrarResponsablesActivos } from '../utils/responsablesEntrega';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface Proveedor {
  id_proveedor_90: number;
  razon_social_90: string;
  telefono_90?: string | null;
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
  cantidad_pasada_91?: number;
  cantidad_baja_91?: number;
  precio_unitario_91?: number | null;
  observaciones_det_91?: string | null;
  codigo_89?: string | null;
  descripcion_89?: string;
  proveedor_89?: string;
  id_proveedor_91?: number | null;
  fecha_envio_wa?: string | null;
  pedido_origen_92?: string | null;
}
interface EnvioWhatsApp {
  id_envio_98: number;
  proveedor_98: string;
  telefono_98?: string | null;
  texto_98?: string | null;
  usuario_98?: string | null;
  fecha_envio_98: string;
  lineas?: Array<{ id_detalle_99: number }>;
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
  envios_whatsapp?: EnvioWhatsApp[];
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
  id_detalle_91: null as number | null,
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

function pendienteLinea(d: {
  cantidad_solicitada_91: number;
  cantidad_recibida_91?: number;
  cantidad_pasada_91?: number;
  cantidad_baja_91?: number;
}): number {
  return Math.max(
    0,
    Math.round(Number(d.cantidad_solicitada_91))
      - Math.round(Number(d.cantidad_recibida_91 || 0))
      - Math.round(Number(d.cantidad_pasada_91 || 0))
      - Math.round(Number(d.cantidad_baja_91 || 0))
  );
}

function resumenCierre(d: {
  cantidad_recibida_91?: number;
  cantidad_pasada_91?: number;
  cantidad_baja_91?: number;
}): string {
  const partes: string[] = [];
  const rec = Math.round(Number(d.cantidad_recibida_91 || 0));
  const pas = Math.round(Number(d.cantidad_pasada_91 || 0));
  const baja = Math.round(Number(d.cantidad_baja_91 || 0));
  if (rec > 0) partes.push(`Llegó ${rec}`);
  if (pas > 0) partes.push(`Mañana ${pas}`);
  if (baja > 0) partes.push(`Ya no ${baja}`);
  return partes.join(' · ') || 'Cerrada';
}

function cantidadDesdeCero(value: unknown): string {
  const t = String(value ?? '').trim().replace(',', '.');
  if (t === '') return '';
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return '';
  return String(n);
}

function mostrarEntero(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n));
}

function fechaPedidoIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value ?? '');
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
}

function gruposPedidoComoPdf(ped: Pedido) {
  const fallback = String(ped.proveedor_nombre || '').trim().toUpperCase();
  const map = new Map<string, Detalle[]>();
  for (const d of ped.detalles || []) {
    const key = String(d.proveedor_89 || '').trim().toUpperCase() || fallback || 'SIN PROVEEDOR';
    const arr = map.get(key) || [];
    arr.push(d);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([proveedor, lineas]) => {
      const ordenadas = [...lineas].sort(
        (a, b) => Math.round(Number(b.cantidad_solicitada_91)) - Math.round(Number(a.cantidad_solicitada_91))
      );
      const totalQty = ordenadas.reduce((s, l) => s + (Math.round(Number(l.cantidad_solicitada_91)) || 0), 0);
      return {
        proveedor,
        totalQty,
        lineas: ordenadas.map((l) => ({
          idDetalle: l.id_detalle_91 || 0,
          enviadoAt: l.fecha_envio_wa || null,
          codigo: l.codigo_89 || 'SIN CÓDIGO',
          descripcion: l.descripcion_89 || '',
          cantidad: Math.round(Number(l.cantidad_solicitada_91)) || 0,
          precio: l.precio_unitario_91 == null ? '—' : Number(l.precio_unitario_91),
        })),
      };
    })
    .sort((a, b) => b.totalQty - a.totalQty || a.proveedor.localeCompare(b.proveedor, 'es'));
}

/** Chile: 9XXXXXXXX → 569XXXXXXXX. WhatsApp pide país + número, sin +. */
function telefonoWhatsApp(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('56') && digits.length >= 11) return digits.slice(0, 11);
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

function pendientesDeGrupo(grupo: ReturnType<typeof gruposPedidoComoPdf>[number]) {
  const lineas = grupo.lineas.filter((l) => !l.enviadoAt);
  const totalQty = lineas.reduce((s, l) => s + l.cantidad, 0);
  return { lineas, totalQty };
}

function mostrarFechaHora(value: unknown): string {
  return String(value ?? '').slice(0, 19).replace('T', ' ');
}

function pedidoAbierto(p: Pick<Pedido, 'estado_pago_92' | 'estado_recepcion_92'>): boolean {
  const rec = p.estado_recepcion_92;
  return p.estado_pago_92 !== 'Anulado' && rec !== 'Anulado' && rec !== 'Recibido' && rec !== 'Cerrada';
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
  const [filtroCiclo, setFiltroCiclo] = useState<'abiertas' | 'cerradas' | 'todas'>('abiertas');
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
  const [idRecibe, setIdRecibe] = useState('');
  const [llegadaLinea, setLlegadaLinea] = useState<Record<number, string>>({});
  const [restoLinea, setRestoLinea] = useState<Record<number, '' | 'manana' | 'ya_no'>>({});
  const [enviandoWa, setEnviandoWa] = useState(false);
  const [resumenPago, setResumenPago] = useState<string | null>(null);
  const resumenRef = React.useRef<HTMLTextAreaElement>(null);

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

  const matchProveedor = (nombre?: string | null) => {
    const q = String(nombre || '').trim().toUpperCase();
    if (!q) return undefined;
    const exact = proveedores.find((p) => p.razon_social_90.trim().toUpperCase() === q);
    if (exact) return exact;
    const hits = proveedores.filter((p) => {
      const n = p.razon_social_90.trim().toUpperCase();
      return n.includes(q) || q.includes(n);
    });
    return hits.length === 1 ? hits[0] : undefined;
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
    let rows = pedidos;
    if (filtroCiclo === 'abiertas') rows = rows.filter(pedidoAbierto);
    if (filtroCiclo === 'cerradas') rows = rows.filter((p) => !pedidoAbierto(p));
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      [p.numero_orden_92, p.proveedor_nombre, p.responsable_nombre, p.estado_pago_92, p.estado_recepcion_92]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [pedidos, searchTerm, filtroCiclo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroCiclo]);

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
        id_detalle_91: d.id_detalle_91 || null,
        cod_insumo_91: d.cod_insumo_91 ? String(d.cod_insumo_91) : '',
        descripcion: d.cod_insumo_91 ? d.descripcion_89 || '' : d.descripcion_libre_91 || d.descripcion_89 || '',
        idProveedorLinea: d.id_proveedor_91 ? String(d.id_proveedor_91) : matchProveedorId(d.proveedor_89),
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
      setLlegadaLinea({});
      setRestoLinea({});
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
          id_detalle_91: l.id_detalle_91 || null,
          cod_insumo_91: sku,
          descripcion_libre_91: sku ? null : l.descripcion.trim().toUpperCase(),
          id_proveedor_91: l.idProveedorLinea ? Number(l.idProveedorLinea) : null,
          cantidad_solicitada_91: Math.round(Number(l.cantidad)),
          precio_unitario_91: l.precio === '' ? null : Number(l.precio),
          observaciones_det_91: l.obs || null,
        };
      });
    if (!idProveedor || !idResponsable || detalles.length === 0) {
      await showError('Validación', 'Proveedor, responsable y al menos una línea (SKU o descripción) con cantidad');
      return;
    }
    const libreSinProveedor = detalles.find((d) => !d.cod_insumo_91 && !d.id_proveedor_91);
    if (libreSinProveedor) {
      await showError(
        'Validación',
        `La línea "${libreSinProveedor.descripcion_libre_91}" no tiene código: elija el proveedor del catálogo (no lo escriba)`
      );
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

  const handleCerrarLinea = async (d: Detalle) => {
    if (!detalleAbierto || !d.id_detalle_91) return;
    const id = d.id_detalle_91;
    const pend = pendienteLinea(d);
    const llegada = llegadaLinea[id] === undefined || llegadaLinea[id] === '' ? 0 : Math.round(Number(llegadaLinea[id]));
    const resto = restoLinea[id] || '';
    if (!Number.isFinite(llegada) || llegada < 0 || llegada > pend) {
      await showError('Validación', `Indique cuántos llegaron, entre 0 y ${pend}`);
      return;
    }
    if (llegada < pend && resto !== 'manana' && resto !== 'ya_no') {
      await showError('Validación', 'El resto pasa a mañana o ya no se pide por el sistema');
      return;
    }
    if (llegada > 0 && !idRecibe) {
      await showError('Validación', 'Indique quién recibe lo que llegó');
      return;
    }
    const falta = pend - llegada;
    const texto = [
      llegada > 0 ? `Llegaron ${llegada}.` : 'No llegó nada.',
      falta > 0 && resto === 'manana' ? `${falta} pasan al pedido de mañana.` : '',
      falta > 0 && resto === 'ya_no' ? `${falta} ya no se piden por el sistema.` : '',
      'El PDF de este pedido no cambia.',
    ].filter(Boolean).join(' ');
    const ok = await showConfirm('Cerrar insumo', texto, 'Cerrar');
    if (!ok) return;
    const res = await apiFetch(`${API}/${detalleAbierto.id_pedido_92}/cerrar-linea`, {
      method: 'POST',
      body: JSON.stringify({
        id_detalle_91: id,
        cantidad_llegada: llegada,
        resto: falta > 0 ? resto : null,
        id_responsable_recibe_93: llegada > 0 ? Number(idRecibe) : null,
      }),
    });
    const data: ApiResponse<Pedido> = await res.json();
    if (!data.success) {
      await showError('Error', data.error || 'No se pudo cerrar la línea');
      return;
    }
    await fetchAll();
    if (data.data) setDetalleAbierto(data.data);
    setLlegadaLinea((p) => ({ ...p, [id]: '' }));
    setRestoLinea((p) => ({ ...p, [id]: '' }));
    await showSuccess('Listo', data.message || 'Línea cerrada');
  };

  const pedidoConDetalle = async (id: number): Promise<Pedido | null> => {
    if (detalleAbierto?.id_pedido_92 === id && (detalleAbierto.detalles || []).length > 0) {
      return detalleAbierto;
    }
    const res = await apiFetch(`${API}/${id}`);
    const data: ApiResponse<Pedido> = await res.json();
    if (!data.success || !data.data) {
      await showError('Error', data.error || 'No se pudo abrir el pedido');
      return null;
    }
    return data.data;
  };

  const exportarExcelDetalle = async (id: number) => {
    try {
      const ped = await pedidoConDetalle(id);
      if (!ped) return;
      const filas = (ped.detalles || []).map((d, i) => ({
        N: i + 1,
        Orden: ped.numero_orden_92 || '',
        Fecha: String(ped.fecha_pedido_92).slice(0, 10),
        'Proveedor pedido': ped.proveedor_nombre || '',
        SKU: d.codigo_89 || 'SIN CÓDIGO',
        Descripción: d.descripcion_89 || '',
        Proveedor: d.proveedor_89 || ped.proveedor_nombre || '',
        Cantidad: Math.round(Number(d.cantidad_solicitada_91)) || 0,
        Precio: d.precio_unitario_91 == null ? '' : Number(d.precio_unitario_91),
        Observaciones: d.observaciones_det_91 || '',
      }));
      if (filas.length === 0) {
        await showError('Exportar', 'Este pedido no tiene líneas');
        return;
      }
      exportToExcel(filas, `${ped.numero_orden_92 || 'pedido'}-detalle`, 'Detalle');
    } catch {
      await showError('Error', 'No se pudo exportar el Excel');
    }
  };

  const exportarExcelPorProveedor = async (id: number) => {
    try {
      const ped = await pedidoConDetalle(id);
      if (!ped) return;
      const grupos = gruposPedidoComoPdf(ped);
      if (grupos.length === 0) {
        await showError('Exportar', 'Este pedido no tiene líneas');
        return;
      }
      const totalUnidades = grupos.reduce((s, g) => s + g.totalQty, 0);
      exportExcelPedidoPorProveedor({
        numero: ped.numero_orden_92 || `PED-${String(ped.id_pedido_92).padStart(6, '0')}`,
        fecha: fechaPedidoIso(ped.fecha_pedido_92),
        proveedorPedido: String(ped.proveedor_nombre || '').trim().toUpperCase() || '—',
        responsable: ped.responsable_nombre || '—',
        pago: ped.estado_pago_92,
        recepcion: ped.estado_recepcion_92,
        observaciones: ped.observaciones_cab_92,
        grupos,
        totalItems: (ped.detalles || []).length,
        totalUnidades,
      });
    } catch {
      await showError('Error', 'No se pudo exportar el Excel por proveedor');
    }
  };

  const exportarPdfPedido = async (id: number) => {
    try {
      await openAuthenticatedBlob(`/pedidos/${id}/pdf`);
    } catch (e) {
      await showError('PDF', e instanceof Error ? e.message : 'No se pudo generar el PDF');
    }
  };

  const aplicarPedido = (ped: Pedido | undefined) => {
    if (ped) setDetalleAbierto(ped);
  };

  const enviarWhatsAppGrupo = async (
    ped: Pedido,
    grupo: ReturnType<typeof gruposPedidoComoPdf>[number]
  ) => {
    const catalogo = matchProveedor(grupo.proveedor);
    const e164 = telefonoWhatsApp(catalogo?.telefono_90);
    if (!e164) {
      await showError(
        'WhatsApp',
        `No hay teléfono para ${grupo.proveedor}. Cárgalo en Pedidos → Proveedores y vuelve a intentar.`
      );
      return;
    }
    const pendientes = pendientesDeGrupo(grupo);
    if (pendientes.lineas.length === 0) {
      await showError(
        'WhatsApp',
        `Nada pendiente para ${grupo.proveedor}. Lo ya enviado (p. ej. las 09:30) no se vuelve a mandar.`
      );
      return;
    }
    const ok = await showConfirm(
      `WhatsApp a ${grupo.proveedor}`,
      `Se registrarán ${pendientes.lineas.length} ítems NUEVOS (${pendientes.totalQty} un.). Lo ya enviado no va. El chat se abre después; tú pulsas Enviar en WhatsApp. Si no llegas a enviar, usa Deshacer.`,
      'Registrar y abrir chat'
    );
    if (!ok) return;
    if (enviandoWa) return;
    setEnviandoWa(true);
    try {
      const res = await apiFetch(`${API}/${ped.id_pedido_92}/envios-whatsapp`, {
        method: 'POST',
        body: JSON.stringify({ proveedor: grupo.proveedor }),
      });
      const data: ApiResponse<{
        telefono_e164: string;
        texto: string;
        pendientes: number;
        pedido: Pedido;
      }> = await res.json();
      if (!data.success || !data.data) {
        await showError('WhatsApp', data.error || 'No se pudo registrar el envío');
        return;
      }
      aplicarPedido(data.data.pedido);
      await fetchAll();
      const url = `https://wa.me/${data.data.telefono_e164}?text=${encodeURIComponent(data.data.texto)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      await showError('WhatsApp', 'Error de conexión al registrar el envío');
    } finally {
      setEnviandoWa(false);
    }
  };

  const deshacerEnvioWhatsApp = async (ped: Pedido, envio: EnvioWhatsApp) => {
    const hora = mostrarFechaHora(envio.fecha_envio_98);
    const n = envio.lineas?.length || 0;
    const ok = await showConfirm(
      'Deshacer envío WhatsApp',
      `${hora} a ${envio.proveedor_98} (${n} ítems) vuelve a pendiente. Úsalo si no pulsaste Enviar en WhatsApp.`,
      'Deshacer'
    );
    if (!ok) return;
    const res = await apiFetch(`${API}/${ped.id_pedido_92}/envios-whatsapp/${envio.id_envio_98}`, {
      method: 'DELETE',
    });
    const data: ApiResponse<Pedido> = await res.json();
    if (!data.success) {
      await showError('WhatsApp', data.error || 'No se pudo deshacer');
      return;
    }
    aplicarPedido(data.data);
    await fetchAll();
    await showSuccess('Listo', data.message || 'Envío deshecho');
  };

  const abrirResumenPago = async () => {
    const res = await apiFetch(`${API}/resumen-pago`);
    const data: ApiResponse<{ texto: string }> = await res.json();
    if (!data.success || !data.data?.texto) {
      await showError('Resumen de pago', data.error || 'No se pudo armar el resumen');
      return;
    }
    setResumenPago(data.data.texto);
  };

  const copiarResumenPago = async () => {
    if (!resumenPago) return;
    try {
      await navigator.clipboard.writeText(resumenPago);
      await showSuccess('Listo', 'Resumen copiado. Pégalo en el bloc de notas.');
    } catch {
      resumenRef.current?.focus();
      resumenRef.current?.select();
      await showError('Copiar', 'Selecciona el texto y cópialo con Ctrl+C');
    }
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
  const cerrado = Boolean(detalleAbierto && !pedidoAbierto(detalleAbierto));

  return (
    <div className="bodega-view pedido-view">
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
            onClick={() => {
              if (detalleAbierto) {
                void exportarExcelDetalle(detalleAbierto.id_pedido_92);
                return;
              }
              exportToExcel(
                filtered.map((p) => ({
                  Orden: p.numero_orden_92,
                  Fecha: String(p.fecha_pedido_92).slice(0, 10),
                  Proveedor: p.proveedor_nombre,
                  Pago: p.estado_pago_92,
                  Recepción: p.estado_recepcion_92,
                })),
                'pedidos'
              );
            }}
          >
            Excel
          </button>
          <button
            type="button"
            className="btn-export"
            disabled={!detalleAbierto}
            onClick={() => detalleAbierto && void exportarPdfPedido(detalleAbierto.id_pedido_92)}
          >
            PDF
          </button>
          <button type="button" className="btn-info" onClick={() => void abrirResumenPago()}>
            Resumen de pago
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

      {resumenPago !== null && (
        <div className="form-container pedido-resumen-pago">
          <h3>Resumen de pago</h3>
          <p className="form-hint">
            Pedidos con pago Pendiente o Parcial, un proveedor por línea. Puedes corregir el texto antes de copiarlo.
          </p>
          <textarea
            ref={resumenRef}
            className="form-input pedido-resumen-texto"
            readOnly={false}
            rows={16}
            value={resumenPago}
            onChange={(e) => setResumenPago(e.target.value)}
            aria-label="Resumen de pago para contabilidad"
          />
          <div className="pedido-resto">
            <button type="button" className="btn-primary" onClick={() => void copiarResumenPago()}>
              Copiar
            </button>
            <button type="button" className="btn-secondary" onClick={() => setResumenPago(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? `Editar ${numero || editingId}` : 'Nuevo pedido'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="pedido-cabecera">
              <div className="form-group">
                <label htmlFor="id_proveedor_92">
                  Proveedor *{' '}
                  <button
                    type="button"
                    className="btn-link"
                    style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 12 }}
                    onClick={() => {
                      window.location.hash = 'proveedores-pedido';
                    }}
                  >
                    Alta
                  </button>
                </label>
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
                <label htmlFor="numero_orden_92">N° orden</label>
                <input
                  id="numero_orden_92"
                  className="form-input"
                  value={numero}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => changeKeepingCaret(e, setNumero)}
                  placeholder="PED-000001"
                />
              </div>
              <div className="form-group pedido-obs">
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

            <h4>
              Detalle ({lineas.filter((l) => l.cod_insumo_91 || l.descripcion.trim()).length} ítems)
            </h4>
            <p className="form-hint" style={{ marginTop: 0 }}>
              Código de catálogo o, si no existe, solo descripción y cantidad (extensión, unión, fabricar). Queda en el mismo pedido.
            </p>
            <div className="table-container table-container--combos">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="pedido-linea-nro">#</th>
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
                        <td className="pedido-linea-nro" aria-label={`Línea ${idx + 1}`}>
                          {idx + 1}
                        </td>
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
                            emptyMessage="No coincide. Elíjalo del catálogo o créelo en Pedidos → Proveedores"
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
            <div className="pedido-button-grid">
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
              {!cerrado && detalleAbierto.estado_recepcion_92 === 'Pendiente' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => postAccion(`${API}/${detalleAbierto.id_pedido_92}/no-retirado`)}
                >
                  No retirado
                </button>
              )}
              {!cerrado && (
                <button type="button" className="btn-delete" onClick={() => postAccion(`${API}/${detalleAbierto.id_pedido_92}/anular`)}>
                  Anular
                </button>
              )}
              <button
                type="button"
                className="btn-info"
                onClick={() => void exportarExcelDetalle(detalleAbierto.id_pedido_92)}
              >
                Excel detalle
              </button>
              <button
                type="button"
                className="btn-info"
                onClick={() => void exportarExcelPorProveedor(detalleAbierto.id_pedido_92)}
              >
                Excel por proveedor
              </button>
              <button
                type="button"
                className="btn-export"
                onClick={() => void exportarPdfPedido(detalleAbierto.id_pedido_92)}
              >
                PDF por proveedor
              </button>
            </div>
          )}
          {anulado && (
            <div className="pedido-button-grid">
              <button
                type="button"
                className="btn-info"
                onClick={() => void exportarExcelDetalle(detalleAbierto.id_pedido_92)}
              >
                Excel detalle
              </button>
              <button
                type="button"
                className="btn-info"
                onClick={() => void exportarExcelPorProveedor(detalleAbierto.id_pedido_92)}
              >
                Excel por proveedor
              </button>
              <button
                type="button"
                className="btn-export"
                onClick={() => void exportarPdfPedido(detalleAbierto.id_pedido_92)}
              >
                PDF por proveedor
              </button>
            </div>
          )}
          <h4 style={{ marginTop: 8 }}>WhatsApp por proveedor</h4>
          <p className="form-hint" style={{ marginTop: 0 }}>
            Un botón por ferretería. Se registra el lote y luego se abre el chat; tú pulsas Enviar.
            Si a las 11:30 agregas líneas, el segundo envío lleva solo las nuevas.
          </p>
          <div className="pedido-button-grid" aria-label="WhatsApp por proveedor">
            {gruposPedidoComoPdf(detalleAbierto).map((g) => {
              const catalogo = matchProveedor(g.proveedor);
              const e164 = telefonoWhatsApp(catalogo?.telefono_90);
              const pendientes = pendientesDeGrupo(g);
              const enviados = g.lineas.length - pendientes.lineas.length;
              const puedeEnviar = Boolean(e164) && pendientes.lineas.length > 0 && !cerrado;
              return (
                <div key={g.proveedor} className="pedido-wa-card">
                  <strong>{g.proveedor}</strong>
                  <span className="pedido-wa-meta">
                    {pendientes.lineas.length > 0
                      ? `${pendientes.lineas.length} nuevos · ${pendientes.totalQty} un.`
                      : 'nada pendiente'}
                    {enviados > 0 ? ` · ${enviados} enviados` : ''}
                    {e164 ? ` · +${e164}` : ' · sin teléfono'}
                  </span>
                  <button
                    type="button"
                    className="btn-success"
                    disabled={!puedeEnviar || enviandoWa}
                    title={
                      !e164
                        ? 'Cargue el teléfono en Pedidos → Proveedores'
                        : pendientes.lineas.length === 0
                          ? 'Todo lo de este proveedor ya se envió'
                          : `Registrar ${pendientes.lineas.length} nuevos y abrir WhatsApp +${e164}`
                    }
                    onClick={() => void enviarWhatsAppGrupo(detalleAbierto, g)}
                  >
                    {pendientes.lineas.length > 0 ? `WhatsApp (${pendientes.lineas.length} nuevos)` : 'Ya enviado'}
                  </button>
                </div>
              );
            })}
          </div>
          {(detalleAbierto.envios_whatsapp || []).length > 0 && (
            <>
              <h4 style={{ marginTop: 0 }}>Envíos WhatsApp</h4>
              <div className="pedido-envio-grid" aria-label="Envíos WhatsApp">
                {(detalleAbierto.envios_whatsapp || []).map((ev) => (
                  <div key={ev.id_envio_98} className="pedido-wa-card">
                    <strong>{ev.proveedor_98}</strong>
                    <span className="pedido-wa-meta">
                      {mostrarFechaHora(ev.fecha_envio_98)} · {ev.lineas?.length || 0} ítems
                      {ev.usuario_98 ? ` · ${ev.usuario_98}` : ''}
                    </span>
                    {!cerrado && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void deshacerEnvioWhatsApp(detalleAbierto, ev)}
                      >
                        Deshacer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {!cerrado && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
              <div className="form-group" style={{ maxWidth: 360, marginBottom: 0 }}>
                <label>Quién recibe</label>
                <SearchableSelect
                  value={idRecibe}
                  onChange={setIdRecibe}
                  options={responsableOptions}
                  placeholder="Responsable que recibe..."
                  aria-label="Responsable que recibe"
                />
              </div>
              <p className="form-hint" style={{ margin: 0, maxWidth: 520 }}>
                Cierre cada insumo. Si llegaron menos de los pedidos, el resto pasa a mañana o ya no se pide por acá
                (porque se compró afuera). El PDF de este pedido no cambia.
              </p>
            </div>
          )}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pedido-linea-nro">#</th>
                  <th>SKU</th>
                  <th>Descripción</th>
                  <th>Proveedor</th>
                  <th>Solicitado</th>
                  <th>Recibido</th>
                  <th>Pendiente</th>
                  <th>WhatsApp</th>
                  <th>Llegaron</th>
                  <th>Resto</th>
                  <th>Cerrar</th>
                </tr>
              </thead>
              <tbody>
                {(detalleAbierto.detalles || []).map((d, idx) => {
                  const pend = pendienteLinea(d);
                  const id = d.id_detalle_91 || 0;
                  const llegadaTxt = llegadaLinea[id] ?? '';
                  const llegadaNum = llegadaTxt === '' ? 0 : Math.round(Number(llegadaTxt));
                  const falta = Math.max(0, pend - (Number.isFinite(llegadaNum) ? llegadaNum : 0));
                  const resto = restoLinea[id] || '';
                  return (
                    <tr key={d.id_detalle_91}>
                      <td className="pedido-linea-nro">{idx + 1}</td>
                      <td>{d.codigo_89 || 'SIN CÓDIGO'}</td>
                      <td>
                        {d.descripcion_89}
                        {d.pedido_origen_92 ? (
                          <div className="form-hint" style={{ margin: 0 }}>
                            Desde {d.pedido_origen_92}
                          </div>
                        ) : null}
                      </td>
                      <td>{d.proveedor_89 || '—'}</td>
                      <td>{mostrarEntero(d.cantidad_solicitada_91)}</td>
                      <td>{mostrarEntero(d.cantidad_recibida_91 || 0)}</td>
                      <td>{mostrarEntero(pend)}</td>
                      <td>
                        {d.fecha_envio_wa ? (
                          <span className="badge badge-success" title={mostrarFechaHora(d.fecha_envio_wa)}>
                            ENVIADO
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {pend > 0 && !cerrado ? (
                        <>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={pend}
                              step={1}
                              inputMode="numeric"
                              className="form-input"
                              style={{ width: 72 }}
                              value={llegadaTxt}
                              placeholder="0"
                              onChange={(e) =>
                                setLlegadaLinea((p) => ({ ...p, [id]: cantidadDesdeCero(e.target.value) }))
                              }
                              aria-label={`Cuántos llegaron de ${d.codigo_89 || d.descripcion_89}`}
                            />
                          </td>
                          <td>
                            {falta > 0 ? (
                              <div className="pedido-resto" role="group" aria-label="Qué hacer con el resto">
                                <button
                                  type="button"
                                  className={resto === 'manana' ? 'btn-primary' : 'btn-secondary'}
                                  aria-pressed={resto === 'manana'}
                                  onClick={() => setRestoLinea((p) => ({ ...p, [id]: 'manana' }))}
                                >
                                  Mañana
                                </button>
                                <button
                                  type="button"
                                  className={resto === 'ya_no' ? 'btn-primary' : 'btn-secondary'}
                                  aria-pressed={resto === 'ya_no'}
                                  onClick={() => setRestoLinea((p) => ({ ...p, [id]: 'ya_no' }))}
                                >
                                  Ya no
                                </button>
                              </div>
                            ) : (
                              <span className="form-hint">Llegó todo</span>
                            )}
                          </td>
                          <td>
                            <button type="button" className="btn-primary" onClick={() => void handleCerrarLinea(d)}>
                              Cerrar
                            </button>
                          </td>
                        </>
                      ) : (
                        <td colSpan={3}>{resumenCierre(d)}</td>
                      )}
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

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, minWidth: 200, textTransform: 'uppercase' }}
          placeholder="Buscar orden, proveedor, estado..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar pedidos"
        />
        <div role="group" aria-label="Filtro abierta o cerrada" style={{ display: 'flex', gap: 6 }}>
          {([
            ['abiertas', 'Abiertas'],
            ['cerradas', 'Cerradas'],
            ['todas', 'Todas'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filtroCiclo === id ? 'btn-primary' : 'btn-secondary'}
              aria-pressed={filtroCiclo === id}
              onClick={() => setFiltroCiclo(id)}
            >
              {label}
            </button>
          ))}
        </div>
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
                    {pedidoAbierto(p) && (
                      <button type="button" className="btn-delete" onClick={() => handleDelete(p.id_pedido_92)} title="Eliminar">
                        🗑️
                      </button>
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
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
};

export default PedidoView;
