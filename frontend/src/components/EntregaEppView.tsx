import React, { useEffect, useMemo, useRef, useState } from 'react';
import './BodegaView.css';
import './EntregaEppView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { filtrarTrabajadoresPorApellido } from '../utils/trabajadorSearch';
import { apiFetch, apiUrl, openAuthenticatedBlob } from '../lib/apiClient';

interface ActaEntregaEppData {
  folio?: string;
  intro: { dia: number; mes: string; anio: number };
  empresaLegal: { nombre: string; rut: string };
  clase?: { id: number | null; nombre: string; tipo: 'EPP' | 'ROPA' };
  trabajador: { nombre: string; rut: string; cargo: string };
  elementos: Array<{
    codigo: string;
    elemento: string;
    tipo: string;
    categoria: string;
    cantidad: number;
  }>;
  firmas: {
    trabajadorNombre: string;
    trabajadorRut: string;
    encargadoNombre: string;
    encargadoRut: string;
  };
}

interface MaestroEntregaEpp {
  identregaepp_54: number;
  folio_54?: string | null;
  idtrabajador_54: number;
  idclase_54?: number | null;
  idccosto_54?: number | null;
  idempresa_54: number;
  idcargo_54: number;
  idresponsableentrega_54?: number | null;
  fecha_entrega_54: string;
  hora_entrega_54?: string;
  lugar_entrega_54?: string | null;
  motivo_entrega_54: string;
  observaciones_54?: string | null;
  estado_54: string;
  trabajador_nombre?: string;
  empresa_nombre?: string;
  cargo_nombre?: string;
  ccosto_nombre?: string;
  clase_nombre?: string;
  responsable_nombre?: string;
}

interface ElementoEpp {
  idelemento_53: number;
  codigo_53: string;
  nombre_53: string;
  stock_actual_53: number;
  valor_unitario_53?: number | null;
  activo_53: boolean;
  idmarca_53?: number | null;
  idclase_51?: number | null;
  clase_nombre?: string;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06?: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
  idempresa_06?: number | null;
  idcargo_06?: number | null;
}

interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

interface Cargo {
  idcargo_14: number;
  cargo_14: string;
}

interface Ccosto {
  id_ccosto_45: number;
  ccosto_45: string;
}

interface ClaseElemento {
  idclase_56: number;
  clase_56: string;
  activo_56?: boolean;
}

interface Responsable {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
}

interface Talla {
  id_16: number;
  talla_16: string;
}

interface MarcaInsumo {
  id_marca_insumo_37: number;
  marca_insumo_37: string;
}

interface DetalleLinea {
  idelemento_55: number;
  idtalla_55: string;
  idmarca_55: string;
  cantidad_55: number;
  estadoentrega_55: string;
  observacion_55: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const MOTIVOS = [
  'DOTACION INICIAL',
  'REPOSICION',
  'RENUEVO',
  'PRIMERA VEZ',
  'CAMBIO DE CARGO',
] as const;

const ESTADOS_DETALLE = ['NUEVO/A', 'BUENO/A', 'USADO/A', 'DAÑADO/A'] as const;

const API_URL = apiUrl('/epp-entregas');
const ELEMENTOS_URL = apiUrl('/epp-elementos');
const TRABAJADORES_URL = apiUrl('/trabajadores');
const EMPRESAS_URL = apiUrl('/empresas');
const CARGOS_URL = apiUrl('/cargos');
const CCOSTOS_URL = apiUrl('/ccostos');
const CLASES_URL = apiUrl('/epp-clases');
const RESPONSABLES_URL = apiUrl('/responsables-entrega');
const TALLAS_URL = apiUrl('/tallas');
const MARCAS_URL = apiUrl('/marcas-insumo');

const EntregaEppView: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<MaestroEntregaEpp[]>([]);
  const [elementos, setElementos] = useState<ElementoEpp[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [ccostos, setCcostos] = useState<Ccosto[]>([]);
  const [clases, setClases] = useState<ClaseElemento[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [marcas, setMarcas] = useState<MarcaInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTrabajadorId, setFiltroTrabajadorId] = useState('');
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MaestroEntregaEpp;
    direction: 'asc' | 'desc';
  }>({ key: 'identregaepp_54', direction: 'desc' });

  const [idTrabajador, setIdTrabajador] = useState('');
  const [buscarTrabajador, setBuscarTrabajador] = useState('');
  const [idEmpresa, setIdEmpresa] = useState('');
  const [idCargo, setIdCargo] = useState('');
  const [idCcosto, setIdCcosto] = useState('');
  const [idClase, setIdClase] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [lugar, setLugar] = useState('');
  const [motivo, setMotivo] = useState<string>('DOTACION INICIAL');
  const [observaciones, setObservaciones] = useState('');
  const [detalles, setDetalles] = useState<DetalleLinea[]>([]);

  const [elementoSel, setElementoSel] = useState('');
  const [tallaSel, setTallaSel] = useState('');
  const [marcaSel, setMarcaSel] = useState('');
  const [cantidadSel, setCantidadSel] = useState('1');
  const [estadoSel, setEstadoSel] = useState('BUENO/A');

