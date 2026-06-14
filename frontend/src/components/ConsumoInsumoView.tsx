import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './BodegaView.css';
import './ConsumoInsumoView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { exportToExcel } from '../utils/exportUtils';
import { apiUrl, openAuthenticatedBlob } from '../lib/apiClient';

interface MaestroConsumo {
  id_m_consumo_insumo_46: number;
  idtrabajador_46: number;
  id_responsableentrega_46: number;
  id_ccosto_46: number;
  id_insumo_46: number;
  cantidad_46: number;
  fecha_46: string;
  hora_46: string;
  observacion_46?: string;
  trabajador_nombre?: string;
  responsable_nombre?: string;
  ccosto_nombre?: string;
  insumo_descripcion?: string;
}

interface DetalleConsumo {
  id_d_consumo_insumo_47: number;
  id_m_consumo_insumo_47: number;
  id_insumo_47: number;
  cantidad_47: number;
  total_47: number;
  observacion_47?: string;
  insumo_descripcion?: string;
  precio_insumo?: number;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
  nombre_cargo?: string;
}

interface Responsable {
  idresponsableentrega_08: number;
  nombre_completo?: string;
  nombreresponsableentrega_08: string;
}

interface Ccosto {
  id_ccosto_45: number;
  ccosto_45: string;
}

interface Categoria {
  id_categoria_42: number;
  categoria_42: string;
}

interface Insumo {
  id_insumo_43: number;
  descripcion_43: string;
  precio_insumo_43: number;
  id_categoria_43?: number;
}

interface LineaItem {
  id_categoria: number;
  id_insumo: number;
  descripcion: string;
  cantidad: number;
  precio: number;
  total: number;
  observacion?: string;
  isMaster?: boolean;
}

interface DetalleLineaEditable {
  key: string;
  isMaster: boolean;
  id_d_consumo_insumo_47?: number;
  id_insumo: number;
  cantidad: number;
  observacion: string;
  editing: boolean;
  backup?: { id_insumo: number; cantidad: number; observacion: string };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

interface ActaInsumoPreviewData {
  intro: { dia: number; mes: string; anio: number };
  trabajador: { nombre: string; rut: string; cargo: string; empresa: string; ccosto: string };
  insumos: Array<{ item: string; cantidad: number; categoria: string }>;
  observaciones?: string | null;
  responsable: { nombre: string; fecha: string; hora: string };
}

const API_URL = apiUrl('/consumo-insumos');
const TRABAJADORES_URL = apiUrl('/trabajadores');
const RESPONSABLES_URL = apiUrl('/responsables-entrega');
const CCOSTOS_URL = apiUrl('/ccostos');
const INSUMOS_URL = apiUrl('/insumos');
const CATEGORIAS_URL = apiUrl('/categorias');

const formatAmount = (value: number) =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatCantidad = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.trunc(value));

const parseCantidadEntera = (raw: string): number => {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
};

function buildDetalleLineasFromConsumo(data: {
  maestro: MaestroConsumo;
  detalles: DetalleConsumo[];
}): DetalleLineaEditable[] {
  const lines: DetalleLineaEditable[] = [
    {
      key: 'master',
      isMaster: true,
      id_insumo: data.maestro.id_insumo_46,
      cantidad: Math.trunc(data.maestro.cantidad_46),
      observacion: data.maestro.observacion_46 || '',
      editing: false
    }
  ];
  for (const d of data.detalles) {
    lines.push({
      key: `d-${d.id_d_consumo_insumo_47}`,
      isMaster: false,
      id_d_consumo_insumo_47: d.id_d_consumo_insumo_47,
      id_insumo: d.id_insumo_47,
      cantidad: Math.trunc(d.cantidad_47),
      observacion: d.observacion_47 || '',
      editing: false
    });
  }
  return lines;
}

const ConsumoInsumoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [consumos, setConsumos] = useState<MaestroConsumo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [ccostos, setCcostos] = useState<Ccosto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof MaestroConsumo; direction: 'asc' | 'desc' } | null>(null);
  const [selectedConsumoId, setSelectedConsumoId] = useState<number | null>(null);
  const [detalleConsumo, setDetalleConsumo] = useState<{ maestro: MaestroConsumo; detalles: DetalleConsumo[] } | null>(null);
  const [detalleLineas, setDetalleLineas] = useState<DetalleLineaEditable[]>([]);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewConsumoId, setPreviewConsumoId] = useState<number | null>(null);
  const [previewActaData, setPreviewActaData] = useState<ActaInsumoPreviewData | null>(null);
  const [loadingActa, setLoadingActa] = useState(false);

  const [buscarApellido, setBuscarApellido] = useState('');
  const [idTrabajador, setIdTrabajador] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [buscarCcosto, setBuscarCcosto] = useState('');
  const [idCcosto, setIdCcosto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [lineas, setLineas] = useState<LineaItem[]>([
    { id_categoria: 0, id_insumo: 0, descripcion: '', cantidad: 0, precio: 0, total: 0, observacion: '', isMaster: true }
  ]);


  useEffect(() => {
    fetchConsumos();
    fetchTrabajadores();
    fetchResponsables();
    fetchCcostos();
    fetchCategorias();
    fetchInsumos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroFechaDesde, filtroFechaHasta]);

  const fetchConsumos = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const data: ApiResponse<MaestroConsumo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConsumos(data.data);
      } else {
        setError('Error al cargar consumos');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrabajadores = async () => {
    try {
      const res = await fetch(TRABAJADORES_URL);
      const data: ApiResponse<Trabajador[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTrabajadores(data.data);
      }
    } catch {}
  };

  const fetchResponsables = async () => {
    try {
      const res = await fetch(RESPONSABLES_URL);
      const data: ApiResponse<Responsable[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setResponsables(data.data);
      }
    } catch {}
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetch(CATEGORIAS_URL);
      const data: ApiResponse<Categoria[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategorias(data.data);
      }
    } catch {}
  };

  const fetchCcostos = async () => {
    try {
      const res = await fetch(`${CCOSTOS_URL}?activo=true`);
      const data: ApiResponse<Ccosto[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCcostos(data.data);
      }
    } catch {}
  };

  const fetchInsumos = async () => {
    try {
      const res = await fetch(INSUMOS_URL);
      const data: ApiResponse<Insumo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInsumos(data.data);
      }
    } catch {}
  };

  const getTrabajadorNombre = (t: Trabajador) =>
    [t.nombre_06, t.apaterno_06, t.amaterno_06].filter(Boolean).join(' ').trim();
  const getResponsableNombre = (r: Responsable) =>
    r.nombre_completo || r.nombreresponsableentrega_08 || '';

  const processedConsumos = useMemo(() => {
    let data = [...consumos];

    if (filtroFechaDesde || filtroFechaHasta) {
      data = data.filter((c) => {
        if (!c.fecha_46) return false;
        const fechaConsumo = String(c.fecha_46).split('T')[0];
        if (filtroFechaDesde && fechaConsumo < filtroFechaDesde) return false;
        if (filtroFechaHasta && fechaConsumo > filtroFechaHasta) return false;
        return true;
      });
    }

    if (searchTerm.trim()) {
      const st = searchTerm.toLowerCase();
      data = data.filter((c) => {
        const trabajador = (c.trabajador_nombre || '').toLowerCase();
        const responsable = (c.responsable_nombre || '').toLowerCase();
        const ccosto = (c.ccosto_nombre || '').toLowerCase();
        const insumo = (c.insumo_descripcion || '').toLowerCase();
        const fecha = (c.fecha_46 || '').toLowerCase();
        const id = String(c.id_m_consumo_insumo_46);
        return (
          trabajador.includes(st) ||
          responsable.includes(st) ||
          ccosto.includes(st) ||
          insumo.includes(st) ||
          fecha.includes(st) ||
          id.includes(st)
        );
      });
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      data.sort((a, b) => {
        const fechaA = new Date(a.fecha_46 + ' ' + a.hora_46);
        const fechaB = new Date(b.fecha_46 + ' ' + b.hora_46);
        return fechaB.getTime() - fechaA.getTime();
      });
    }

    return data;
  }, [consumos, searchTerm, filtroFechaDesde, filtroFechaHasta, sortConfig]);

  const trabajadoresFiltrados = useMemo(() => {
    if (!buscarApellido || buscarApellido.trim() === '') return trabajadores;
    const busqueda = buscarApellido.trim();
    const apellidos = busqueda.split(/\s+/).map((a) => a.toLowerCase());
    if (apellidos.length === 1) {
      const word = apellidos[0];
      const paternoMatch = trabajadores.filter(
        (t) => t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(word)
      );
      const maternoMatch = trabajadores.filter(
        (t) =>
          t.amaterno_06 != null &&
          t.amaterno_06.toLowerCase().startsWith(word) &&
          !paternoMatch.some((p) => p.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paternoMatch, ...maternoMatch];
    }
    const [primer, segundo] = apellidos;
    return trabajadores
      .filter(
        (t) =>
          t.apaterno_06 != null &&
          t.apaterno_06.toLowerCase().startsWith(primer) &&
          t.amaterno_06 != null &&
          t.amaterno_06.toLowerCase().startsWith(segundo)
      )
      .sort((a, b) => {
        const cmpP = (a.apaterno_06 || '').localeCompare(b.apaterno_06 || '');
        return cmpP !== 0 ? cmpP : (a.amaterno_06 || '').localeCompare(b.amaterno_06 || '');
      });
  }, [trabajadores, buscarApellido]);

  const ccostosFiltrados = useMemo(() => {
    if (!buscarCcosto || buscarCcosto.trim() === '') return ccostos;
    const busqueda = buscarCcosto.trim().toLowerCase();
    return ccostos.filter((c) => c.ccosto_45.toLowerCase().includes(busqueda));
  }, [ccostos, buscarCcosto]);

  const handleSort = (key: keyof MaestroConsumo) => {
    setSortConfig((prev) =>
      prev?.key === key && prev.direction === 'asc'
        ? { key, direction: 'desc' }
        : { key, direction: 'asc' }
    );
  };

  const handleExport = async () => {
    const dataToExport = processedConsumos.map((c) => ({
      ID: c.id_m_consumo_insumo_46,
      Fecha: c.fecha_46,
      Hora: c.hora_46.slice(0, 5),
      Trabajador: c.trabajador_nombre || '',
      Responsable: c.responsable_nombre || '',
      CentroCosto: c.ccosto_nombre || '',
      Insumo: c.insumo_descripcion || '',
      Cantidad: c.cantidad_46
    }));
    exportToExcel(dataToExport, 'consumo-insumos', 'Consumos');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedConsumos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedConsumos.length / itemsPerPage);

  const addLinea = () => {
    setLineas((prev) => [
      ...prev,
      { id_categoria: 0, id_insumo: 0, descripcion: '', cantidad: 0, precio: 0, total: 0, observacion: '' }
    ]);
  };

  const removeLinea = (index: number) => {
    if (lineas.length <= 1) return;
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLinea = (index: number, field: keyof LineaItem, value: number | string) => {
    setLineas((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'id_categoria') {
        item.id_insumo = 0;
        item.descripcion = '';
        item.precio = 0;
        item.total = 0;
      } else if (field === 'id_insumo') {
        const ins = insumos.find((i) => i.id_insumo_43 === value);
        item.descripcion = ins?.descripcion_43 || '';
        item.precio = ins?.precio_insumo_43 || 0;
        item.total = item.cantidad * item.precio;
      } else if (field === 'cantidad') {
        const cantidadEntera = parseCantidadEntera(String(value));
        item.cantidad = cantidadEntera;
        item.total = cantidadEntera * item.precio;
      }
      next[index] = item;
      return next;
    });
  };

  const resetForm = () => {
    setBuscarApellido('');
    setIdTrabajador('');
    setIdResponsable('');
    setBuscarCcosto('');
    setIdCcosto('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setLineas([
      { id_categoria: 0, id_insumo: 0, descripcion: '', cantidad: 0, precio: 0, total: 0, observacion: '', isMaster: true }
    ]);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const first = lineas[0];
    if (!first || first.id_categoria === 0 || first.id_insumo === 0 || first.cantidad <= 0) {
      await showError('Validación', 'Debe seleccionar categoría e insumo con cantidad entera mayor a 0');
      return;
    }
    if (!Number.isInteger(first.cantidad)) {
      await showError('Validación', 'La cantidad debe ser un número entero');
      return;
    }
    const detallesInvalidos = lineas.slice(1).some(
      (l) => l.id_insumo > 0 && l.cantidad > 0 && !Number.isInteger(l.cantidad)
    );
    if (detallesInvalidos) {
      await showError('Validación', 'La cantidad de cada línea debe ser un número entero');
      return;
    }
    if (!idTrabajador || !idResponsable || !idCcosto) {
      await showError('Validación', 'Trabajador, Responsable y Centro de Costo son requeridos');
      return;
    }
    const detalles = lineas.slice(1).filter((l) => l.id_insumo > 0 && l.cantidad > 0);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idtrabajador_46: parseInt(idTrabajador, 10),
          id_responsableentrega_46: parseInt(idResponsable, 10),
          id_ccosto_46: parseInt(idCcosto, 10),
          id_insumo_46: first.id_insumo,
          cantidad_46: first.cantidad,
          fecha_46: fecha,
          hora_46: hora,
          observacion_46: observacion.trim() || undefined,
          detalles: detalles.map((d) => ({
            id_insumo_47: d.id_insumo,
            cantidad_47: d.cantidad,
            observacion_47: d.observacion?.trim() || undefined
          }))
        })
      });
      const data: ApiResponse<MaestroConsumo> = await res.json();
      if (data.success && data.data) {
        await fetchConsumos();
        const newId = data.data.id_m_consumo_insumo_46;
        setEditingId(newId);
        setSelectedConsumoId(newId);
        setShowForm(true);
        await showSuccess(
          '¡Consumo creado!',
          'Registro guardado. Ya puede generar el acta de entrega en PDF.'
        );
      } else {
        await showError('Error al crear', data.error || 'Error al crear consumo');
      }
    } catch {
      await showError('Error', 'Error al crear consumo');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    const first = lineas[0];
    if (!first || first.id_categoria === 0 || first.id_insumo === 0 || first.cantidad <= 0) {
      await showError('Validación', 'Debe seleccionar categoría e insumo con cantidad entera mayor a 0');
      return;
    }
    if (!Number.isInteger(first.cantidad)) {
      await showError('Validación', 'La cantidad debe ser un número entero');
      return;
    }
    const detallesInvalidos = lineas.slice(1).some(
      (l) => l.id_insumo > 0 && l.cantidad > 0 && !Number.isInteger(l.cantidad)
    );
    if (detallesInvalidos) {
      await showError('Validación', 'La cantidad de cada línea debe ser un número entero');
      return;
    }
    if (!idTrabajador || !idResponsable || !idCcosto) {
      await showError('Validación', 'Trabajador, Responsable y Centro de Costo son requeridos');
      return;
    }
    const detalles = lineas.slice(1).filter((l) => l.id_insumo > 0 && l.cantidad > 0);
    try {
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idtrabajador_46: parseInt(idTrabajador, 10),
          id_responsableentrega_46: parseInt(idResponsable, 10),
          id_ccosto_46: parseInt(idCcosto, 10),
          id_insumo_46: first.id_insumo,
          cantidad_46: first.cantidad,
          fecha_46: fecha,
          hora_46: hora,
          observacion_46: observacion.trim() || undefined,
          detalles: detalles.map((d) => ({
            id_insumo_47: d.id_insumo,
            cantidad_47: d.cantidad,
            observacion_47: d.observacion?.trim() || undefined
          }))
        })
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchConsumos();
        await showSuccess(
          '¡Consumo actualizado!',
          'Cambios guardados. Puede generar o imprimir el acta de entrega.'
        );
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar consumo');
      }
    } catch {
      await showError('Error', 'Error al actualizar consumo');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este consumo de insumos');
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        if (id === selectedConsumoId) {
          setSelectedConsumoId(null);
          setDetalleConsumo(null);
        }
        await fetchConsumos();
        await showSuccess('¡Consumo eliminado!', 'El consumo ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar consumo');
      }
    } catch {
      await showError('Error', 'Error al eliminar consumo');
    }
  };

  const getPrecioInsumo = useCallback(
    (idInsumo: number) => insumos.find((i) => i.id_insumo_43 === idInsumo)?.precio_insumo_43 ?? 0,
    [insumos]
  );

  const getInsumoDescripcion = useCallback(
    (idInsumo: number, fallback?: string) =>
      insumos.find((i) => i.id_insumo_43 === idInsumo)?.descripcion_43 || fallback || '-',
    [insumos]
  );

  const persistDetalleLineas = useCallback(
    async (lineas: DetalleLineaEditable[]) => {
      if (!detalleConsumo) return false;

      const masterLine = lineas.find((l) => l.isMaster);
      if (!masterLine || masterLine.cantidad <= 0 || !Number.isInteger(masterLine.cantidad)) {
        await showError('Validación', 'La cantidad del insumo principal debe ser un entero mayor a 0');
        return false;
      }

      for (const linea of lineas) {
        if (linea.cantidad <= 0 || !Number.isInteger(linea.cantidad)) {
          await showError('Validación', 'Todas las cantidades deben ser enteros mayores a 0');
          return false;
        }
      }

      setSavingDetalle(true);
      try {
        const m = detalleConsumo.maestro;
        const fechaStr = m.fecha_46 ? String(m.fecha_46).split('T')[0] : '';
        const horaStr = m.hora_46 ? String(m.hora_46).slice(0, 8) : '';

        const res = await fetch(`${API_URL}/${m.id_m_consumo_insumo_46}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idtrabajador_46: m.idtrabajador_46,
            id_responsableentrega_46: m.id_responsableentrega_46,
            id_ccosto_46: m.id_ccosto_46,
            id_insumo_46: masterLine.id_insumo,
            cantidad_46: masterLine.cantidad,
            fecha_46: fechaStr,
            hora_46: horaStr,
            observacion_46: masterLine.observacion.trim() || undefined,
            detalles: lineas
              .filter((l) => !l.isMaster)
              .map((l) => ({
                id_insumo_47: l.id_insumo,
                cantidad_47: l.cantidad,
                observacion_47: l.observacion.trim() || undefined
              }))
          })
        });

        const data: ApiResponse = await res.json();
        if (!data.success) {
          await showError('Error', data.error || 'No se pudo guardar el detalle');
          return false;
        }

        await fetchConsumos();
        const refresh = await fetch(`${API_URL}/${m.id_m_consumo_insumo_46}`);
        const refreshData: ApiResponse<{ maestro: MaestroConsumo; detalles: DetalleConsumo[] }> =
          await refresh.json();
        if (refreshData.success && refreshData.data) {
          setDetalleConsumo(refreshData.data);
          setDetalleLineas(buildDetalleLineasFromConsumo(refreshData.data));
        }
        await showSuccess('¡Guardado!', 'Detalle actualizado correctamente.');
        return true;
      } catch {
        await showError('Error', 'Error al guardar el detalle');
        return false;
      } finally {
        setSavingDetalle(false);
      }
    },
    [detalleConsumo, fetchConsumos]
  );

  const startEditDetalleLinea = (key: string) => {
    setDetalleLineas((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              editing: true,
              backup: { id_insumo: l.id_insumo, cantidad: l.cantidad, observacion: l.observacion }
            }
          : l
      )
    );
  };

  const cancelEditDetalleLinea = (key: string) => {
    setDetalleLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (!l.backup) return { ...l, editing: false };
        return {
          ...l,
          id_insumo: l.backup.id_insumo,
          cantidad: l.backup.cantidad,
          observacion: l.backup.observacion,
          editing: false,
          backup: undefined
        };
      })
    );
  };

  const updateDetalleLineaField = (
    key: string,
    field: 'id_insumo' | 'cantidad' | 'observacion',
    value: number | string
  ) => {
    setDetalleLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (field === 'id_insumo') return { ...l, id_insumo: Number(value) };
        if (field === 'cantidad') return { ...l, cantidad: parseCantidadEntera(String(value)) };
        return { ...l, observacion: String(value) };
      })
    );
  };

  const saveDetalleLinea = async (key: string) => {
    const linea = detalleLineas.find((l) => l.key === key);
    if (!linea) return;
    if (linea.cantidad <= 0 || !Number.isInteger(linea.cantidad)) {
      await showError('Validación', 'La cantidad debe ser un entero mayor a 0');
      return;
    }
    const lineasToSave = detalleLineas.map((l) =>
      l.key === key ? { ...l, editing: false, backup: undefined } : l
    );
    await persistDetalleLineas(lineasToSave);
  };

  const deleteDetalleLinea = async (key: string) => {
    const target = detalleLineas.find((l) => l.key === key);
    if (!target) return;

    let next: DetalleLineaEditable[];

    if (target.isMaster) {
      if (detalleLineas.length <= 1) {
        await showError(
          'No permitido',
          'No puede eliminar la única línea. Elimine el consumo completo desde la grilla principal.'
        );
        return;
      }
      const confirmed = await showDeleteConfirm('la línea principal del detalle');
      if (!confirmed) return;

      const firstDetail = detalleLineas.find((l) => !l.isMaster);
      if (!firstDetail) return;

      const restDetails = detalleLineas.filter((l) => !l.isMaster && l.key !== firstDetail.key);
      next = [
        {
          ...firstDetail,
          key: 'master',
          isMaster: true,
          id_d_consumo_insumo_47: undefined,
          editing: false,
          backup: undefined
        },
        ...restDetails
      ];
    } else {
      const confirmed = await showDeleteConfirm('esta línea de detalle');
      if (!confirmed) return;
      next = detalleLineas.filter((l) => l.key !== key);
    }

    await persistDetalleLineas(next);
  };

  const handleSelectConsumo = async (id: number) => {
    if (selectedConsumoId === id) {
      setSelectedConsumoId(null);
      setDetalleConsumo(null);
      setDetalleLineas([]);
      return;
    }
    setLoadingDetalle(true);
    setDetalleConsumo(null);
    try {
      const res = await fetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: MaestroConsumo; detalles: DetalleConsumo[] }> = await res.json();
      if (data.success && data.data) {
        setSelectedConsumoId(id);
        setDetalleConsumo(data.data);
        setDetalleLineas(buildDetalleLineasFromConsumo(data.data));
      } else {
        await showError('Error', 'Error al cargar el detalle del consumo');
      }
    } catch {
      await showError('Error', 'Error al cargar el detalle del consumo');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setSelectedConsumoId(null);
    setDetalleConsumo(null);
    setDetalleLineas([]);
  };

  const consumoIdForActa = editingId ?? selectedConsumoId;

  const openPreviewModal = useCallback(async (id: number) => {
    setShowPreviewModal(true);
    setPreviewConsumoId(id);
    setPreviewActaData(null);
    setLoadingActa(true);
    try {
      const response = await fetch(`${API_URL}/${id}/acta-datos`);
      const data: ApiResponse<ActaInsumoPreviewData> = await response.json();
      if (data.success && data.data) {
        setPreviewActaData(data.data);
      } else {
        await showError('Error', data.error || 'No se pudieron cargar los datos del acta');
        setShowPreviewModal(false);
      }
    } catch {
      await showError('Error', 'Error de conexión al cargar el acta');
      setShowPreviewModal(false);
    } finally {
      setLoadingActa(false);
    }
  }, []);

  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewActaData(null);
    setPreviewConsumoId(null);
  }, []);

  const handlePrintActa = useCallback(() => {
    window.print();
  }, []);

  const generateActaPdf = useCallback((id: number) => {
    openAuthenticatedBlob(`/consumo-insumos/${id}/acta-pdf`).catch((err) =>
      showError('PDF', err instanceof Error ? err.message : 'No se pudo generar el PDF')
    );
  }, []);

  const startEdit = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: MaestroConsumo; detalles: DetalleConsumo[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', 'Error al cargar consumo');
        return;
      }
      const { maestro, detalles } = data.data;
      setBuscarApellido('');
      setIdTrabajador(String(maestro.idtrabajador_46));
      setIdResponsable(String(maestro.id_responsableentrega_46));
      setBuscarCcosto(maestro.ccosto_nombre || '');
      setIdCcosto(String(maestro.id_ccosto_46));
      setFecha(maestro.fecha_46);
      setHora(maestro.hora_46.slice(0, 5));
      setObservacion(maestro.observacion_46 || '');
      const insumoMaster = insumos.find((i) => i.id_insumo_43 === maestro.id_insumo_46);
      const lineasInicial: LineaItem[] = [
        {
          id_categoria: insumoMaster?.id_categoria_43 || 0,
          id_insumo: maestro.id_insumo_46,
          descripcion: maestro.insumo_descripcion || '',
                          cantidad: Math.trunc(maestro.cantidad_46),
          precio: insumoMaster?.precio_insumo_43 || 0,
          total: insumoMaster ? maestro.cantidad_46 * insumoMaster.precio_insumo_43 : 0,
          isMaster: true
        }
      ];
      for (const d of detalles) {
        const insumoDet = insumos.find((i) => i.id_insumo_43 === d.id_insumo_47);
        lineasInicial.push({
          id_categoria: insumoDet?.id_categoria_43 || 0,
          id_insumo: d.id_insumo_47,
          descripcion: d.insumo_descripcion || '',
          cantidad: Math.trunc(d.cantidad_47),
          precio: d.precio_insumo || 0,
          total: d.total_47,
          observacion: d.observacion_47
        });
      }
      setLineas(lineasInicial);
      setEditingId(id);
      setShowForm(true);
    } catch {
      await showError('Error', 'Error al cargar consumo');
    }
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📦 Consumo de Insumos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => { setSelectedConsumoId(null); setDetalleConsumo(null); resetForm(); setShowForm(true); setEditingId(null); }}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
            type="button"
          >
            💾 Guardar
          </button>
          {consumoIdForActa && (
            <>
              <button
                className="btn-primary"
                onClick={() => openPreviewModal(consumoIdForActa)}
                style={{ backgroundColor: '#6c757d' }}
                title="Vista previa del Acta de Entrega de Insumos"
                type="button"
              >
                📄 Vista Previa Acta
              </button>
              <button
                className="btn-primary"
                onClick={() => generateActaPdf(consumoIdForActa)}
                style={{ backgroundColor: '#17a2b8' }}
                title="Descargar acta de entrega en PDF"
                type="button"
              >
                📥 Acta PDF
              </button>
            </>
          )}
          <button
            className="btn-primary"
            onClick={handleExport}
            style={{ backgroundColor: '#dc3545' }}
            type="button"
          >
            📊 Exportar Excel
          </button>
          <button className="btn-secondary" onClick={resetForm}>
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Editar Consumo' : '➕ Nuevo Consumo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row consumo-form-row-4">
              <div className="form-group">
                <label htmlFor="buscar-trabajador">Buscar Trabajador Por Apellido</label>
                <input
                  type="text"
                  id="buscar-trabajador"
                  className="form-input"
                  value={buscarApellido}
                  onChange={(e) => setBuscarApellido(e.target.value.toUpperCase())}
                  placeholder="EJ: GONZALEZ O GONZALEZ PEREZ"
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="form-tip" style={{ color: '#6c757d', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                  💡 Tip: Una palabra busca por apellido paterno primero, luego materno (empieza con). Dos palabras: paterno y materno en ese orden.
                </small>
              </div>
              <div className="form-group">
                <label>Seleccionar Trabajador *</label>
                <div
                  className="trabajador-list"
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    padding: '10px'
                  }}
                >
                  {trabajadoresFiltrados.length > 0 ? (
                    trabajadoresFiltrados.map((trab) => (
                      <div
                        key={trab.idtrabajador_06}
                        role="button"
                        tabIndex={0}
                        onClick={() => setIdTrabajador(String(trab.idtrabajador_06))}
                        onKeyDown={(e) => e.key === 'Enter' && setIdTrabajador(String(trab.idtrabajador_06))}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: idTrabajador === String(trab.idtrabajador_06) ? '#007bff' : 'transparent',
                          color: idTrabajador === String(trab.idtrabajador_06) ? 'white' : 'inherit',
                          marginBottom: '5px',
                          borderRadius: '4px',
                          border: idTrabajador === String(trab.idtrabajador_06) ? '2px solid #0056b3' : '1px solid #ced4da'
                        }}
                      >
                        <strong>{trab.apaterno_06 || ''} {trab.amaterno_06 || ''}</strong> {trab.nombre_06 || ''} -{' '}
                        <span style={{ fontSize: '0.9em', opacity: 0.8 }}>{trab.ruttrabajador_06 || ''}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#6c757d', padding: '10px' }}>
                      {trabajadores.length === 0 ? 'Cargando trabajadores...' : 'No se encontraron trabajadores con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="buscar-ccosto">Buscar Centro de Costo</label>
                <input
                  type="text"
                  id="buscar-ccosto"
                  className="form-input"
                  value={buscarCcosto}
                  onChange={(e) => setBuscarCcosto(e.target.value.toUpperCase())}
                  placeholder="EJ: ADMINISTRACION, BODEGA..."
                  style={{ textTransform: 'uppercase' }}
                  aria-label="Buscar centro de costo por nombre"
                />
                <small className="form-tip">
                  💡 Tip: Escriba parte del nombre del centro de costo para filtrar la lista.
                </small>
              </div>
              <div className="form-group">
                <label>Seleccionar Centro de Costo *</label>
                <div
                  className="trabajador-list ccosto-list"
                  role="listbox"
                  aria-label="Lista de centros de costo"
                >
                  {ccostosFiltrados.length > 0 ? (
                    ccostosFiltrados.map((cc) => (
                      <div
                        key={cc.id_ccosto_45}
                        role="option"
                        tabIndex={0}
                        aria-selected={idCcosto === String(cc.id_ccosto_45)}
                        onClick={() => setIdCcosto(String(cc.id_ccosto_45))}
                        onKeyDown={(e) => e.key === 'Enter' && setIdCcosto(String(cc.id_ccosto_45))}
                        className={`ccosto-list-item ${idCcosto === String(cc.id_ccosto_45) ? 'selected' : ''}`}
                      >
                        {cc.ccosto_45}
                      </div>
                    ))
                  ) : (
                    <div className="ccosto-list-empty">
                      {ccostos.length === 0 ? 'Cargando centros de costo...' : 'No se encontraron centros de costo con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="form-row consumo-form-row-fecha">
              <div className="form-group">
                <label htmlFor="responsable">Responsable Entrega *</label>
                <select
                  id="responsable"
                  className="form-input"
                  value={idResponsable}
                  onChange={(e) => setIdResponsable(e.target.value)}
                  required
                >
                  <option value="">Seleccione...</option>
                  {responsables.map((r) => (
                    <option key={r.idresponsableentrega_08} value={String(r.idresponsableentrega_08)}>
                      {getResponsableNombre(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="fecha">Fecha *</label>
                <input
                  type="date"
                  id="fecha"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="hora">Hora *</label>
                <input
                  type="time"
                  id="hora"
                  className="form-input"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                />
              </div>
              <div className="form-group form-group-flex">
                <label htmlFor="observacion">Observación</label>
                <input
                  type="text"
                  id="observacion"
                  className="form-input"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="detalle-section">
              <div className="detalle-header">
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Insumos Asignados</label>
                <button type="button" className="btn-add-line" onClick={addLinea}>
                  ➕ Agregar línea
                </button>
              </div>
              <div className="table-container detalle-insumos-grid">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Categoría *</th>
                      <th>Insumo *</th>
                      <th>Cantidad *</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                      <th>Obs.</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: '#999' }}>
                          No hay insumos asignados. Use "Agregar línea" para comenzar.
                        </td>
                      </tr>
                    ) : (
                      lineas.map((linea, idx) => {
                        const insumosFiltrados = linea.id_categoria
                          ? insumos.filter((i) => i.id_categoria_43 === linea.id_categoria)
                          : [];
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-input form-input-sm"
                                value={linea.id_categoria || ''}
                                onChange={(e) => updateLinea(idx, 'id_categoria', parseInt(e.target.value, 10) || 0)}
                                required={idx === 0}
                                aria-label="Seleccionar categoría"
                              >
                                <option value="">Seleccione...</option>
                                {categorias.map((c) => (
                                  <option key={c.id_categoria_42} value={c.id_categoria_42}>
                                    {c.categoria_42}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-input form-input-sm"
                                value={linea.id_insumo || ''}
                                onChange={(e) => updateLinea(idx, 'id_insumo', parseInt(e.target.value, 10) || 0)}
                                required={idx === 0}
                                disabled={!linea.id_categoria}
                                aria-label="Seleccionar insumo"
                              >
                                <option value="">Seleccione...</option>
                                {insumosFiltrados.map((i) => (
                                  <option key={i.id_insumo_43} value={i.id_insumo_43}>
                                    {i.descripcion_43} - ${formatAmount(i.precio_insumo_43)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-input form-input-sm input-cantidad-centrado"
                                value={linea.cantidad || ''}
                                onChange={(e) => updateLinea(idx, 'cantidad', parseCantidadEntera(e.target.value))}
                                min="1"
                                step="1"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required={idx === 0}
                                style={{ width: '80px', padding: '6px 8px', textAlign: 'center' }}
                                aria-label="Cantidad entera"
                              />
                            </td>
                            <td className="td-precio">${formatAmount(linea.precio)}</td>
                            <td className="td-total">${formatAmount(linea.total)}</td>
                            <td>
                              <input
                                type="text"
                                className="form-input form-input-sm"
                                value={linea.observacion || ''}
                                onChange={(e) => updateLinea(idx, 'observacion', e.target.value)}
                                placeholder="-"
                                aria-label="Observación"
                              />
                            </td>
                            <td className="actions">
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() => removeLinea(idx)}
                                disabled={lineas.length <= 1}
                                title="Quitar línea"
                                aria-label="Eliminar línea"
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

            <div
              className="form-actions"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '20px'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {editingId ? (
                  <>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openPreviewModal(editingId)}
                      style={{ backgroundColor: '#6c757d' }}
                    >
                      📄 Vista Previa Acta
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => generateActaPdf(editingId)}
                      style={{ backgroundColor: '#28a745' }}
                    >
                      📥 Generar PDF Acta
                    </button>
                  </>
                ) : (
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                    💡 Guarde el consumo para generar el acta de entrega (igual que en asignación de uniformes).
                  </span>
                )}
              </div>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador y tabla */}
      {!showForm && (
        <div className="form-container" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              📅{' '}
              {filtroFechaDesde || filtroFechaHasta
                ? `Período: ${filtroFechaDesde || '…'} — ${filtroFechaHasta || '…'}`
                : 'Todos los períodos'}
              {' '}(Total: {processedConsumos.length})
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 240px)',
              gap: '10px'
            }}
          >
            <input
              type="text"
              placeholder="🔍 Buscar consumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px',
                textTransform: 'uppercase'
              }}
              aria-label="Buscar consumo"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                aria-label="Filtrar desde fecha"
                title="Desde fecha"
              />
              <input
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                aria-label="Filtrar hasta fecha"
                title="Hasta fecha"
              />
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortConfig?.key === 'id_m_consumo_insumo_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('id_m_consumo_insumo_46')}
                  >
                    ID
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'fecha_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('fecha_46')}
                  >
                    FECHA
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'hora_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('hora_46')}
                  >
                    HORA
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'trabajador_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('trabajador_nombre' as keyof MaestroConsumo)}
                  >
                    TRABAJADOR
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'responsable_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('responsable_nombre' as keyof MaestroConsumo)}
                  >
                    RESPONSABLE
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'ccosto_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('ccosto_nombre' as keyof MaestroConsumo)}
                  >
                    C. COSTO
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'insumo_descripcion' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('insumo_descripcion' as keyof MaestroConsumo)}
                  >
                    INSUMO
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'cantidad_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('cantidad_46')}
                  >
                    CANT.
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron consumos con "${searchTerm}"`
                        : '📋 No hay consumos registrados'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((c) => {
                    const isSelected = selectedConsumoId === c.id_m_consumo_insumo_46;
                    return (
                      <tr
                        key={c.id_m_consumo_insumo_46}
                        className={`fade-in consumo-maestro-row ${isSelected ? 'consumo-row-selected' : ''}`}
                        onClick={() => handleSelectConsumo(c.id_m_consumo_insumo_46)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectConsumo(c.id_m_consumo_insumo_46)}
                        aria-label={`Ver detalle del consumo ${c.id_m_consumo_insumo_46}`}
                      >
                        <td>{c.id_m_consumo_insumo_46}</td>
                        <td>{c.fecha_46 ? c.fecha_46.split('T')[0] : '-'}</td>
                        <td>{c.hora_46.slice(0, 5)}</td>
                        <td>{c.trabajador_nombre || '-'}</td>
                        <td>{c.responsable_nombre || '-'}</td>
                        <td>{c.ccosto_nombre || '-'}</td>
                        <td>{c.insumo_descripcion || '-'}</td>
                        <td className="td-cantidad">{formatCantidad(c.cantidad_46)}</td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreviewModal(c.id_m_consumo_insumo_46);
                            }}
                            title="Acta de entrega - vista previa e impresión"
                            aria-label="Vista previa e impresión del acta de entrega"
                            style={{ marginRight: '5px', padding: '4px 8px', fontSize: '12px' }}
                            type="button"
                          >
                            🖨️
                          </button>
                          <button
                            className="btn-edit"
                            onClick={(e) => { e.stopPropagation(); startEdit(c.id_m_consumo_insumo_46); }}
                            title="Editar"
                            aria-label="Editar consumo"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.id_m_consumo_insumo_46); }}
                            title="Eliminar"
                            aria-label="Eliminar consumo"
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
          {processedConsumos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedConsumos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}

          {/* Grilla de detalle (oculta hasta hacer clic en un registro maestro) */}
          {loadingDetalle && (
            <div className="detalle-loading">⏳ Cargando detalle...</div>
          )}
          {detalleConsumo && !loadingDetalle && (
            <div className="detalle-grid-container">
              <div className="detalle-grid-header">
                <h4>Detalle de Insumos - Consumo #{detalleConsumo.maestro.id_m_consumo_insumo_46}</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openPreviewModal(detalleConsumo.maestro.id_m_consumo_insumo_46)}
                    style={{ backgroundColor: '#6c757d' }}
                  >
                    📄 Vista Previa Acta
                  </button>
                  <button type="button" className="btn-secondary btn-cerrar-detalle" onClick={cerrarDetalle} aria-label="Cerrar detalle">
                    ✕ Cerrar
                  </button>
                </div>
              </div>
              <div className="table-container detalle-insumos-grid">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                      <th>Obs.</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleLineas.map((linea) => {
                      const precio = getPrecioInsumo(linea.id_insumo);
                      const total = linea.cantidad * precio;
                      return (
                        <tr
                          key={linea.key}
                          className={linea.isMaster ? '' : 'consumo-detalle-row'}
                        >
                          <td>
                            {linea.editing ? (
                              <select
                                className="form-input form-input-sm"
                                value={linea.id_insumo || ''}
                                onChange={(e) =>
                                  updateDetalleLineaField(linea.key, 'id_insumo', parseInt(e.target.value, 10) || 0)
                                }
                                aria-label="Seleccionar insumo"
                              >
                                <option value="">Seleccione...</option>
                                {insumos.map((i) => (
                                  <option key={i.id_insumo_43} value={i.id_insumo_43}>
                                    {i.descripcion_43}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getInsumoDescripcion(linea.id_insumo)
                            )}
                          </td>
                          <td className="td-cantidad">
                            {linea.editing ? (
                              <input
                                type="number"
                                className="form-input form-input-sm input-cantidad-centrado"
                                value={linea.cantidad || ''}
                                min={1}
                                step={1}
                                inputMode="numeric"
                                onChange={(e) =>
                                  updateDetalleLineaField(linea.key, 'cantidad', parseCantidadEntera(e.target.value))
                                }
                                style={{ width: '80px', textAlign: 'center' }}
                                aria-label="Cantidad entera"
                              />
                            ) : (
                              formatCantidad(linea.cantidad)
                            )}
                          </td>
                          <td className="td-precio">${formatAmount(precio)}</td>
                          <td className="td-total">${formatAmount(total)}</td>
                          <td>
                            {linea.editing ? (
                              <input
                                type="text"
                                className="form-input form-input-sm"
                                value={linea.observacion}
                                onChange={(e) => updateDetalleLineaField(linea.key, 'observacion', e.target.value)}
                                placeholder="-"
                                aria-label="Observación"
                              />
                            ) : (
                              linea.observacion || '-'
                            )}
                          </td>
                          <td className="actions">
                            {linea.editing ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => saveDetalleLinea(linea.key)}
                                  disabled={savingDetalle}
                                  title="Grabar"
                                  aria-label="Grabar línea"
                                  style={{ marginRight: '4px', padding: '4px 8px', fontSize: '12px' }}
                                >
                                  💾
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => cancelEditDetalleLinea(linea.key)}
                                  disabled={savingDetalle}
                                  title="Cancelar"
                                  aria-label="Cancelar edición"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn-edit"
                                  onClick={() => startEditDetalleLinea(linea.key)}
                                  disabled={savingDetalle}
                                  title="Editar"
                                  aria-label="Editar línea"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  className="btn-delete"
                                  onClick={() => deleteDetalleLinea(linea.key)}
                                  disabled={savingDetalle}
                                  title="Eliminar"
                                  aria-label="Eliminar línea"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {loading && !showForm && <div className="loading">⏳ Cargando...</div>}

      {showPreviewModal && (
        <div
          className="acta-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="acta-insumos-preview-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => e.target === e.currentTarget && closePreviewModal()}
        >
          <div
            className="acta-preview-modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '816px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="no-print" style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 id="acta-insumos-preview-title" style={{ margin: 0 }}>📄 Vista Previa - Acta de Entrega de Insumos</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={handlePrintActa}
                  disabled={!previewActaData}
                  style={{ backgroundColor: '#007bff' }}
                  type="button"
                >
                  🖨️ Imprimir
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!previewConsumoId) return;
                    generateActaPdf(previewConsumoId);
                  }}
                  disabled={!previewActaData}
                  style={{ backgroundColor: '#28a745' }}
                  type="button"
                >
                  📥 Generar PDF
                </button>
                <button className="btn-secondary" onClick={closePreviewModal} type="button">
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <div className="acta-preview-content" style={{ padding: '24px' }}>
              {loadingActa ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Cargando acta...</div>
              ) : previewActaData ? (
                <div
                  className="acta-print-area"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    color: '#333'
                  }}
                >
                  <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '16px' }}>ACTA DE ENTREGA DE INSUMOS</h2>
                  <p style={{ textAlign: 'right', fontSize: '10px', color: '#666', marginBottom: '12px' }}>SIG F-622-006 Versión 001</p>
                  <p style={{ marginBottom: '12px' }}>
                    En la ciudad de Santiago, {previewActaData.intro.dia} días del mes de {previewActaData.intro.mes} del año {previewActaData.intro.anio}, se procede a dejar constancia de la entrega de insumos al trabajador que a continuación se detalla:
                  </p>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Datos del Trabajador:</p>
                  <p style={{ margin: '4px 0' }}><strong>Nombre:</strong> {previewActaData.trabajador.nombre}</p>
                  <p style={{ margin: '4px 0' }}><strong>Rut:</strong> {previewActaData.trabajador.rut}</p>
                  <p style={{ margin: '4px 0' }}><strong>Cargo:</strong> {previewActaData.trabajador.cargo}</p>
                  <p style={{ margin: '4px 0' }}><strong>Empresa:</strong> {previewActaData.trabajador.empresa}</p>
                  <p style={{ margin: '4px 0 12px 0' }}><strong>C. Costo:</strong> {previewActaData.trabajador.ccosto}</p>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Detalle de insumos entregados</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e8e8e8' }}>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Item</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Cantidad</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Categoría</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Estado</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Estado Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewActaData.insumos.map((insumo, i) => (
                        <tr key={i}>
                          <td style={{ border: '1px solid #ccc', padding: '6px' }}>{insumo.item}</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{insumo.cantidad}</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{insumo.categoria}</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Nuevo</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Entregado</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewActaData.observaciones && (
                    <p style={{ marginBottom: '12px' }}><strong>Observaciones:</strong> {previewActaData.observaciones}</p>
                  )}
                  <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Responsabilidades:</p>
                  <p style={{ marginBottom: '4px' }}>Usted se compromete a</p>
                  <ul style={{ margin: '4px 0 12px 20px', padding: 0 }}>
                    <li>Usar los insumos únicamente durante sus funciones laborales.</li>
                    <li>Mantener los insumos en condiciones adecuadas para su uso.</li>
                    <li>No alterar ni modificar los insumos entregados.</li>
                    <li>Responder por el cuidado y conservación de los insumos entregados.</li>
                    <li>Reportar inmediatamente cualquier daño o pérdida al área correspondiente.</li>
                    <li>El mal uso o la negligencia en el cuidado de los insumos podrá ser objeto de observaciones o medidas disciplinarias conforme al reglamento interno.</li>
                  </ul>
                  <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Uso de Insumos:</p>
                  <p style={{ marginBottom: '8px' }}>La empresa hace hincapié en la obligatoriedad del uso adecuado de los insumos entregados durante todo el periodo de servicio activo. Su uso contribuye a:</p>
                  <ul style={{ margin: '4px 0 12px 20px', padding: 0 }}>
                    <li>Garantizar la continuidad operacional del servicio.</li>
                    <li>Proteger la seguridad del personal y de los usuarios.</li>
                    <li>Optimizar el control y trazabilidad de materiales.</li>
                  </ul>
                  <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Declaración del Trabajador:</p>
                  <p style={{ marginBottom: '12px' }}>Declaro haber recibido a conformidad los insumos antes detallados, los cuales se encuentran en buen estado y son de uso obligatorio durante mi jornada laboral. Asimismo, me comprometo a dar un uso adecuado y a conservarlos en buenas condiciones, haciéndome responsable de su cuidado.</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '50%' }}>Firma</td>
                        <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '50%' }}>Huella</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ccc', height: '50px', verticalAlign: 'top' }}></td>
                        <td style={{ border: '1px solid #ccc', height: '50px', verticalAlign: 'top' }}></td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Firma del encargado de Entrega</p>
                  <p style={{ margin: 0 }}>Nombre: {previewActaData.responsable.nombre}</p>
                  <p style={{ margin: 0 }}>Fecha: {previewActaData.responsable.fecha} {previewActaData.responsable.hora}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .acta-preview-overlay,
          .acta-preview-overlay * { visibility: visible !important; }
          .acta-preview-overlay {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          .acta-preview-modal {
            box-shadow: none !important;
            max-height: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ConsumoInsumoView;
