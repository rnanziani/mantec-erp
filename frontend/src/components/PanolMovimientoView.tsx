import React, { useEffect, useMemo, useRef, useState } from 'react';
import './BodegaView.css';
import './PanolMovimientoView.css';
import Pagination from './shared/Pagination';
import SignaturePad from './shared/SignaturePad';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess, showTipoMovimientoPanol } from '../utils/swal';
import { filtrarTrabajadoresPorApellido } from '../utils/trabajadorSearch';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface HerramientaDetalleResumen {
  idherramienta: number;
  codigo: string;
  nombre: string;
  estado: string;
  stock: number;
  stock_disponible: number;
  cantidad: number;
}

interface MaestroPanol {
  idmpanol_49: number;
  folio_49?: string | null;
  tipomovimiento_49: string;
  idtrabajador_49: number;
  estado_49: string;
  fecha_49: string;
  observacion_49?: string | null;
  firmatrabajador_49?: string | null;
  firmapanolero_49?: string | null;
  trabajador_nombre?: string;
  responsable_nombre?: string;
  /** Estado actual de cada herramienta del movimiento (catálogo) */
  herramientas_detalle?: HerramientaDetalleResumen[] | null;
}

interface Herramienta {
  idherramienta_48: number;
  codigo_48: string;
  nombre_48: string;
  stock_48: number;
  stock_disponible_48: number;
  estado_48: string;
  activo_48: boolean;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06?: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
}

interface Responsable {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
}