  const [showActa, setShowActa] = useState(false);
  const [loadingActa, setLoadingActa] = useState(false);
  const [previewActa, setPreviewActa] = useState<ActaEntregaEppData | null>(null);
  const [previewActaId, setPreviewActaId] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [e, el, t, emp, car, cc, cl, r, ta, m] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(ELEMENTOS_URL),
        apiFetch(TRABAJADORES_URL),
        apiFetch(EMPRESAS_URL),
        apiFetch(CARGOS_URL),
        apiFetch(CCOSTOS_URL),
        apiFetch(CLASES_URL),
        apiFetch(RESPONSABLES_URL),
        apiFetch(TALLAS_URL),
        apiFetch(MARCAS_URL),
      ]);
      const eData: ApiResponse<MaestroEntregaEpp[]> = await e.json();
      const elData: ApiResponse<ElementoEpp[]> = await el.json();
      const tData: ApiResponse<Trabajador[]> = await t.json();
      const empData: ApiResponse<Empresa[]> = await emp.json();
      const carData: ApiResponse<Cargo[]> = await car.json();
      const ccData: ApiResponse<Ccosto[]> = await cc.json();
      const clData: ApiResponse<ClaseElemento[]> = await cl.json();
      const rData: ApiResponse<Responsable[]> = await r.json();
      const taData: ApiResponse<Talla[]> = await ta.json();
      const mData: ApiResponse<MarcaInsumo[]> = await m.json();

      if (eData.success && Array.isArray(eData.data)) setRegistros(eData.data);
      else setError(eData.error || 'Error al cargar entregas EPP');
      if (elData.success && Array.isArray(elData.data)) setElementos(elData.data);
      if (tData.success && Array.isArray(tData.data)) setTrabajadores(tData.data);
      if (empData.success && Array.isArray(empData.data)) setEmpresas(empData.data);
      if (carData.success && Array.isArray(carData.data)) setCargos(carData.data);
      if (ccData.success && Array.isArray(ccData.data)) setCcostos(ccData.data);
      if (clData.success && Array.isArray(clData.data)) setClases(clData.data);
      if (rData.success && Array.isArray(rData.data)) setResponsables(rData.data);
      if (taData.success && Array.isArray(taData.data)) setTallas(taData.data);
      if (mData.success && Array.isArray(mData.data)) setMarcas(mData.data);
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

  const ccostoOptions = useMemo(
    () =>
      [...ccostos]
        .sort((a, b) => a.ccosto_45.localeCompare(b.ccosto_45, 'es', { sensitivity: 'base' }))
        .map((c) => ({
          value: String(c.id_ccosto_45),
          label: c.ccosto_45,
        })),
    [ccostos]
  );

  const marcaOptions = useMemo(
    () =>
      [...marcas]
        .sort((a, b) =>
          a.marca_insumo_37.localeCompare(b.marca_insumo_37, 'es', { sensitivity: 'base' })
        )
        .map((m) => ({
          value: String(m.id_marca_insumo_37),
          label: m.marca_insumo_37,
        })),
    [marcas]
  );

  const claseOptions = useMemo(
    () =>
      [...clases]
        .filter((c) => c.activo_56 !== false)
        .sort((a, b) => a.clase_56.localeCompare(b.clase_56, 'es', { sensitivity: 'base' }))
        .map((c) => ({
          value: String(c.idclase_56),
          label: c.clase_56,
        })),
    [clases]
  );

  const elementosDisponibles = useMemo(
    () =>
      elementos.filter(
        (el) =>
          el.activo_53 &&
          Number(el.stock_actual_53) > 0 &&
          !detalles.some((d) => d.idelemento_55 === el.idelemento_53) &&
          Boolean(idClase) &&
          String(el.idclase_51 ?? '') === idClase
      ),
    [elementos, detalles, idClase]
  );

  const elementoOptions = useMemo(
    () =>
      [...elementosDisponibles]
        .sort((a, b) =>
          `${a.codigo_53} ${a.nombre_53}`.localeCompare(
            `${b.codigo_53} ${b.nombre_53}`,
            'es',
            { sensitivity: 'base' }
          )
        )
        .map((el) => ({
          value: String(el.idelemento_53),
          label: `${el.codigo_53} — ${el.nombre_53} (stock: ${el.stock_actual_53})`,
        })),
    [elementosDisponibles]
  );

  const trabajadorFiltroOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of registros) {
      if (m.idtrabajador_54 && m.trabajador_nombre) {
        map.set(String(m.idtrabajador_54), m.trabajador_nombre);
      }
    }
    for (const t of trabajadores) {
      const key = String(t.idtrabajador_06);
      if (!map.has(key)) {
        const label =
          `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06}`.trim() ||
          `Trabajador ${key}`;
        map.set(key, label);
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [registros, trabajadores]);

  const empresaFiltroOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of registros) {
      if (m.idempresa_54 && m.empresa_nombre) {
        map.set(String(m.idempresa_54), m.empresa_nombre);
      }
    }
    // Completa con catálogo de empresas (aunque aún no haya entregas)
    for (const emp of empresas) {
      const key = String(emp.idempresa_15);
      if (!map.has(key)) map.set(key, emp.nombreempresa_15);
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [registros, empresas]);

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = registros.filter((m) => {
      const matchText =
        !q ||
        (m.folio_54 || '').toLowerCase().includes(q) ||
        (m.trabajador_nombre || '').toLowerCase().includes(q) ||
        (m.empresa_nombre || '').toLowerCase().includes(q) ||
        (m.cargo_nombre || '').toLowerCase().includes(q) ||
        (m.motivo_entrega_54 || '').toLowerCase().includes(q) ||
        (m.clase_nombre || '').toLowerCase().includes(q) ||
        (m.estado_54 || '').toLowerCase().includes(q) ||
        (m.observaciones_54 || '').toLowerCase().includes(q);
      const matchEstado = !filtroEstado || m.estado_54 === filtroEstado;
      const fecha = String(m.fecha_entrega_54 || '').slice(0, 10);
      const matchDesde = !filtroFechaDesde || (!!fecha && fecha >= filtroFechaDesde);
      const matchHasta = !filtroFechaHasta || (!!fecha && fecha <= filtroFechaHasta);
      const matchTrabajador =
        !filtroTrabajadorId || String(m.idtrabajador_54) === filtroTrabajadorId;
      const matchEmpresa = !filtroEmpresaId || String(m.idempresa_54) === filtroEmpresaId;
      return (
        matchText &&
        matchEstado &&
        matchDesde &&
        matchHasta &&
        matchTrabajador &&
        matchEmpresa
      );
    });

    list = [...list].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (sortConfig.key === 'fecha_entrega_54') {
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
    filtroEstado,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroTrabajadorId,
    filtroEmpresaId,
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
    filtroEstado,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroTrabajadorId,
    filtroEmpresaId,
  ]);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroTrabajadorId('');
    setFiltroEmpresaId('');
  };

  const hayFiltrosActivos = Boolean(
    searchTerm.trim() ||
      filtroEstado ||
      filtroFechaDesde ||
      filtroFechaHasta ||
      filtroTrabajadorId ||
      filtroEmpresaId
  );

  const handleSort = (key: keyof MaestroEntregaEpp) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof MaestroEntregaEpp) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const formatFecha = (fechaVal: string) => {
    if (!fechaVal) return '-';
    const d = String(fechaVal).slice(0, 10);
    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return fechaVal;
    return `${day}/${m}/${y}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setIdTrabajador('');
    setBuscarTrabajador('');
    setIdEmpresa('');
    setIdCargo('');
    setIdCcosto('');
    setIdClase('');
    setIdResponsable('');
    setFecha(new Date().toISOString().slice(0, 10));
    setLugar('');
    setMotivo('DOTACION INICIAL');
    setObservaciones('');
    setDetalles([]);
    setElementoSel('');
    setTallaSel('');
    setMarcaSel('');
    setCantidadSel('1');
    setEstadoSel('BUENO/A');
    setError('');
  };

  const seleccionarTrabajador = (trab: Trabajador) => {
    setIdTrabajador(String(trab.idtrabajador_06));
    setBuscarTrabajador(
      `${trab.apaterno_06 || ''} ${trab.amaterno_06 || ''} ${trab.nombre_06}`.trim()
    );
    if (trab.idempresa_06 != null) setIdEmpresa(String(trab.idempresa_06));
    if (trab.idcargo_06 != null) setIdCargo(String(trab.idcargo_06));
  };

  const addDetalle = () => {
    if (!idClase) {
      showError('Validación', 'Seleccione primero la clase (EPP o Ropa de Trabajo)');
      return;
    }
    const idEl = Number(elementoSel);
    const cant = Number(cantidadSel);
    if (!idEl || !cant || cant < 1) {
      showError('Validación', 'Seleccione elemento y cantidad válida');
      return;
    }
    const el = elementos.find((x) => x.idelemento_53 === idEl);
    if (!el) {
      showError('Validación', 'Elemento no encontrado');
      return;
    }
    if (String(el.idclase_51 ?? '') !== idClase) {
      showError('Validación', 'El elemento no pertenece a la clase seleccionada');
      return;
    }
    if (Number(el.stock_actual_53) < cant) {
      showError(
        'Sin stock',
        `${el.codigo_53} no tiene stock suficiente (disponible: ${el.stock_actual_53})`
      );
      return;
    }
    if (detalles.some((d) => d.idelemento_55 === idEl)) {
      showError('Validación', 'El elemento ya está en el detalle');
      return;
    }

    setDetalles((prev) => [
      ...prev,
      {
        idelemento_55: idEl,
        idtalla_55: tallaSel,
        idmarca_55: marcaSel || (el.idmarca_53 ? String(el.idmarca_53) : ''),
        cantidad_55: cant,
        estadoentrega_55: estadoSel,
        observacion_55: '',
      },
    ]);
    setElementoSel('');
    setTallaSel('');
    setMarcaSel('');
    setCantidadSel('1');
    setEstadoSel('BUENO/A');
  };

  const removeDetalle = (idelemento: number) => {
    setDetalles((prev) => prev.filter((d) => d.idelemento_55 !== idelemento));
  };

  const startEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{
        maestro: MaestroEntregaEpp;
        detalles: Array<DetalleLinea & { observacion_55?: string | null; idtalla_55?: number | null; idmarca_55?: number | null }>;
      }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar la entrega');
        return;
      }
      const { maestro, detalles: dets } = data.data;
      if (maestro.estado_54 === 'ANULADO') {
        await showError('Validación', 'No se puede editar una entrega anulada');
        return;
      }
      setEditingId(id);
      setIdTrabajador(String(maestro.idtrabajador_54));
      setBuscarTrabajador(maestro.trabajador_nombre || '');
      setIdEmpresa(String(maestro.idempresa_54));
      setIdCargo(String(maestro.idcargo_54));
      setIdCcosto(maestro.idccosto_54 ? String(maestro.idccosto_54) : '');
      setIdClase(maestro.idclase_54 ? String(maestro.idclase_54) : '');
      setIdResponsable(
        maestro.idresponsableentrega_54 ? String(maestro.idresponsableentrega_54) : ''
      );
      setFecha(String(maestro.fecha_entrega_54).slice(0, 10));
      setLugar(maestro.lugar_entrega_54 || '');
      setMotivo(maestro.motivo_entrega_54 || 'DOTACION INICIAL');
      setObservaciones(maestro.observaciones_54 || '');
      setDetalles(
        (dets || []).map((d) => ({
          idelemento_55: d.idelemento_55,
          idtalla_55: d.idtalla_55 ? String(d.idtalla_55) : '',
          idmarca_55: d.idmarca_55 ? String(d.idmarca_55) : '',
          cantidad_55: d.cantidad_55,
          estadoentrega_55: d.estadoentrega_55 || 'BUENO/A',
          observacion_55: d.observacion_55 || '',
        }))
      );
      setShowForm(true);
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idTrabajador) {
      await showError('Validación', 'Seleccione un trabajador');
      return;
    }
    if (!idEmpresa) {
      await showError('Validación', 'Seleccione una empresa');
      return;
    }
    if (!idCargo) {
      await showError('Validación', 'Seleccione un cargo');
      return;
    }
    if (!idClase) {
      await showError('Validación', 'Seleccione la clase en el detalle (EPP o Ropa de Trabajo)');
      return;
    }
    if (!fecha) {
      await showError('Validación', 'Indique la fecha de entrega');
      return;
    }
    if (!detalles.length) {
      await showError('Validación', 'Agregue al menos un elemento');
      return;
    }

    for (const d of detalles) {
      const el = elementos.find((x) => x.idelemento_53 === d.idelemento_55);
      if (!el) {
        await showError('Validación', `Elemento ${d.idelemento_55} no encontrado`);
        return;
      }
      // En edición el stock ya descontó la entrega actual; el backend restaura al reemplazar
      if (!editingId && Number(el.stock_actual_53) < d.cantidad_55) {
        await showError(
          'Sin stock',
          `${el.codigo_53} sin stock suficiente (disponible: ${el.stock_actual_53})`
        );
        return;
      }
    }

    const payload = {
      idtrabajador_54: Number(idTrabajador),
      idempresa_54: Number(idEmpresa),
      idcargo_54: Number(idCargo),
      idclase_54: Number(idClase),
      idccosto_54: idCcosto ? Number(idCcosto) : null,
      idresponsableentrega_54: idResponsable ? Number(idResponsable) : null,
      fecha_entrega_54: fecha,
      lugar_entrega_54: lugar.trim().toUpperCase() || null,
      motivo_entrega_54: motivo,
      observaciones_54: observaciones.trim() || null,
      estado_54: 'ENTREGADO',
      detalles: detalles.map((d) => ({
        idelemento_55: d.idelemento_55,
        idtalla_55: d.idtalla_55 ? Number(d.idtalla_55) : null,
        idmarca_55: d.idmarca_55 ? Number(d.idmarca_55) : null,
        cantidad_55: d.cantidad_55,
        estadoentrega_55: d.estadoentrega_55,
        observacion_55: d.observacion_55.trim() || null,
      })),
    };

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
        await showSuccess(editingId ? 'Actualizada' : 'Creada', data.message || 'OK');
      } else {
        await showError('Error', data.error || data.message || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleAnular = async (id: number) => {
    const ok = await showDeleteConfirm('esta entrega EPP (se anulará y se restaurará el stock)');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Anulada', data.message || 'Entrega anulada');
      } else {
        await showError('Error', data.error || 'No se pudo anular');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const openActa = async (id: number) => {
    try {
      setShowActa(true);
      setLoadingActa(true);
      setPreviewActa(null);
      setPreviewActaId(id);
      const res = await apiFetch(`${API_URL}/${id}/acta-datos`);
      const data: ApiResponse<ActaEntregaEppData> = await res.json();
      if (!data.success || !data.data) {
        setShowActa(false);
        await showError('Error', data.error || 'No se pudieron cargar los datos del acta');
        return;
      }
      setPreviewActa(data.data);
    } catch {
      setShowActa(false);
      await showError('Error', 'Error de conexión al cargar el acta');
    } finally {
      setLoadingActa(false);
    }
  };

  const closeActa = () => {
    setShowActa(false);
    setPreviewActa(null);
    setPreviewActaId(null);
  };

  const getElemento = (id: number) => elementos.find((x) => x.idelemento_53 === id);

  const nombreResponsable = (r: Responsable) =>
    `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''} ${r.amaternoresponsableentrega_08 || ''}`.trim();

  if (loading) return <div className="loading">Cargando entregas...</div>;

  return (
    <div className="bodega-view entrega-epp-view">
      <div className="view-header">
        <h2>Entregas de EPP o Ropa de Trabajo</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + Nuevo
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
          </button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container epp-form">
          <h3>{editingId ? `Editar entrega #${editingId}` : 'Nueva entrega de EPP o Ropa de Trabajo'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="epp-cabecera">
              <div className="form-group">
                <label htmlFor="fecha_entrega">Fecha *</label>
                <input
                  id="fecha_entrega"
                  type="date"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="motivo">Motivo *</label>
                <select
                  id="motivo"
                  className="form-input"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                >
                  {MOTIVOS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lugar">Lugar de entrega</label>
                <input
                  id="lugar"
                  className="form-input"
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value.toUpperCase())}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="buscar-trab">Trabajador *</label>
                <input
                  id="buscar-trab"
                  className="form-input"
                  value={buscarTrabajador}
                  onChange={(e) => setBuscarTrabajador(e.target.value)}
                  placeholder="Buscar por apellido..."
                  aria-label="Buscar trabajador por apellido"
                />
                <div className="epp-trabajador-list" role="listbox" aria-label="Resultados de trabajadores">
                  {trabajadoresFiltrados.map((trab) => (
                    <button
                      key={trab.idtrabajador_06}
                      type="button"
                      className={`epp-trabajador-item ${idTrabajador === String(trab.idtrabajador_06) ? 'selected' : ''}`}
                      onClick={() => seleccionarTrabajador(trab)}
                    >
                      <span>
                        {trab.apaterno_06 || ''} {trab.amaterno_06 || ''} {trab.nombre_06}
                      </span>
                      <small>{trab.ruttrabajador_06 || ''}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="empresa">Empresa *</label>
                <select
                  id="empresa"
                  className="form-input"
                  value={idEmpresa}
                  onChange={(e) => setIdEmpresa(e.target.value)}
                  required
                >
                  <option value="">Seleccione...</option>
                  {empresas.map((emp) => (
                    <option key={emp.idempresa_15} value={emp.idempresa_15}>
                      {emp.nombreempresa_15}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cargo">Cargo *</label>
                <select
                  id="cargo"
                  className="form-input"
                  value={idCargo}
                  onChange={(e) => setIdCargo(e.target.value)}
                  required
                >
                  <option value="">Seleccione...</option>
                  {cargos.map((c) => (
                    <option key={c.idcargo_14} value={c.idcargo_14}>
                      {c.cargo_14}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ccosto">Centro de costo</label>
                <SearchableSelect
                  id="ccosto"
                  value={idCcosto}
                  onChange={setIdCcosto}
                  options={ccostoOptions}
                  placeholder="Buscar centro de costo..."
                  aria-label="Buscar o seleccionar centro de costo"
                  emptyMessage="No se encontraron centros de costo"
                />
              </div>

              <div className="form-group">
                <label htmlFor="responsable">Responsable entrega</label>
                <select
                  id="responsable"
                  className="form-input"
                  value={idResponsable}
                  onChange={(e) => setIdResponsable(e.target.value)}
                >
                  <option value="">Opcional...</option>
                  {responsables.map((r) => (
                    <option key={r.idresponsableentrega_08} value={r.idresponsableentrega_08}>
                      {nombreResponsable(r)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="observaciones">Observaciones</label>
                <textarea
                  id="observaciones"
                  className="form-input"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="epp-detalle-box">
              <div className="epp-detalle-header">
                <h4>Detalle de elementos</h4>
                <span>{detalles.length} línea(s)</span>
              </div>

              <div className="epp-detalle-add">
                <div className="form-group">
                  <label htmlFor="clase_detalle">Clase *</label>
                  <SearchableSelect
                    id="clase_detalle"
                    value={idClase}
                    onChange={(value) => {
                      if (value !== idClase) {
                        setDetalles([]);
                        setElementoSel('');
                        setMarcaSel('');
                      }
                      setIdClase(value);
                    }}
                    options={claseOptions}
                    placeholder="EPP / Ropa de Trabajo..."
                    required
                    aria-label="Seleccionar clase para filtrar elementos"
                    emptyMessage="No se encontraron clases"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="elemento-sel">Elemento</label>
                  <SearchableSelect
                    id="elemento-sel"
                    value={elementoSel}
                    onChange={(id) => {
                      setElementoSel(id);
                      const el = elementos.find((x) => String(x.idelemento_53) === id);
                      if (el?.idmarca_53) setMarcaSel(String(el.idmarca_53));
                      else if (!id) setMarcaSel('');
                    }}
                    options={elementoOptions}
                    placeholder={
                      idClase
                        ? 'Buscar elemento (código o nombre)...'
                        : 'Primero seleccione la clase'
                    }
                    disabled={!idClase}
                    aria-label="Buscar o seleccionar elemento"
                    emptyMessage={
                      idClase
                        ? 'No hay elementos con stock para esta clase'
                        : 'Seleccione una clase'
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="talla-sel">Talla</label>
                  <select
                    id="talla-sel"
                    className="form-input"
                    value={tallaSel}
                    onChange={(e) => setTallaSel(e.target.value)}
                    disabled={!idClase}
                  >
                    <option value="">Opcional...</option>
                    {tallas.map((t) => (
                      <option key={t.id_16} value={t.id_16}>{t.talla_16}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="marca-sel">Marca</label>
                  <SearchableSelect
                    id="marca-sel"
                    value={marcaSel}
                    onChange={setMarcaSel}
                    options={marcaOptions}
                    placeholder="Buscar marca..."
                    disabled={!idClase}
                    aria-label="Buscar o seleccionar marca"
                    emptyMessage="No se encontraron marcas"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cantidad-sel">Cantidad</label>
                  <input
                    id="cantidad-sel"
                    type="number"
                    min="1"
                    className="form-input"
                    value={cantidadSel}
                    onChange={(e) => setCantidadSel(e.target.value)}
                    disabled={!idClase}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="estado-sel">Estado</label>
                  <select
                    id="estado-sel"
                    className="form-input"
                    value={estadoSel}
                    onChange={(e) => setEstadoSel(e.target.value)}
                    disabled={!idClase}
                  >
                    {ESTADOS_DETALLE.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn-primary" onClick={addDetalle} disabled={!idClase}>
                  Agregar
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Elemento</th>
                      <th>Talla</th>
                      <th>Marca</th>
                      <th>Cant.</th>
                      <th>Estado</th>
                      <th>Obs.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="epp-empty">Sin líneas de detalle</td>
                      </tr>
                    ) : (
                      detalles.map((d) => {
                        const el = getElemento(d.idelemento_55);
                        const talla = tallas.find((t) => String(t.id_16) === d.idtalla_55);
                        const marca = marcas.find((m) => String(m.id_marca_insumo_37) === d.idmarca_55);
                        return (
                          <tr key={d.idelemento_55}>
                            <td>{el?.codigo_53 || d.idelemento_55}</td>
                            <td>{el?.nombre_53 || '-'}</td>
                            <td>{talla?.talla_16 || '-'}</td>
                            <td>{marca?.marca_insumo_37 || '-'}</td>
                            <td>{d.cantidad_55}</td>
                            <td>
                              <select
                                className="form-input"
                                value={d.estadoentrega_55}
                                onChange={(e) =>
                                  setDetalles((prev) =>
                                    prev.map((x) =>
                                      x.idelemento_55 === d.idelemento_55
                                        ? { ...x, estadoentrega_55: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                aria-label="Estado de entrega del detalle"
                              >
                                {ESTADOS_DETALLE.map((est) => (
                                  <option key={est} value={est}>{est}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                className="form-input"
                                value={d.observacion_55}
                                onChange={(e) =>
                                  setDetalles((prev) =>
                                    prev.map((x) =>
                                      x.idelemento_55 === d.idelemento_55
                                        ? { ...x, observacion_55: e.target.value.toUpperCase() }
                                        : x
                                    )
                                  )
                                }
                                aria-label="Observación del detalle"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() => removeDetalle(d.idelemento_55)}
                                aria-label="Quitar línea"
                              >
                                ✕
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

            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="epp-toolbar">
        <p className="epp-total">
          Total: <strong>{filteredAndSorted.length}</strong> entregas
        </p>
        <div className="epp-filters">
          <input
            type="search"
            className="form-input epp-search"
            placeholder="🔍 BUSCAR ENTREGA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            aria-label="Buscar entregas EPP"
          />
          <label className="epp-filter-date" htmlFor="filtro-fecha-desde">
            <span>Desde</span>
            <input
              id="filtro-fecha-desde"
              type="date"
              className="form-input"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              aria-label="Filtrar desde fecha"
            />
          </label>
          <label className="epp-filter-date" htmlFor="filtro-fecha-hasta">
            <span>Hasta</span>
            <input
              id="filtro-fecha-hasta"
              type="date"
              className="form-input"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              aria-label="Filtrar hasta fecha"
            />
          </label>
          <div className="epp-filter-select">
            <SearchableSelect
              id="filtro-trabajador"
              value={filtroTrabajadorId}
              onChange={setFiltroTrabajadorId}
              options={trabajadorFiltroOptions}
              placeholder="Filtrar trabajador..."
              uppercase={false}
              aria-label="Filtrar por trabajador"
              emptyMessage="Sin trabajadores en entregas"
            />
          </div>
          <div className="epp-filter-select">
            <SearchableSelect
              id="filtro-empresa"
              value={filtroEmpresaId}
              onChange={setFiltroEmpresaId}
              options={empresaFiltroOptions}
              placeholder="Filtrar empresa..."
              uppercase={false}
              aria-label="Filtrar por empresa"
              emptyMessage="Sin empresas"
            />
          </div>
          <select
            className="form-input epp-filter-estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="ENTREGADO">ENTREGADO</option>
            <option value="ANULADO">ANULADO</option>
            <option value="PENDIENTE_FIRMA">PENDIENTE_FIRMA</option>
          </select>
          {hayFiltrosActivos && (
            <button
              type="button"
              className="btn-secondary epp-clear-filters"
              onClick={limpiarFiltros}
              aria-label="Limpiar todos los filtros"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className={sortClass('folio_54')} onClick={() => handleSort('folio_54')}>Folio</th>
              <th className={sortClass('clase_nombre')} onClick={() => handleSort('clase_nombre')}>Clase</th>
              <th className={sortClass('fecha_entrega_54')} onClick={() => handleSort('fecha_entrega_54')}>Fecha</th>
              <th className={sortClass('trabajador_nombre')} onClick={() => handleSort('trabajador_nombre')}>Trabajador</th>
              <th className={sortClass('empresa_nombre')} onClick={() => handleSort('empresa_nombre')}>Empresa</th>
              <th className={sortClass('cargo_nombre')} onClick={() => handleSort('cargo_nombre')}>Cargo</th>
              <th className={sortClass('motivo_entrega_54')} onClick={() => handleSort('motivo_entrega_54')}>Motivo</th>
              <th className={sortClass('estado_54')} onClick={() => handleSort('estado_54')}>Estado</th>
              <th className={sortClass('observaciones_54')} onClick={() => handleSort('observaciones_54')}>Obs.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="epp-empty">No hay entregas registradas</td>
              </tr>
            ) : (
              pageItems.map((m) => (
                <tr key={m.identregaepp_54}>
                  <td><strong>{m.folio_54 || '-'}</strong></td>
                  <td>{m.clase_nombre || '-'}</td>
                  <td>{formatFecha(String(m.fecha_entrega_54))}</td>
                  <td>{m.trabajador_nombre || '-'}</td>
                  <td>{m.empresa_nombre || '-'}</td>
                  <td>{m.cargo_nombre || '-'}</td>
                  <td>{m.motivo_entrega_54}</td>
                  <td>
                    <span className={`badge-estado badge-${String(m.estado_54 || '').toLowerCase()}`}>
                      {m.estado_54}
                    </span>
                  </td>
                  <td>{m.observaciones_54 || '-'}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-acta"
                      onClick={() => openActa(m.identregaepp_54)}
                      title="Ver registro / PDF"
                      aria-label={`Acta de entrega ${m.folio_54 || m.identregaepp_54}`}
                    >
                      📄
                    </button>
                    {m.estado_54 !== 'ANULADO' && (
                      <>
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => startEdit(m.identregaepp_54)}
                          title="Editar"
                          aria-label={`Editar entrega ${m.folio_54 || m.identregaepp_54}`}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleAnular(m.identregaepp_54)}
                          title="Anular"
                          aria-label={`Anular entrega ${m.folio_54 || m.identregaepp_54}`}
                        >
                          🚫
                        </button>
                      </>
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
        totalItems={filteredAndSorted.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {showActa && (
        <div
          className="acta-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="acta-epp-title"
          onClick={closeActa}
        >
          <div className="acta-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acta-preview-toolbar">
              <h3 id="acta-epp-title">
                {previewActa?.clase?.tipo === 'ROPA'
                  ? 'Registro de Entrega — Ropa de Trabajo'
                  : 'Registro de Entrega — EPP'}
              </h3>
              <div className="acta-preview-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!previewActa || !previewActaId}
                  onClick={() => {
                    if (!previewActaId) return;
                    openAuthenticatedBlob(`/epp-entregas/${previewActaId}/acta-pdf`).catch(() =>
                      showError('Error', 'No se pudo abrir el PDF')
                    );
                  }}
                >
                  Descargar PDF
                </button>
                <button type="button" className="btn-secondary" onClick={closeActa}>
                  Cerrar
                </button>
              </div>
            </div>

            <div className="acta-preview-content">
              {loadingActa ? (
                <div className="epp-acta-loading">Cargando registro...</div>
              ) : previewActa ? (
                <article className="epp-registro-doc">
                  {(() => {
                    const esRopa = previewActa.clase?.tipo === 'ROPA';
                    const titulo = esRopa
                      ? 'REGISTRO DE ENTREGA DE ROPA DE TRABAJO'
                      : 'REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL';
                    const codigoDoc = esRopa ? 'SIG F-622-006' : 'SIG F-622-007';
                    const objetoLargo = esRopa
                      ? 'Ropa de Trabajo'
                      : 'Elementos de Protección Personal (EPP)';
                    const legalEntrega = esRopa
                      ? 'hace entrega de la siguiente Ropa de Trabajo al trabajador:'
                      : 'hace entrega de los siguientes Elementos de Protección Personal (EPP) al trabajador:';
                    const declaracionIntro = esRopa
                      ? 'Declaro haber recibido la Ropa de Trabajo detallada en el presente registro, en buen estado y apta para su utilización. Asimismo, declaro que:'
                      : 'Declaro haber recibido los Elementos de Protección Personal (EPP) detallados en el presente registro, en buen estado y aptos para su utilización. Asimismo, declaro que:';
                    const compromisos = esRopa
                      ? [
                          'Utilizaré la ropa de trabajo de manera permanente cuando la naturaleza de mis funciones o la evaluación de riesgos así lo requiera.',
                          'He recibido información y/o capacitación respecto del uso, cuidado, almacenamiento y mantenimiento de la ropa de trabajo entregada.',
                          'Me comprometo a conservar las prendas que he recibido en buenas condiciones de uso, informando oportunamente cualquier deterioro, pérdida o desperfecto.',
                          'No modificaré las prendas recibidas ni las utilizaré para fines distintos de aquellos para los cuales fueron diseñadas y fueron entregadas.',
                          'Entiendo que el uso de la ropa de trabajo recibida constituye una medida obligatoria y forma parte de mis obligaciones laborales.',
                          'En caso de pérdida, daño por uso indebido o negligencia comprobada, la empresa podrá aplicar las medidas establecidas en el Reglamento Interno de Orden, Higiene y Seguridad.',
                          'En caso de pérdida de la ropa de trabajo, la reposición será imputable al trabajador.',
                        ]
                      : [
                          'Utilizaré los EPP de manera permanente cuando la naturaleza de mis funciones o la evaluación de riesgos así lo requiera.',
                          'He recibido información y/o capacitación respecto del uso, limitaciones, cuidado, almacenamiento y mantenimiento de los EPP entregados.',
                          'Me comprometo a conservar los elementos que he recibido en buenas condiciones de uso, informando oportunamente cualquier deterioro, pérdida o desperfecto.',
                          'No modificaré los elementos recibidos ni los utilizaré para fines distintos de aquellos para los cuales fueron diseñados y fueron entregados.',
                          'Entiendo que el uso de los EPP recibidos constituye una medida obligatoria de control de riesgos y forma parte de mis obligaciones en materia de seguridad y salud en el trabajo.',
                          'En caso de pérdida, daño por uso indebido o negligencia comprobada, la empresa podrá aplicar las medidas establecidas en el Reglamento Interno de Orden, Higiene y Seguridad.',
                          'En cuanto al uniforme, en caso de pérdida, la reposición será imputable al trabajador.',
                        ];

                    return (
                      <>
                        <p className="epp-registro-code">
                          {codigoDoc}
                          <br />
                          Versión 001
                        </p>

                        <header className="epp-registro-header">
                          <img
                            className="epp-registro-logo"
                            src="/acta-epp/logo-transantin.svg"
                            alt="Logo TranSantin"
                          />
                          <h2>{titulo}</h2>
                        </header>

                        <p className="epp-registro-legal">
                          A <strong>{previewActa.intro.dia}</strong> de{' '}
                          <strong>{previewActa.intro.mes}</strong> de{' '}
                          <strong>{previewActa.intro.anio}</strong>,{' '}
                          <strong>{previewActa.empresaLegal.nombre}</strong>, RUT{' '}
                          <strong>{previewActa.empresaLegal.rut}</strong>, en cumplimiento de lo
                          establecido en la Ley Nº 16.744, el Decreto Supremo Nº 44 del Ministerio
                          del Trabajo y Previsión Social y el Reglamento Interno de Orden, Higiene y
                          Seguridad de la empresa, {legalEntrega}
                        </p>

                        <h3 className="epp-registro-section">Datos del Trabajador</h3>
                        <table
                          className="epp-registro-worker-table"
                          aria-label="Datos del trabajador"
                        >
                          <tbody>
                            <tr>
                              <th scope="row">Trabajador</th>
                              <td>{previewActa.trabajador.nombre}</td>
                            </tr>
                            <tr>
                              <th scope="row">Cédula de Identidad</th>
                              <td>{previewActa.trabajador.rut}</td>
                            </tr>
                            <tr>
                              <th scope="row">Cargo</th>
                              <td>{previewActa.trabajador.cargo}</td>
                            </tr>
                          </tbody>
                        </table>

                        <h3 className="epp-registro-section">
                          Detalle de {objetoLargo} entregado
                        </h3>
                        <table
                          className="epp-registro-table"
                          aria-label={`${objetoLargo} entregados`}
                        >
                          <thead>
                            <tr>
                              <th scope="col">Código</th>
                              <th scope="col">Elemento</th>
                              <th scope="col">Tipo</th>
                              <th scope="col">Categoría</th>
                              <th scope="col">Cant.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewActa.elementos.length === 0 ? (
                              <tr>
                                <td colSpan={5}>Sin elementos</td>
                              </tr>
                            ) : (
                              previewActa.elementos.map((e, i) => (
                                <tr key={`${e.codigo}-${i}`}>
                                  <td>{e.codigo}</td>
                                  <td className="epp-registro-item-name">{e.elemento}</td>
                                  <td>{e.tipo}</td>
                                  <td>{e.categoria}</td>
                                  <td className="text-center">{e.cantidad}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>

                        <section
                          className="epp-registro-declaracion"
                          aria-labelledby="decl-trab"
                        >
                          <h3 id="decl-trab">Declaración del trabajador</h3>
                          <p>{declaracionIntro}</p>
                          <ul>
                            {compromisos.map((c) => (
                              <li key={c.slice(0, 40)}>{c}</li>
                            ))}
                          </ul>
                        </section>

                        <section className="epp-registro-firmas" aria-label="Firma digital">
                          <p>
                            <strong>Firmado digitalmente por:</strong>
                          </p>
                          <p>
                            Trabajador: {previewActa.firmas.trabajadorNombre}, cédula de identidad{' '}
                            {previewActa.firmas.trabajadorRut}
                          </p>
                          <p>
                            Encargado de Bodega: {previewActa.firmas.encargadoNombre}, cédula de
                            identidad {previewActa.firmas.encargadoRut}
                          </p>
                          {previewActa.folio ? (
                            <p className="epp-registro-folio">Folio: {previewActa.folio}</p>
                          ) : null}
                        </section>

                        <footer className="epp-registro-footer">
                          {codigoDoc} · Versión 001
                        </footer>
                      </>
                    );
                  })()}
                </article>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntregaEppView;