interface DetalleLinea {
  idherramienta_50: number;
  cantidad_50: number;
  estadoentrega_50: string;
  estadodevolucion_50: string;
  observacion_50: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const API_URL = apiUrl('/panol');
const HERRAMIENTAS_URL = apiUrl('/herramientas');
const TRABAJADORES_URL = apiUrl('/trabajadores');
const RESPONSABLES_URL = apiUrl('/responsables-entrega');

/** Badge CSS según estado de herramienta del catálogo */
function badgeEstadoHerramienta(estado: string): string {
  const key = String(estado || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  return `badge-estado badge-herr-${key}`;
}

/** Normaliza el JSON de herramientas del listado (a veces llega como string). */
function normalizeHerramientasDetalle(raw: unknown): HerramientaDetalleResumen[] {
  if (Array.isArray(raw)) return raw as HerramientaDetalleResumen[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as HerramientaDetalleResumen[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeMovimientoPanol(row: MaestroPanol): MaestroPanol {
  return {
    ...row,
    tipomovimiento_49: String(row.tipomovimiento_49 || '').trim(),
    estado_49: String(row.estado_49 || '').trim(),
    herramientas_detalle: normalizeHerramientasDetalle(row.herramientas_detalle),
  };
}

const PanolMovimientoView: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<MaestroPanol[]>([]);
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTrabajador, setFiltroTrabajador] = useState('');
  const [filtroHerramienta, setFiltroHerramienta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MaestroPanol;
    direction: 'asc' | 'desc';
  }>({ key: 'idmpanol_49', direction: 'desc' });

  const [tipo, setTipo] = useState<'SALIDA' | 'DEVOLUCION'>('SALIDA');
  const [idTrabajador, setIdTrabajador] = useState('');
  const [buscarTrabajador, setBuscarTrabajador] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [observacion, setObservacion] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');
  const [detalles, setDetalles] = useState<DetalleLinea[]>([]);
  const [firmaTrabajador, setFirmaTrabajador] = useState('');
  const [firmaPanolero, setFirmaPanolero] = useState('');
  const [herramientaSel, setHerramientaSel] = useState('');
  const [cantidadSel, setCantidadSel] = useState('1');
  /** Folio e ID de la SALIDA de origen al crear una DEVOLUCION rápida */
  const [origenSalidaFolio, setOrigenSalidaFolio] = useState('');
  const [origenSalidaId, setOrigenSalidaId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const dedupeMovimientos = (rows: MaestroPanol[]) => {
    const seen = new Set<number>();
    const unique: MaestroPanol[] = [];
    for (const row of rows) {
      if (seen.has(row.idmpanol_49)) continue;
      seen.add(row.idmpanol_49);
      unique.push(normalizeMovimientoPanol(row));
    }
    return unique;
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [p, h, t, r] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(HERRAMIENTAS_URL),
        apiFetch(TRABAJADORES_URL),
        apiFetch(RESPONSABLES_URL),
      ]);
      const pData: ApiResponse<MaestroPanol[]> = await p.json();
      const hData: ApiResponse<Herramienta[]> = await h.json();
      const tData: ApiResponse<Trabajador[]> = await t.json();
      const rData: ApiResponse<Responsable[]> = await r.json();
      if (pData.success && Array.isArray(pData.data)) {
        setRegistros(dedupeMovimientos(pData.data));
      } else setError(pData.error || 'Error al cargar movimientos');
      if (hData.success && Array.isArray(hData.data)) setHerramientas(hData.data);
      if (tData.success && Array.isArray(tData.data)) setTrabajadores(tData.data);
      if (rData.success && Array.isArray(rData.data)) setResponsables(rData.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const trabajadoresFiltrados = useMemo(
    () => filtrarTrabajadoresPorApellido(trabajadores, buscarTrabajador).slice(0, 20),
    [trabajadores, buscarTrabajador]
  );

  const herramientasDisponibles = useMemo(() => {
    const noPrestables = new Set(['PERDIDA', 'DANADA', 'DE_BAJA', 'EN_MANTENCION']);
    return herramientas.filter((h) => {
      if (!h.activo_48) return false;
      if (detalles.some((d) => d.idherramienta_50 === h.idherramienta_48)) return false;

      if (tipo === 'DEVOLUCION') {
        // Solo herramientas realmente prestadas / con unidades fuera
        return (
          h.estado_48 === 'PRESTADA' ||
          Number(h.stock_disponible_48) < Number(h.stock_48)
        );
      }

      // SALIDA: stock > 0 y no fuera de circulación / ya prestada sin unidades
      if (noPrestables.has(String(h.estado_48 || '').toUpperCase())) return false;
      if (String(h.estado_48).toUpperCase() === 'PRESTADA' && Number(h.stock_disponible_48) <= 0) {
        return false;
      }
      return Number(h.stock_disponible_48) > 0;
    });
  }, [herramientas, detalles, tipo]);

  const herramientasOptions = useMemo(
    () =>
      herramientasDisponibles.map((h) => ({
        value: String(h.idherramienta_48),
        label: `${h.codigo_48} - ${h.nombre_48} [${h.estado_48}] (disp: ${h.stock_disponible_48})`,
      })),
    [herramientasDisponibles]
  );

  const trabajadoresFiltroOpciones = useMemo(() => {
    const map = new Map<number, string>();
    registros.forEach((m) => {
      if (m.idtrabajador_49 && m.trabajador_nombre) {
        map.set(m.idtrabajador_49, m.trabajador_nombre.trim());
      }
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [registros]);

  const herramientasFiltroOpciones = useMemo(() => {
    const map = new Map<number, { codigo: string; nombre: string }>();
    registros.forEach((m) => {
      (m.herramientas_detalle || []).forEach((h) => {
        if (h.idherramienta && !map.has(h.idherramienta)) {
          map.set(h.idherramienta, {
            codigo: h.codigo || '',
            nombre: h.nombre || '',
          });
        }
      });
    });
    return Array.from(map.entries())
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
  }, [registros]);

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const desde = filtroFechaDesde ? new Date(`${filtroFechaDesde}T00:00:00`) : null;
    const hasta = filtroFechaHasta ? new Date(`${filtroFechaHasta}T23:59:59.999`) : null;

    let list = registros.filter((m) => {
      const herrText = Array.isArray(m.herramientas_detalle)
        ? m.herramientas_detalle
            .map((h) => `${h.codigo} ${h.nombre} ${h.estado}`)
            .join(' ')
            .toLowerCase()
        : '';
      const matchText =
        !q ||
        (m.folio_49 || '').toLowerCase().includes(q) ||
        (m.trabajador_nombre || '').toLowerCase().includes(q) ||
        (m.responsable_nombre || '').toLowerCase().includes(q) ||
        m.tipomovimiento_49.toLowerCase().includes(q) ||
        m.estado_49.toLowerCase().includes(q) ||
        (m.observacion_49 || '').toLowerCase().includes(q) ||
        herrText.includes(q);
      const matchTipo = !filtroTipo || m.tipomovimiento_49 === filtroTipo;
      const matchEstado = !filtroEstado || m.estado_49 === filtroEstado;
      const matchTrabajador =
        !filtroTrabajador || String(m.idtrabajador_49) === filtroTrabajador;
      const matchHerramienta =
        !filtroHerramienta ||
        (Array.isArray(m.herramientas_detalle) &&
          m.herramientas_detalle.some(
            (h) => String(h.idherramienta) === filtroHerramienta
          ));

      let matchFecha = true;
      if (desde || hasta) {
        const f = new Date(m.fecha_49);
        if (Number.isNaN(f.getTime())) matchFecha = false;
        else {
          if (desde && f < desde) matchFecha = false;
          if (hasta && f > hasta) matchFecha = false;
        }
      }

      return (
        matchText &&
        matchTipo &&
        matchEstado &&
        matchTrabajador &&
        matchHerramienta &&
        matchFecha
      );
    });

    list = [...list].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (sortConfig.key === 'fecha_49') {
        const ta = new Date(String(aValue)).getTime();
        const tb = new Date(String(bValue)).getTime();
        return sortConfig.direction === 'asc' ? ta - tb : tb - ta;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const cmp = String(aValue).localeCompare(String(bValue), 'es', {
        sensitivity: 'base',
        numeric: true,
      });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    registros,
    searchTerm,
    filtroTipo,
    filtroEstado,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroTrabajador,
    filtroHerramienta,
    sortConfig,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filtroTipo,
    filtroEstado,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroTrabajador,
    filtroHerramienta,
  ]);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroTipo('');
    setFiltroEstado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroTrabajador('');
    setFiltroHerramienta('');
  };

  const handleSort = (key: keyof MaestroPanol) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof MaestroPanol) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const estadoPorTipo = (t: 'SALIDA' | 'DEVOLUCION') =>
    t === 'SALIDA' ? 'PENDIENTE' : 'COMPLETADA';

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setTipo('SALIDA');
    setIdTrabajador('');
    setBuscarTrabajador('');
    setIdResponsable('');
    setFecha(new Date().toISOString().slice(0, 16));
    setObservacion('');
    setEstado(estadoPorTipo('SALIDA'));
    setDetalles([]);
    setFirmaTrabajador('');
    setFirmaPanolero('');
    setHerramientaSel('');
    setCantidadSel('1');
    setOrigenSalidaFolio('');
    setOrigenSalidaId(null);
    setError('');
  };

  /** Abre formulario nuevo tras preguntar SALIDA o DEVOLUCION */
  const handleNuevoMovimiento = async () => {
    const elegido = await showTipoMovimientoPanol();
    if (!elegido) return;

    resetForm();
    setTipo(elegido);
    setEstado(estadoPorTipo(elegido));
    setShowForm(true);
  };

  /** ¿Se puede generar devolución desde esta salida? */
  const puedeDevolverDesdeSalida = (m: MaestroPanol): boolean => {
    const tipo = String(m.tipomovimiento_49 || '').trim().toUpperCase();
    const estado = String(m.estado_49 || '').trim().toUpperCase();
    // Solo salidas pendientes de devolución
    return tipo === 'SALIDA' && estado === 'PENDIENTE';
  };

  /**
   * Flujo eficiente: parte del préstamo (SALIDA) y abre un NUEVO registro DEVOLUCION
   * precargado (trabajador, responsable, herramientas). Firmas nuevas obligatorias.
   */
  const startDevolucionDesdeSalida = async (idSalida: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${idSalida}`);
      const data: ApiResponse<{
        maestro: MaestroPanol & {
          idresponsableentrega_49?: number;
          observacion_49?: string;
          trabajador_nombre?: string;
        };
        detalles: Array<
          DetalleLinea & {
            herramienta_estado?: string;
            herramienta_stock_disponible?: number;
            observacion_50?: string;
          }
        >;
      }> = await res.json();

      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar el préstamo');
        return;
      }

      const { maestro, detalles: dets } = data.data;
      if (maestro.tipomovimiento_49 !== 'SALIDA') {
        await showError('Validación', 'Solo se puede devolver desde un movimiento de SALIDA');
        return;
      }
      if (String(maestro.estado_49 || '').toUpperCase() !== 'PENDIENTE') {
        await showError(
          'Validación',
          'Solo se puede devolver desde un préstamo en estado PENDIENTE'
        );
        return;
      }

      // Usar todas las líneas del préstamo; el backend valida contra esta salida
      const lineasPendientes = dets || [];

      if (!lineasPendientes.length) {
        await showError(
          'Sin pendiente',
          'Este préstamo no tiene herramientas para devolver'
        );
        return;
      }

      const folio = maestro.folio_49 || `ID-${idSalida}`;

      setEditingId(null); // siempre crea un registro NUEVO
      setTipo('DEVOLUCION');
      setIdTrabajador(String(maestro.idtrabajador_49));
      setBuscarTrabajador(maestro.trabajador_nombre || '');
      setIdResponsable(
        maestro.idresponsableentrega_49 ? String(maestro.idresponsableentrega_49) : ''
      );
      setFecha(new Date().toISOString().slice(0, 16));
      setEstado('COMPLETADA');
      setOrigenSalidaFolio(folio);
      setOrigenSalidaId(idSalida);
      setObservacion(`Devolución de préstamo ${folio}`);
      setFirmaTrabajador(''); // firmas nuevas
      setFirmaPanolero('');
      setDetalles(
        lineasPendientes.map((d) => ({
          idherramienta_50: d.idherramienta_50,
          cantidad_50: d.cantidad_50,
          estadoentrega_50: d.estadoentrega_50 || 'BUENA',
          estadodevolucion_50: 'BUENA', // el pañolero verifica / cambia
          observacion_50: d.observacion_50 || '',
        }))
      );
      setShowForm(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      await showError('Error', 'Error de conexión al cargar el préstamo');
    }
  };

  const addDetalle = () => {
    const idH = Number(herramientaSel);
    const cant = Number(cantidadSel);
    if (!idH || !cant || cant < 1) {
      showError('Validación', 'Seleccione herramienta y cantidad válida');
      return;
    }

    const h = herramientas.find((x) => x.idherramienta_48 === idH);
    if (!h) {
      showError('Validación', 'Herramienta no encontrada');
      return;
    }

    if (tipo === 'SALIDA') {
      if (Number(h.stock_disponible_48) < cant) {
        showError(
          'Sin stock disponible',
          `${h.codigo_48} no se puede prestar. Disponible: ${h.stock_disponible_48}`
        );
        return;
      }
      if (['PERDIDA', 'DANADA', 'DE_BAJA', 'EN_MANTENCION'].includes(h.estado_48)) {
        showError('No disponible', `${h.codigo_48} está en estado ${h.estado_48}`);
        return;
      }
    }

    setDetalles((prev) => [
      ...prev,
      {
        idherramienta_50: idH,
        cantidad_50: cant,
        estadoentrega_50: 'BUENA',
        estadodevolucion_50: tipo === 'DEVOLUCION' ? 'BUENA' : '',
        observacion_50: '',
      },
    ]);
    setHerramientaSel('');
    setCantidadSel('1');
  };

  const startEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: MaestroPanol & {
        firmatrabajador_49: string;
        firmapanolero_49: string;
        idresponsableentrega_49?: number;
        observacion_49?: string;
      }; detalles: DetalleLinea[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar el movimiento');
        return;
      }
      const { maestro, detalles: dets } = data.data;
      setEditingId(id);
      setTipo(maestro.tipomovimiento_49 as 'SALIDA' | 'DEVOLUCION');
      setIdTrabajador(String(maestro.idtrabajador_49));
      setIdResponsable(maestro.idresponsableentrega_49 ? String(maestro.idresponsableentrega_49) : '');
      setFecha(new Date(maestro.fecha_49).toISOString().slice(0, 16));
      setObservacion(maestro.observacion_49 || '');
      setEstado(maestro.estado_49);
      setFirmaTrabajador(maestro.firmatrabajador_49 || '');
      setFirmaPanolero(maestro.firmapanolero_49 || '');
      setDetalles(
        (dets || []).map((d) => ({
          idherramienta_50: d.idherramienta_50,
          cantidad_50: d.cantidad_50,
          estadoentrega_50: d.estadoentrega_50 || 'BUENA',
          estadodevolucion_50: d.estadodevolucion_50 || '',
          observacion_50: d.observacion_50 || '',
        }))
      );
      setShowForm(true);
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (!idTrabajador) {
      await showError('Validación', 'Seleccione un trabajador');
      return;
    }
    if (!idResponsable) {
      await showError('Validación', 'Seleccione un responsable de entrega');
      return;
    }
    if (!detalles.length) {
      await showError('Validación', 'Agregue al menos una herramienta');
      return;
    }
    if (!firmaTrabajador || !firmaPanolero) {
      await showError('Validación', 'Ambas firmas son obligatorias');
      return;
    }
    if (tipo === 'DEVOLUCION' && detalles.some((d) => !d.estadodevolucion_50)) {
      await showError('Validación', 'Indique estado de devolución en cada línea');
      return;
    }

    const payload = {
      tipomovimiento_49: tipo,
      idtrabajador_49: Number(idTrabajador),
      idresponsableentrega_49: Number(idResponsable),
      fecha_49: fecha ? new Date(fecha).toISOString() : null,
      estado_49: estado,
      observacion_49: observacion.trim() || null,
      firmatrabajador_49: firmaTrabajador,
      firmapanolero_49: firmaPanolero,
      ...(tipo === 'DEVOLUCION' && origenSalidaId
        ? { idsalidaorigen_49: origenSalidaId }
        : {}),
      detalles: detalles.map((d) => ({
        idherramienta_50: d.idherramienta_50,
        cantidad_50: d.cantidad_50,
        estadoentrega_50: d.estadoentrega_50,
        estadodevolucion_50: tipo === 'DEVOLUCION' ? d.estadodevolucion_50 : null,
        observacion_50: d.observacion_50 || null,
      })),
    };

    savingRef.current = true;
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
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleAnular = async (id: number) => {
    const ok = await showDeleteConfirm('este movimiento (se anulará)');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Anulado', data.message || 'Movimiento anulado');
      } else {
        await showError('Error', data.error || 'No se pudo anular');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const getHerramienta = (id: number) =>
    herramientas.find((x) => x.idherramienta_48 === id);

  if (loading) return <div className="loading">Cargando movimientos de pañol...</div>;

  return (
    <div className="bodega-view panol-movimiento-view">
      <div className="view-header">
        <h2>Movimientos de Pañol</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={handleNuevoMovimiento}>+ Nuevo</button>
          <button
            type="button"
            className="btn-success"
            disabled={!showForm || saving}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>Salir</button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container panol-form">
          <h3>
            {editingId
              ? `Editar movimiento #${editingId}`
              : origenSalidaFolio
                ? `Nueva devolución (desde ${origenSalidaFolio})`
                : 'Nuevo movimiento'}
          </h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            {origenSalidaFolio && tipo === 'DEVOLUCION' && (
              <div className="panol-origen-banner" role="status">
                Devolución generada desde el préstamo <strong>{origenSalidaFolio}</strong>.
                Verifique el <strong>estado de devolución</strong> de cada herramienta y firme.
              </div>
            )}
            <div className="panol-cabecera-linea">
              <div className="form-group panol-field-tipo">
                <label htmlFor="tipo">Tipo *</label>
                <select
                  id="tipo"
                  className="form-input"
                  value={tipo}
                  onChange={(e) => {
                    const nuevoTipo = e.target.value as 'SALIDA' | 'DEVOLUCION';
                    setTipo(nuevoTipo);
                    setEstado(estadoPorTipo(nuevoTipo));
                    setOrigenSalidaFolio('');
                    setOrigenSalidaId(null);
                  }}
                  disabled={Boolean(origenSalidaFolio)}
                >
                  <option value="SALIDA">SALIDA</option>
                  <option value="DEVOLUCION">DEVOLUCION</option>
                </select>
              </div>

              <div className="form-group panol-field-fecha">
                <label htmlFor="fecha">Fecha *</label>
                <input id="fecha" type="datetime-local" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </div>

              <div className="form-group panol-field-estado">
                <label htmlFor="estado">Estado</label>
                <select id="estado" className="form-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="COMPLETADA">COMPLETADA</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="ANULADA">ANULADA</option>
                </select>
              </div>

              <div className="form-group panol-field-trabajador">
                <label htmlFor="buscar-trab">Trabajador *</label>
                <input
                  id="buscar-trab"
                  className="form-input"
                  placeholder="Buscar por apellido..."
                  value={buscarTrabajador}
                  onChange={(e) => setBuscarTrabajador(e.target.value.toUpperCase())}
                />
                <div className="panol-trabajador-list" role="listbox" aria-label="Trabajadores">
                  {trabajadoresFiltrados.map((t) => (
                    <button
                      key={t.idtrabajador_06}
                      type="button"
                      className={`panol-trabajador-item ${idTrabajador === String(t.idtrabajador_06) ? 'selected' : ''}`}
                      onClick={() => setIdTrabajador(String(t.idtrabajador_06))}
                    >
                      {(t.apaterno_06 || '')} {(t.amaterno_06 || '')} {t.nombre_06}
                      <small>{t.ruttrabajador_06}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group panol-field-responsable">
                <label htmlFor="responsable">Responsable entrega *</label>
                <select
                  id="responsable"
                  className="form-input"
                  value={idResponsable}
                  onChange={(e) => setIdResponsable(e.target.value)}
                  required
                  aria-required="true"
                >
                  <option value="">Seleccione responsable...</option>
                  {responsables.map((r) => (
                    <option key={r.idresponsableentrega_08} value={r.idresponsableentrega_08}>
                      {`${r.nombreresponsableentrega_08 || ''} ${r.apaternoresponsableentrega_08 || ''} ${r.amaternoresponsableentrega_08 || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group panol-field-obs">
                <label htmlFor="obs">Observación (opcional)</label>
                <textarea id="obs" className="form-input" rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
              </div>
            </div>

            <div className="panol-detalle-box">
              <div className="panol-detalle-header">
                <h4>Detalle de herramientas</h4>
                <span className="panol-detalle-count">
                  {detalles.length} {detalles.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              <div className="panol-detalle-add form-row form-row-3">
                <div className="form-group">
                  <label htmlFor="herr">Herramienta</label>
                  <SearchableSelect
                    id="herr"
                    value={herramientaSel}
                    onChange={setHerramientaSel}
                    options={herramientasOptions}
                    placeholder="Buscar por código o nombre..."
                    aria-label="Buscar y seleccionar herramienta"
                    emptyMessage="No se encontraron herramientas con ese criterio"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cant">Cantidad</label>
                  <input
                    id="cant"
                    type="number"
                    min={1}
                    className="form-input"
                    value={cantidadSel}
                    onChange={(e) => setCantidadSel(e.target.value)}
                  />
                </div>
                <div className="form-group panol-detalle-add-btn">
                  <button type="button" className="btn-primary" onClick={addDetalle}>
                    + Agregar
                  </button>
                </div>
              </div>

              <div className="table-container panol-detalle-table-wrap">
                <table className="data-table panol-detalle-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Código</th>
                      <th>Herramienta</th>
                      <th>Estado herr.</th>
                      <th>Disp.</th>
                      <th>Cant.</th>
                      <th>Estado entrega</th>
                      {tipo === 'DEVOLUCION' && <th>Estado devolución</th>}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.length === 0 ? (
                      <tr>
                        <td colSpan={tipo === 'DEVOLUCION' ? 9 : 8} className="panol-empty">
                          Agregue herramientas a prestar / devolver
                        </td>
                      </tr>
                    ) : (
                      detalles.map((d, idx) => {
                        const h = getHerramienta(d.idherramienta_50);
                        return (
                          <tr key={`${d.idherramienta_50}-${idx}`}>
                            <td className="text-center">{String(idx + 1).padStart(2, '0')}</td>
                            <td><strong>{h?.codigo_48 || '-'}</strong></td>
                            <td>{h?.nombre_48 || d.idherramienta_50}</td>
                            <td className="text-center">
                              <span
                                className={badgeEstadoHerramienta(h?.estado_48 || '-')}
                                title="Estado actual en catálogo de herramientas"
                              >
                                {h?.estado_48 || '-'}
                              </span>
                            </td>
                            <td className="text-center">{h?.stock_disponible_48 ?? '-'}</td>
                            <td className="text-center">
                              <input
                                type="number"
                                min={1}
                                className="form-input panol-cant-input"
                                value={d.cantidad_50}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  setDetalles((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, cantidad_50: Number.isNaN(n) || n < 1 ? 1 : n } : x
                                    )
                                  );
                                }}
                                aria-label={`Cantidad ítem ${idx + 1}`}
                              />
                            </td>
                            <td className="text-center">
                              {tipo === 'DEVOLUCION' ? (
                                <span
                                  className="badge-estado badge-entrega-bloqueado"
                                  title="Estado con el que salió en el préstamo (no editable)"
                                  aria-label={`Estado entrega ítem ${idx + 1}: ${d.estadoentrega_50}`}
                                >
                                  {d.estadoentrega_50 || 'BUENA'}
                                </span>
                              ) : (
                                <select
                                  className="form-input panol-estado-select"
                                  value={d.estadoentrega_50}
                                  onChange={(e) =>
                                    setDetalles((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, estadoentrega_50: e.target.value } : x
                                      )
                                    )
                                  }
                                  aria-label={`Estado entrega ítem ${idx + 1}`}
                                >
                                  <option value="BUENA">BUENA</option>
                                  <option value="REGULAR">REGULAR</option>
                                  <option value="DANADA">DANADA</option>
                                </select>
                              )}
                            </td>
                            {tipo === 'DEVOLUCION' && (
                              <td>
                                <select
                                  className="form-input panol-estado-select"
                                  value={d.estadodevolucion_50}
                                  onChange={(e) =>
                                    setDetalles((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, estadodevolucion_50: e.target.value } : x
                                      )
                                    )
                                  }
                                  aria-label={`Estado devolución ítem ${idx + 1}`}
                                >
                                  <option value="BUENA">BUENA</option>
                                  <option value="REGULAR">REGULAR</option>
                                  <option value="DANADA">DANADA</option>
                                  <option value="PERDIDA">PERDIDA</option>
                                </select>
                              </td>
                            )}
                            <td className="actions">
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() =>
                                  setDetalles((prev) => prev.filter((_, i) => i !== idx))
                                }
                                title="Quitar herramienta"
                                aria-label={`Quitar ${h?.nombre_48 || 'herramienta'}`}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panol-firmas">
              <SignaturePad label="Firma del trabajador *" value={firmaTrabajador} onChange={setFirmaTrabajador} />
              <SignaturePad label="Firma del pañolero *" value={firmaPanolero} onChange={setFirmaPanolero} />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="panol-toolbar">
        <div className="panol-filters" role="search" aria-label="Filtros de movimientos">
          <p className="panol-total">
            Total: <strong>{filteredAndSorted.length}</strong>
          </p>
          <label className="panol-filter-field">
            <span>Desde</span>
            <input
              type="date"
              className="form-input panol-filter-date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              aria-label="Fecha desde"
            />
          </label>
          <label className="panol-filter-field">
            <span>Hasta</span>
            <input
              type="date"
              className="form-input panol-filter-date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              aria-label="Fecha hasta"
            />
          </label>
          <select
            className="form-input panol-filter-select"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="">Tipo</option>
            <option value="SALIDA">SALIDA</option>
            <option value="DEVOLUCION">DEVOLUCION</option>
          </select>
          <select
            className="form-input panol-filter-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Estado</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="COMPLETADA">COMPLETADA</option>
            <option value="ANULADA">ANULADA</option>
          </select>
          <select
            className="form-input panol-filter-select panol-filter-wide"
            value={filtroTrabajador}
            onChange={(e) => setFiltroTrabajador(e.target.value)}
            aria-label="Filtrar por trabajador"
          >
            <option value="">Trabajador</option>
            {trabajadoresFiltroOpciones.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <select
            className="form-input panol-filter-select panol-filter-wide"
            value={filtroHerramienta}
            onChange={(e) => setFiltroHerramienta(e.target.value)}
            aria-label="Filtrar por herramienta"
          >
            <option value="">Herramienta</option>
            {herramientasFiltroOpciones.map((h) => (
              <option key={h.id} value={h.id}>
                {h.codigo} - {h.nombre}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="form-input panol-search"
            placeholder="🔍 BUSCAR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            aria-label="Buscar movimientos"
          />
          <button
            type="button"
            className="btn-secondary panol-filter-clear"
            onClick={limpiarFiltros}
            aria-label="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table panol-data-table">
          <thead>
            <tr>
              <th className={sortClass('idmpanol_49')} onClick={() => handleSort('idmpanol_49')}>ID</th>
              <th className={sortClass('folio_49')} onClick={() => handleSort('folio_49')}>Folio</th>
              <th className={sortClass('tipomovimiento_49')} onClick={() => handleSort('tipomovimiento_49')}>Tipo</th>
              <th className={sortClass('trabajador_nombre')} onClick={() => handleSort('trabajador_nombre')}>Trabajador</th>
              <th className={sortClass('responsable_nombre')} onClick={() => handleSort('responsable_nombre')}>Responsable</th>
              <th className={sortClass('fecha_49')} onClick={() => handleSort('fecha_49')}>Fecha</th>
              <th className={sortClass('estado_49')} onClick={() => handleSort('estado_49')}>Estado mov.</th>
              <th>Herramientas / Estado</th>
              <th className={sortClass('observacion_49')} onClick={() => handleSort('observacion_49')}>Observación</th>
              <th>Firma trabajador</th>
              <th>Firma pañolero</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="panol-empty">
                  No hay movimientos registrados
                </td>
              </tr>
            ) : (
              pageItems.map((m, idx) => (
                <tr key={`${m.idmpanol_49}-${idx}`}>
                  <td>{m.idmpanol_49}</td>
                  <td><strong>{m.folio_49 || '-'}</strong></td>
                  <td>
                    <span className={`badge-tipo badge-tipo-${m.tipomovimiento_49.toLowerCase()}`}>
                      {m.tipomovimiento_49}
                    </span>
                  </td>
                  <td>{m.trabajador_nombre || m.idtrabajador_49}</td>
                  <td>{m.responsable_nombre?.trim() || '-'}</td>
                  <td>{formatFecha(m.fecha_49)}</td>
                  <td>
                    <span className={`badge-estado badge-${m.estado_49.toLowerCase()}`}>
                      {m.estado_49}
                    </span>
                  </td>
                  <td className="panol-herramientas-cell">
                    {Array.isArray(m.herramientas_detalle) && m.herramientas_detalle.length > 0 ? (
                      <ul className="panol-herramientas-list" aria-label={`Herramientas de ${m.folio_49 || m.idmpanol_49}`}>
                        {m.herramientas_detalle.map((h) => (
                          <li key={`${m.idmpanol_49}-${h.idherramienta}`}>
                            <span className="panol-herr-line">
                              <strong>{h.codigo}</strong>
                              {h.nombre ? (
                                <span className="panol-herr-nombre" title={h.nombre}>
                                  {' '}
                                  - {h.nombre}
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={badgeEstadoHerramienta(h.estado)}
                              title={`${h.nombre || h.codigo} — disponible: ${h.stock_disponible}`}
                            >
                              {h.estado}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="panol-firma-empty">Sin detalle</span>
                    )}
                  </td>
                  <td className="panol-obs-cell">
                    {m.observacion_49?.trim() ? (
                      <span className="panol-obs-text" title={m.observacion_49}>
                        {m.observacion_49}
                      </span>
                    ) : (
                      <span className="panol-firma-empty">—</span>
                    )}
                  </td>
                  <td className="panol-firma-cell">
                    {m.firmatrabajador_49?.startsWith('data:image') ? (
                      <img
                        src={m.firmatrabajador_49}
                        alt={`Firma trabajador ${m.folio_49 || m.idmpanol_49}`}
                        className="panol-firma-thumb"
                        title="Firma del trabajador"
                      />
                    ) : (
                      <span className="panol-firma-empty">Sin firma</span>
                    )}
                  </td>
                  <td className="panol-firma-cell">
                    {m.firmapanolero_49?.startsWith('data:image') ? (
                      <img
                        src={m.firmapanolero_49}
                        alt={`Firma pañolero ${m.folio_49 || m.idmpanol_49}`}
                        className="panol-firma-thumb"
                        title="Firma del pañolero"
                      />
                    ) : (
                      <span className="panol-firma-empty">Sin firma</span>
                    )}
                  </td>
                  <td className="actions">
                    {puedeDevolverDesdeSalida(m) && (
                      <button
                        type="button"
                        className="btn-devolver"
                        onClick={() => startDevolucionDesdeSalida(m.idmpanol_49)}
                        title="Generar devolución desde este préstamo"
                        aria-label={`Devolver herramientas de ${m.folio_49 || m.idmpanol_49}`}
                      >
                        <span aria-hidden="true">↩️</span>
                        <span className="btn-devolver-label">Devolver</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(m.idmpanol_49)}
                      title="Editar"
                      aria-label={`Editar ${m.folio_49 || m.idmpanol_49}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleAnular(m.idmpanol_49)}
                      title="Anular"
                      aria-label={`Anular ${m.folio_49 || m.idmpanol_49}`}
                      disabled={m.estado_49 === 'ANULADA'}
                    >
                      🚫
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
        totalItems={filteredAndSorted.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default PanolMovimientoView;
