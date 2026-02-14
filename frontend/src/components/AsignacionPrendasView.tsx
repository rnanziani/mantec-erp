import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './BodegaView.css'; // Reutilizamos los mismos estilos
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import { exportReporteMaestroDetalleToExcel } from '../utils/exportUtils';

interface AsignacionPrenda {
  idasignacionmain_09: number;
  idtrabajador_09: number;
  fecha_09: string;
  hora_09: string;
  idresponsableentrega_09: number;
  idempresa_09?: number | null;
  observaciones_09?: string | null;
  trabajador_nombre?: string;
  responsable_nombre?: string;
  empresa_nombre?: string;
}

interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

interface DetalleAsignacionPrenda {
  idasignaciondetail_10: number;
  idasignacionmain_10: number;
  idprenda_10: number;
  talla_10: string;
  cantidad_10: number;
  prenda_nombre?: string;
  talla_descripcion?: string;
}

interface Prenda {
  idprenda_07: number;
  prenda_07: string;
}

interface Talla {
  id_16: number;
  talla_16: string;
  tipo_16?: string;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06: string;
  nombre_06: string;
  apaterno_06: string;
  amaterno_06: string;
}

interface Responsable {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  nombre_completo?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof AsignacionPrenda;
  direction: 'asc' | 'desc';
};

const AsignacionPrendasView: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionPrenda[]>([]);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Formulario Maestro
  const [showForm, setShowForm] = useState<boolean>(false);
  const [idAsignacionSeleccionada, setIdAsignacionSeleccionada] = useState<number | null>(null);
  const [buscarApellido, setBuscarApellido] = useState<string>('');
  const [idResponsable, setIdResponsable] = useState<string>('');
  const [idEmpresa, setIdEmpresa] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState<string>(new Date().toTimeString().split(' ')[0].substring(0, 5));
  
  // Detalle de prendas
  const [detallePrendas, setDetallePrendas] = useState<DetalleAsignacionPrenda[]>([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<Trabajador | null>(null);
  
  // Formulario de detalle
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<Prenda | null>(null);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [idDetalleEditando, setIdDetalleEditando] = useState<number | null>(null);

  // Vista previa del acta
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewActaData, setPreviewActaData] = useState<any>(null);
  const [loadingActa, setLoadingActa] = useState<boolean>(false);
  const [previewAsignacionId, setPreviewAsignacionId] = useState<number | null>(null);

  // Modo reporte
  const [modoReporte, setModoReporte] = useState<boolean>(false);
  const [fechaDesdeReporte, setFechaDesdeReporte] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [fechaHastaReporte, setFechaHastaReporte] = useState<string>(new Date().toISOString().split('T')[0]);
  const [idTrabajadorReporte, setIdTrabajadorReporte] = useState<string>('');
  const [idPrendaReporte, setIdPrendaReporte] = useState<string>('');
  const [datosReporte, setDatosReporte] = useState<any[]>([]);
  const [loadingReporte, setLoadingReporte] = useState<boolean>(false);
  const [showPreviewReporte, setShowPreviewReporte] = useState<boolean>(false);
  const [fechaHoraImpresion, setFechaHoraImpresion] = useState<string>('');
  const reportePreviewRef = useRef<HTMLDivElement>(null);

  // Definir funciones fetch antes del useEffect
  const fetchAsignaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setAsignaciones(data.data);
      } else {
        setError('Error al cargar las asignaciones');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrendas = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/prendas`);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPrendas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar prendas:', err);
    }
  }, []);

  const fetchTallas = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tallas`);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTallas(data.data);
        if (data.data.length > 0) {
          setTallaSeleccionada(data.data[0].talla_16);
        }
      }
    } catch (err) {
      console.error('Error al cargar tallas:', err);
    }
  }, []);

  const fetchTrabajadores = useCallback(async () => {
    try {
      const response = await fetch(TRABAJADORES_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTrabajadores(data.data);
      }
    } catch (err) {
      console.error('Error al cargar trabajadores:', err);
    }
  }, []);

  const fetchResponsables = useCallback(async () => {
    try {
      const response = await fetch(RESPONSABLES_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setResponsables(data.data);
      }
    } catch (err) {
      console.error('Error al cargar responsables:', err);
    }
  }, []);

  const fetchEmpresas = useCallback(async () => {
    try {
      const response = await fetch(EMPRESAS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setEmpresas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err);
    }
  }, []);

  // Búsqueda y ordenamiento
  const [filtro, setFiltro] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const registrosPorPagina = 10;

  const API_URL = 'http://localhost:3001/api/asignaciones-prendas';
  const TRABAJADORES_URL = 'http://localhost:3001/api/trabajadores';
  const RESPONSABLES_URL = 'http://localhost:3001/api/responsables-entrega';
  const EMPRESAS_URL = 'http://localhost:3001/api/empresas';

  useEffect(() => {
    fetchAsignaciones();
    fetchPrendas();
    fetchTallas();
    fetchTrabajadores();
    fetchResponsables();
    fetchEmpresas();
  }, [fetchAsignaciones, fetchPrendas, fetchTallas, fetchTrabajadores, fetchResponsables, fetchEmpresas]);

  useEffect(() => {
    if (idAsignacionSeleccionada) {
      fetchDetallesAsignacion(idAsignacionSeleccionada);
    } else {
      setDetallePrendas([]);
    }
  }, [idAsignacionSeleccionada]);

  const fetchDetallesAsignacion = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/${id}/detalles`);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setDetallePrendas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar detalles:', err);
    }
  };

  const handleNuevo = () => {
    resetForm();
    setShowForm(true);
    setIdAsignacionSeleccionada(null);
    setDetallePrendas([]);
    setTrabajadorSeleccionado(null);
  };

  const handleGuardar = async () => {
    if (!trabajadorSeleccionado || !idResponsable || !fecha || !hora) {
      await showError('Validación', 'Todos los campos son requeridos');
      return;
    }

    if (detallePrendas.length === 0) {
      await showError('Validación', 'Debe agregar al menos una prenda');
      return;
    }

    setLoading(true);

    try {
      setError('');
      
      const asignacionData = {
        idtrabajador_09: trabajadorSeleccionado.idtrabajador_06,
        fecha_09: fecha,
        hora_09: hora,
        idresponsableentrega_09: parseInt(idResponsable),
        idempresa_09: idEmpresa ? parseInt(idEmpresa) : null,
        observaciones_09: observaciones.trim() || null,
        detalles: detallePrendas.map(d => ({
          idprenda_10: d.idprenda_10,
          talla_10: d.talla_10,
          cantidad_10: d.cantidad_10
        }))
      };

      const method = idAsignacionSeleccionada ? 'PUT' : 'POST';
      const url = idAsignacionSeleccionada 
        ? `${API_URL}/${idAsignacionSeleccionada}`
        : API_URL;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignacionData)
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await showSuccess('¡Éxito!', data.message || 'Asignación guardada exitosamente');
        await fetchAsignaciones();
        resetForm();
      } else {
        await showError('Error', data.error || 'Error al guardar la asignación');
      }
    } catch (err) {
      await showError('Error', 'Error al guardar la asignación');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    const confirmed = await showDeleteConfirm(
      'esta asignación',
      'Se eliminarán también todos sus detalles.'
    );
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await showSuccess('¡Eliminado!', data.message || 'Asignación eliminada exitosamente');
        await fetchAsignaciones();
        resetForm();
      } else {
        await showError('Error', data.error || 'Error al eliminar la asignación');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar la asignación');
      console.error('Error:', err);
    }
  };

  const handleAgregarPrenda = () => {
    if (!prendaSeleccionada || !tallaSeleccionada || cantidad < 1) {
      showError('Validación', 'Debe seleccionar una prenda, talla y cantidad válida');
      return;
    }

    if (idDetalleEditando) {
      // Actualizar detalle existente
      setDetallePrendas(prev => prev.map(d => 
        d.idasignaciondetail_10 === idDetalleEditando
          ? { ...d, idprenda_10: prendaSeleccionada.idprenda_07, talla_10: tallaSeleccionada, cantidad_10: cantidad, prenda_nombre: prendaSeleccionada.prenda_07 }
          : d
      ));
      setIdDetalleEditando(null);
    } else {
      // Agregar nuevo detalle
      const nuevoDetalle: DetalleAsignacionPrenda = {
        idasignaciondetail_10: Date.now(), // ID temporal
        idasignacionmain_10: idAsignacionSeleccionada || 0,
        idprenda_10: prendaSeleccionada.idprenda_07,
        talla_10: tallaSeleccionada,
        cantidad_10: cantidad,
        prenda_nombre: prendaSeleccionada.prenda_07,
        talla_descripcion: tallaSeleccionada
      };
      setDetallePrendas(prev => [...prev, nuevoDetalle]);
    }

    // Limpiar formulario de detalle
    setPrendaSeleccionada(null);
    setTallaSeleccionada(tallas.length > 0 ? tallas[0].talla_16 : '');
    setCantidad(1);
  };

  const handleEliminarDetalle = (idDetalle: number) => {
    setDetallePrendas(prev => prev.filter(d => d.idasignaciondetail_10 !== idDetalle));
  };

  const handleEditarDetalle = (detalle: DetalleAsignacionPrenda) => {
    const prenda = prendas.find(p => p.idprenda_07 === detalle.idprenda_10);
    setPrendaSeleccionada(prenda || null);
    setTallaSeleccionada(detalle.talla_10);
    setCantidad(detalle.cantidad_10);
    setIdDetalleEditando(detalle.idasignaciondetail_10);
  };

  const resetForm = () => {
    setShowForm(false);
    setIdAsignacionSeleccionada(null);
    setTrabajadorSeleccionado(null);
    setBuscarApellido('');
    setIdResponsable('');
    setIdEmpresa('');
    setObservaciones('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setDetallePrendas([]);
    setPrendaSeleccionada(null);
    setTallaSeleccionada(tallas.length > 0 ? tallas[0].talla_16 : '');
    setCantidad(1);
    setIdDetalleEditando(null);
    setError('');
  };

  const handleSeleccionarAsignacion = (asignacion: AsignacionPrenda) => {
    setIdAsignacionSeleccionada(asignacion.idasignacionmain_09);
    setFecha(asignacion.fecha_09);
    setHora(asignacion.hora_09);
    setIdResponsable(asignacion.idresponsableentrega_09.toString());
    setIdEmpresa(asignacion.idempresa_09 ? asignacion.idempresa_09.toString() : '');
    setObservaciones(asignacion.observaciones_09 || '');
    
    // Buscar trabajador
    const trabajador = trabajadores.find(t => t.idtrabajador_06 === asignacion.idtrabajador_09);
    setTrabajadorSeleccionado(trabajador || null);
    
    setShowForm(true);
  };

  // Filtrar trabajadores por apellido
  const trabajadoresFiltrados = useMemo(() => {
    if (!buscarApellido || buscarApellido.trim() === '') {
      return trabajadores;
    }
    
    const busqueda = buscarApellido.trim();
    const apellidos = busqueda.split(/\s+/);
    
    return trabajadores.filter(t => {
      if (apellidos.length === 1) {
        const apellidoLower = apellidos[0].toLowerCase();
        const coincidePaterno = t.apaterno_06 && t.apaterno_06.toLowerCase().includes(apellidoLower);
        const coincideMaterno = t.amaterno_06 && t.amaterno_06.toLowerCase().includes(apellidoLower);
        return coincidePaterno || coincideMaterno;
      } else {
        const primerApellidoLower = apellidos[0].toLowerCase();
        const segundoApellidoLower = apellidos[1].toLowerCase();
        const coincidePaterno = t.apaterno_06 && t.apaterno_06.toLowerCase().includes(primerApellidoLower);
        const coincideMaterno = t.amaterno_06 && t.amaterno_06.toLowerCase().includes(segundoApellidoLower);
        return coincidePaterno && coincideMaterno;
      }
    });
  }, [trabajadores, buscarApellido]);

  // Procesar asignaciones para mostrar
  const processedAsignaciones = useMemo(() => {
    let data = [...asignaciones];

    if (filtro) {
      const lowerFiltro = filtro.toLowerCase();
      data = data.filter(a =>
        a.trabajador_nombre?.toLowerCase().includes(lowerFiltro) ||
        a.responsable_nombre?.toLowerCase().includes(lowerFiltro) ||
        a.empresa_nombre?.toLowerCase().includes(lowerFiltro) ||
        a.idasignacionmain_09.toString().includes(filtro)
      );
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      data.sort((a, b) => {
        const fechaA = new Date(a.fecha_09 + ' ' + a.hora_09);
        const fechaB = new Date(b.fecha_09 + ' ' + b.hora_09);
        return fechaB.getTime() - fechaA.getTime();
      });
    }

    return data;
  }, [asignaciones, filtro, sortConfig]);

  const asignacionesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    return processedAsignaciones.slice(inicio, fin);
  }, [processedAsignaciones, paginaActual]);

  const totalPaginas = Math.ceil(processedAsignaciones.length / registrosPorPagina);

  const openPreviewModal = useCallback(async (id: number) => {
    setShowPreviewModal(true);
    setPreviewAsignacionId(id);
    setPreviewActaData(null);
    setLoadingActa(true);
    try {
      const response = await fetch(`${API_URL}/${id}/acta-datos`);
      const data: ApiResponse = await response.json();
      if (data.success && data.data) {
        setPreviewActaData(data.data);
      } else {
        await showError('Error', data.error || 'No se pudieron cargar los datos del acta');
        setShowPreviewModal(false);
      }
    } catch (err) {
      await showError('Error', 'Error de conexión al cargar el acta');
      setShowPreviewModal(false);
    } finally {
      setLoadingActa(false);
    }
  }, []);

  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewActaData(null);
    setPreviewAsignacionId(null);
  }, []);

  const handlePrintActa = useCallback(() => {
    window.print();
  }, []);

  const fetchReporte = useCallback(async () => {
    if (!fechaDesdeReporte || !fechaHastaReporte) {
      await showError('Validación', 'Debe indicar el intervalo de fechas');
      return;
    }
    setLoadingReporte(true);
    setShowPreviewReporte(false);
    try {
      const params = new URLSearchParams({
        fechaDesde: fechaDesdeReporte,
        fechaHasta: fechaHastaReporte
      });
      if (idTrabajadorReporte) params.append('idTrabajador', idTrabajadorReporte);
      if (idPrendaReporte) params.append('idPrenda', idPrendaReporte);
      const response = await fetch(`${API_URL}/reporte/datos?${params}`);
      const data: ApiResponse = await response.json();
      if (!response.ok) {
        await showError('Error', data.error || `Error del servidor (${response.status})`);
        return;
      }
      if (data.success) {
        const rows = Array.isArray(data.data) ? data.data : [];
        setDatosReporte(rows);
        setShowPreviewReporte(true);
        setFechaHoraImpresion(new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
        // Scroll a la vista previa tras el re-render
        setTimeout(() => {
          reportePreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        await showError('Error', data.error || 'No se pudieron cargar los datos del reporte');
      }
    } catch (err) {
      await showError('Error', 'Error de conexión al cargar el reporte');
    } finally {
      setLoadingReporte(false);
    }
  }, [fechaDesdeReporte, fechaHastaReporte, idTrabajadorReporte, idPrendaReporte]);

  const getReportePDFUrl = useCallback(() => {
    const params = new URLSearchParams({
      fechaDesde: fechaDesdeReporte,
      fechaHasta: fechaHastaReporte
    });
    if (idTrabajadorReporte) params.append('idTrabajador', idTrabajadorReporte);
    if (idPrendaReporte) params.append('idPrenda', idPrendaReporte);
    const usuario = getUsuarioConectado();
    if (usuario) params.append('usuario', usuario);
    return `${API_URL}/reporte/pdf?${params}`;
  }, [fechaDesdeReporte, fechaHastaReporte, idTrabajadorReporte, idPrendaReporte]);

  const formatDateReporte = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatHoraReporte = (time: string) => {
    if (!time) return '';
    const parts = String(time).split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };

  const getUsuarioConectado = (): string => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.nombre_completo_00 || user.nombre_completo || user.username || 'Usuario';
      }
    } catch {
      // ignore
    }
    return 'Usuario';
  };

  // Agrupar reporte por asignación (maestro-detalle)
  const reporteAgrupado = useMemo(() => {
    if (!datosReporte || datosReporte.length === 0) return [];
    const grupos = new Map<number, {
      idasignacionmain_09: number;
      fecha_09: string;
      hora_09: string;
      trabajador_nombre: string;
      responsable_nombre: string;
      empresa_nombre: string;
      detalles: Array<{ prenda_nombre: string; talla_10: string; cantidad_10: number }>;
    }>();
    datosReporte.forEach((row: any) => {
      const id = row.idasignacionmain_09;
      if (!grupos.has(id)) {
        grupos.set(id, {
          idasignacionmain_09: id,
          fecha_09: row.fecha_09,
          hora_09: row.hora_09,
          trabajador_nombre: row.trabajador_nombre || 'N/A',
          responsable_nombre: row.responsable_nombre || 'N/A',
          empresa_nombre: row.empresa_nombre || 'N/A',
          detalles: []
        });
      }
      grupos.get(id)!.detalles.push({
        prenda_nombre: row.prenda_nombre || 'N/A',
        talla_10: row.talla_10 || 'N/A',
        cantidad_10: row.cantidad_10 ?? 0
      });
    });
    return Array.from(grupos.values());
  }, [datosReporte]);

  const handleSort = (key: keyof AsignacionPrenda) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>👔 Asignación de Prendas</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!modoReporte && (
            <>
              <button
                className="btn-primary"
                onClick={handleNuevo}
                style={{ backgroundColor: '#007bff' }}
              >
                ✏️ Nuevo
              </button>
              <button
                className="btn-primary"
                onClick={handleGuardar}
                disabled={loading || !showForm}
                style={{ backgroundColor: '#28a745' }}
              >
                💾 Guardar
              </button>
              {idAsignacionSeleccionada && (
                <button
                  className="btn-primary"
                  onClick={() => openPreviewModal(idAsignacionSeleccionada)}
                  style={{ backgroundColor: '#6c757d' }}
                  title="Vista previa del Acta de Entrega de Uniforme"
                >
                  📄 Vista Previa Acta
                </button>
              )}
              <button
                className="btn-primary"
                onClick={() => setModoReporte(true)}
                style={{ backgroundColor: '#17a2b8' }}
                title="Generar reporte por intervalo de fechas, trabajador y prenda"
              >
                📊 Reporte
              </button>
              <button
                className="btn-secondary"
                onClick={resetForm}
              >
                🚪 Salir
              </button>
            </>
          )}
          {modoReporte && (
            <button
              className="btn-secondary"
              onClick={() => {
                setModoReporte(false);
                setShowPreviewReporte(false);
                setDatosReporte([]);
              }}
            >
              ← Volver
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="form-container" style={{ background: '#FEE2E2', color: '#991B1B', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Sección Reporte */}
      {modoReporte && (
        <div className="form-container reporte-section" style={{ marginBottom: '20px' }}>
          <div className="no-print">
          <h3>📊 Reporte de Asignación de Prendas</h3>
          <p style={{ color: '#6c757d', marginBottom: '16px', fontSize: '0.95em' }}>
            Filtre por intervalo de fechas y opcionalmente por trabajador o prenda. Formato: Carta, horizontal.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label htmlFor="fecha-desde-reporte">Fecha Desde *</label>
              <input
                id="fecha-desde-reporte"
                type="date"
                value={fechaDesdeReporte}
                onChange={(e) => setFechaDesdeReporte(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                aria-describedby="fecha-desde-desc"
              />
              <span id="fecha-desde-desc" className="sr-only">Fecha inicial del período del reporte</span>
            </div>
            <div className="form-group">
              <label htmlFor="fecha-hasta-reporte">Fecha Hasta *</label>
              <input
                id="fecha-hasta-reporte"
                type="date"
                value={fechaHastaReporte}
                onChange={(e) => setFechaHastaReporte(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                aria-describedby="fecha-hasta-desc"
              />
              <span id="fecha-hasta-desc" className="sr-only">Fecha final del período del reporte</span>
            </div>
            <div className="form-group">
              <label htmlFor="trabajador-reporte">Trabajador (opcional)</label>
              <select
                id="trabajador-reporte"
                value={idTrabajadorReporte}
                onChange={(e) => setIdTrabajadorReporte(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                aria-describedby="trabajador-reporte-desc"
              >
                <option value="">Todos los trabajadores</option>
                {trabajadores.map(t => (
                  <option key={t.idtrabajador_06} value={t.idtrabajador_06}>
                    {t.apaterno_06} {t.amaterno_06} {t.nombre_06}
                  </option>
                ))}
              </select>
              <span id="trabajador-reporte-desc" className="sr-only">Filtrar por trabajador específico</span>
            </div>
            <div className="form-group">
              <label htmlFor="prenda-reporte">Prenda (opcional)</label>
              <select
                id="prenda-reporte"
                value={idPrendaReporte}
                onChange={(e) => setIdPrendaReporte(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                aria-describedby="prenda-reporte-desc"
              >
                <option value="">Todas las prendas</option>
                {prendas.map(p => (
                  <option key={p.idprenda_07} value={p.idprenda_07}>{p.prenda_07}</option>
                ))}
              </select>
              <span id="prenda-reporte-desc" className="sr-only">Filtrar por prenda específica</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={fetchReporte}
              disabled={loadingReporte}
              style={{ backgroundColor: '#17a2b8' }}
            >
              {loadingReporte ? '⏳ Cargando...' : '👁️ Vista Previa'}
            </button>
            <button
              className="btn-primary"
              onClick={() => window.open(getReportePDFUrl(), '_blank')}
              disabled={!fechaDesdeReporte || !fechaHastaReporte}
              style={{ backgroundColor: '#28a745' }}
              title="Descargar PDF (formato carta, horizontal)"
            >
              📥 Descargar PDF
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (reporteAgrupado.length > 0) {
                  const filename = `reporte-asignacion-prendas-${fechaDesdeReporte}-${fechaHastaReporte}`;
                  const fechaImp = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  exportReporteMaestroDetalleToExcel(reporteAgrupado, filename, formatDateReporte, formatHoraReporte, fechaImp, getUsuarioConectado());
                  showSuccess('Exportado', 'El reporte se ha exportado a Excel correctamente.');
                }
              }}
              disabled={reporteAgrupado.length === 0}
              style={{ backgroundColor: '#218838' }}
              title="Exportar a Excel (formato maestro-detalle)"
            >
              📊 Exportar Excel
            </button>
          </div>
          </div>

          {loadingReporte && (
            <div ref={reportePreviewRef} style={{ marginTop: '24px', padding: '40px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              ⏳ Cargando reporte...
            </div>
          )}

          {showPreviewReporte && !loadingReporte && (
            <div ref={reportePreviewRef} className="reporte-preview-container" style={{ marginTop: '24px' }}>
              <div className="no-print" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0 }}>Vista previa del reporte</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      const filename = `reporte-asignacion-prendas-${fechaDesdeReporte}-${fechaHastaReporte}`;
                      const fechaImp = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                      exportReporteMaestroDetalleToExcel(reporteAgrupado, filename, formatDateReporte, formatHoraReporte, fechaImp, getUsuarioConectado());
                      showSuccess('Exportado', 'El reporte se ha exportado a Excel correctamente.');
                    }}
                    style={{ backgroundColor: '#218838' }}
                  >
                    📊 Exportar Excel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setFechaHoraImpresion(new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
                      setTimeout(() => window.print(), 150);
                    }}
                    style={{ backgroundColor: '#007bff' }}
                  >
                    🖨️ Imprimir
                  </button>
                </div>
              </div>
              <div
                className="reporte-print-area"
                style={{
                  overflowX: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '12px',
                  backgroundColor: '#fff'
                }}
              >
                {reporteAgrupado.length > 0 ? (
                  <table className="data-table reporte-maestro-detalle" style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <td colSpan={8} style={{ border: 'none', padding: '0 0 8px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                          REPORTE DE ASIGNACIÓN DE PRENDAS
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={8} style={{ border: 'none', padding: '0 0 4px 0', textAlign: 'center', fontSize: '0.9em', color: '#555' }}>
                          Período: {formatDateReporte(fechaDesdeReporte)} - {formatDateReporte(fechaHastaReporte)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={8} style={{ border: 'none', padding: '0 0 8px 0', fontSize: '0.85em', color: '#666' }}>
                          <span>Usuario: {getUsuarioConectado()}</span>
                          {fechaHoraImpresion && (
                            <span style={{ float: 'right' }}>Fecha y hora de impresión: {fechaHoraImpresion}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Trabajador</th>
                        <th>Prenda</th>
                        <th>Talla</th>
                        <th>Cantidad</th>
                        <th>Responsable</th>
                        <th>Empresa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteAgrupado.map((grupo) =>
                        grupo.detalles.map((det, dIdx) => (
                          <tr
                            key={`${grupo.idasignacionmain_09}-${dIdx}`}
                            style={dIdx === grupo.detalles.length - 1 ? { borderBottom: '2px solid #dee2e6' } : undefined}
                          >
                            {dIdx === 0 ? (
                              <>
                                <td rowSpan={grupo.detalles.length} style={{ verticalAlign: 'top' }}>
                                  {formatDateReporte(grupo.fecha_09)}
                                </td>
                                <td rowSpan={grupo.detalles.length} style={{ verticalAlign: 'top' }}>
                                  {formatHoraReporte(grupo.hora_09)}
                                </td>
                                <td rowSpan={grupo.detalles.length} style={{ verticalAlign: 'top' }}>
                                  {grupo.trabajador_nombre}
                                </td>
                                <td>{det.prenda_nombre}</td>
                                <td>{det.talla_10}</td>
                                <td>{det.cantidad_10}</td>
                                <td rowSpan={grupo.detalles.length} style={{ verticalAlign: 'top' }}>
                                  {grupo.responsable_nombre}
                                </td>
                                <td rowSpan={grupo.detalles.length} style={{ verticalAlign: 'top' }}>
                                  {grupo.empresa_nombre}
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{det.prenda_nombre}</td>
                                <td>{det.talla_10}</td>
                                <td>{det.cantidad_10}</td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', padding: '24px', color: '#6c757d' }}>
                    No hay registros para el período y filtros seleccionados.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && !modoReporte && (
        <div className="form-container">
          <h3>Datos de la Asignación</h3>
          
          {/* Primera fila: Buscar Trabajador | Seleccionar Trabajador */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Buscar Trabajador Por Apellido</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={buscarApellido}
                  onChange={(e) => setBuscarApellido(e.target.value.toUpperCase())}
                  placeholder="Ej: GONZALEZ o GONZALEZ PEREZ"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase', fontSize: '14px' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setBuscarApellido('')}
                  style={{ padding: '8px 16px' }}
                >
                  🔍
                </button>
              </div>
              <small style={{ color: '#6c757d', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                💡 Tip: Escribe un apellido para búsqueda amplia, o dos apellidos para búsqueda precisa
              </small>
            </div>

            <div className="form-group">
              <label>Seleccionar Trabajador *</label>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto', 
                border: '1px solid #ced4da', 
                borderRadius: '4px',
                padding: '10px'
              }}>
                {trabajadoresFiltrados.length > 0 ? (
                  trabajadoresFiltrados.map(trab => (
                    <div
                      key={trab.idtrabajador_06}
                      onClick={() => setTrabajadorSeleccionado(trab)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: trabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? '#007bff' : 'transparent',
                        color: trabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? 'white' : 'black',
                        marginBottom: '5px',
                        borderRadius: '4px',
                        border: trabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? '2px solid #0056b3' : '1px solid #ced4da'
                      }}
                    >
                      <strong>{trab.apaterno_06 || ''} {trab.amaterno_06 || ''}</strong> {trab.nombre_06 || ''} - <span style={{ fontSize: '0.9em', opacity: 0.8 }}>{trab.ruttrabajador_06 || ''}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6c757d', 
                    padding: '10px' 
                  }}>
                    {trabajadores.length === 0 ? 'Cargando trabajadores...' : 'No se encontraron trabajadores con ese criterio'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Segunda fila: Responsable | Empresa | Fecha | Hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Responsable *</label>
              <select
                value={idResponsable}
                onChange={(e) => setIdResponsable(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
              >
                <option value="">Seleccione un responsable</option>
                {responsables.map(resp => (
                  <option key={resp.idresponsableentrega_08} value={resp.idresponsableentrega_08}>
                    {resp.nombreresponsableentrega_08} {resp.apaternoresponsableentrega_08 || ''} {resp.amaternoresponsableentrega_08 || ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Empresa</label>
              <select
                value={idEmpresa}
                onChange={(e) => setIdEmpresa(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
              >
                <option value="">Seleccione una empresa</option>
                {empresas.map(emp => (
                  <option key={emp.idempresa_15} value={emp.idempresa_15}>
                    {emp.nombreempresa_15}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
              />
            </div>

            <div className="form-group">
              <label>Hora *</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          {/* Formulario para agregar prendas */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Agregar Prenda</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Prenda *</label>
                <select
                  value={prendaSeleccionada?.idprenda_07 || ''}
                  onChange={(e) => {
                    const prenda = prendas.find(p => p.idprenda_07 === parseInt(e.target.value));
                    setPrendaSeleccionada(prenda || null);
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  <option value="">Seleccione una prenda</option>
                  {prendas.map(prenda => (
                    <option key={prenda.idprenda_07} value={prenda.idprenda_07}>
                      {prenda.prenda_07}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Talla *</label>
                <select
                  value={tallaSeleccionada}
                  onChange={(e) => setTallaSeleccionada(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  {tallas.map(talla => (
                    <option key={talla.id_16} value={talla.talla_16}>
                      {talla.talla_16}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                />
              </div>

              <button
                type="button"
                className={idDetalleEditando ? "btn-success" : "btn-primary"}
                onClick={handleAgregarPrenda}
                style={{ padding: '8px 16px', height: 'fit-content' }}
              >
                {idDetalleEditando ? '💾 Actualizar' : '➕ Agregar'}
              </button>
            </div>
            {idDetalleEditando && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIdDetalleEditando(null);
                  setPrendaSeleccionada(null);
                  setTallaSeleccionada(tallas.length > 0 ? tallas[0].talla_16 : '');
                  setCantidad(1);
                }}
                style={{ marginTop: '10px', padding: '6px 12px' }}
              >
                ❌ Cancelar Edición
              </button>
            )}
          </div>

          {/* Tabla de detalles */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Prendas Asignadas</label>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prenda</th>
                    <th>Talla</th>
                    <th>Cantidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detallePrendas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>
                        No hay prendas asignadas
                      </td>
                    </tr>
                  ) : (
                    detallePrendas.map((detalle) => {
                      const prenda = prendas.find(p => p.idprenda_07 === detalle.idprenda_10);
                      return (
                        <tr key={detalle.idasignaciondetail_10}>
                          <td>{prenda?.prenda_07 || detalle.prenda_nombre || 'N/A'}</td>
                          <td>{detalle.talla_descripcion || detalle.talla_10}</td>
                          <td>{detalle.cantidad_10}</td>
                          <td className="actions">
                            <button
                              className="btn-edit"
                              onClick={() => handleEditarDetalle(detalle)}
                              title="Editar"
                              style={{ marginRight: '5px' }}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleEliminarDetalle(detalle.idasignaciondetail_10)}
                              title="Eliminar"
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
        </div>
      )}

      {/* Tabla de asignaciones */}
      {!showForm && !modoReporte && (
        <>
          <div className="form-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar asignación..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('idasignacionmain_09')} 
                    className={`sortable ${sortConfig && sortConfig.key === 'idasignacionmain_09' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ID
                  </th>
                  <th 
                    onClick={() => handleSort('trabajador_nombre')} 
                    className={`sortable ${sortConfig && sortConfig.key === 'trabajador_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    TRABAJADOR
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_09')} 
                    className={`sortable ${sortConfig && sortConfig.key === 'fecha_09' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    FECHA
                  </th>
                  <th 
                    onClick={() => handleSort('hora_09')} 
                    className={`sortable ${sortConfig && sortConfig.key === 'hora_09' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    HORA
                  </th>
                  <th 
                    onClick={() => handleSort('responsable_nombre')} 
                    className={`sortable ${sortConfig && sortConfig.key === 'responsable_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    RESPONSABLE
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {loading && asignaciones.length === 0 ? (
                  <tr><td colSpan={6}>Cargando...</td></tr>
                ) : asignacionesPaginadas.length === 0 ? (
                  <tr><td colSpan={6}>No hay asignaciones registradas</td></tr>
                ) : (
                  asignacionesPaginadas.map((asignacion) => (
                    <tr 
                      key={asignacion.idasignacionmain_09}
                      onClick={() => handleSeleccionarAsignacion(asignacion)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{asignacion.idasignacionmain_09}</td>
                      <td>{asignacion.trabajador_nombre || 'N/A'}</td>
                      <td>{asignacion.fecha_09}</td>
                      <td>{asignacion.hora_09}</td>
                      <td>{asignacion.responsable_nombre || 'N/A'}</td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-primary"
                          onClick={() => openPreviewModal(asignacion.idasignacionmain_09)}
                          title="Vista previa del Acta"
                          style={{ marginRight: '5px', padding: '4px 8px', fontSize: '12px' }}
                        >
                          📄
                        </button>
                        <button
                          className="btn-edit"
                          onClick={() => handleSeleccionarAsignacion(asignacion)}
                          title="Editar"
                          style={{ marginRight: '5px' }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleEliminar(asignacion.idasignacionmain_09)}
                          title="Eliminar"
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

          {totalPaginas > 1 && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                disabled={paginaActual === 1}
              >
                ← Anterior
              </button>
              <span style={{ padding: '8px 16px', alignSelf: 'center' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual === totalPaginas}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Vista Previa del Acta */}
      {showPreviewModal && (
        <div
          className="acta-preview-overlay"
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
              <h3 style={{ margin: 0 }}>📄 Vista Previa - Acta de Entrega de Uniforme</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={handlePrintActa}
                  disabled={!previewActaData}
                  style={{ backgroundColor: '#007bff' }}
                >
                  🖨️ Imprimir
                </button>
                <button
                  className="btn-primary"
                  onClick={() => previewAsignacionId && window.open(`${API_URL}/${previewAsignacionId}/acta-pdf`, '_blank')}
                  disabled={!previewActaData}
                  style={{ backgroundColor: '#28a745' }}
                >
                  📥 Generar PDF
                </button>
                <button className="btn-secondary" onClick={closePreviewModal}>
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
                  <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '16px' }}>ACTA DE ENTREGA DE UNIFORME</h2>
                  <p style={{ textAlign: 'right', fontSize: '10px', color: '#666', marginBottom: '12px' }}>SIG F-622-005 Versión 001</p>
                  <p style={{ marginBottom: '12px' }}>
                    En la ciudad de Santiago, {previewActaData.intro.dia} días del mes de {previewActaData.intro.mes} del año {previewActaData.intro.anio}, se procede a dejar constancia de la entrega del uniforme al trabajador que a continuación se detalla:
                  </p>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Datos del Trabajador:</p>
                  <p style={{ margin: '4px 0' }}><strong>Nombre:</strong> {previewActaData.trabajador.nombre}</p>
                  <p style={{ margin: '4px 0' }}><strong>Rut:</strong> {previewActaData.trabajador.rut}</p>
                  <p style={{ margin: '4px 0 12px 0' }}><strong>Cargo:</strong> {previewActaData.trabajador.cargo}</p>
                  <p style={{ margin: '4px 0 12px 0' }}><strong>Empresa:</strong> {previewActaData.trabajador.empresa}</p>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Detalle del uniforme entregado</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e8e8e8' }}>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Item</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Cantidad</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Talla</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Estado</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewActaData.prendas.map((p: { prenda: string; cantidad: number; talla: string }, i: number) => (
                        <tr key={i}>
                          <td style={{ border: '1px solid #ccc', padding: '6px' }}>{p.prenda}</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{p.cantidad}</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{p.talla}</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Nuevo</td>
                          <td style={{ border: '1px solid #ccc', padding: '6px' }}></td>
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
                    <li>Usar el uniforme únicamente durante sus funciones laborales.</li>
                    <li>Mantener el uniforme en condiciones limpias y presentables.</li>
                    <li>No alterar ni modificar el diseño del uniforme.</li>
                    <li>Responder por el cuidado y conservación de las prendas entregadas.</li>
                    <li>Reportar inmediatamente cualquier daño o pérdida al área correspondiente.</li>
                    <li>El mal uso o la negligencia en el cuidado del uniforme podrá ser objeto de observaciones o medidas disciplinarias conforme al reglamento interno.</li>
                  </ul>
                  <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Uso del Uniforme:</p>
                  <p style={{ marginBottom: '8px' }}>La empresa hace hincapié en la obligatoriedad del uso del uniforme completo durante todo el periodo de servicio activo. El uso del uniforme contribuye a:</p>
                  <ul style={{ margin: '4px 0 12px 20px', padding: 0 }}>
                    <li>Proyectar una imagen profesional y ordenada de la empresa.</li>
                    <li>Generar confianza en los pasajeros.</li>
                    <li>Facilitar la identificación del personal por parte de usuarios.</li>
                  </ul>
                  <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Declaración del Trabajador:</p>
                  <p style={{ marginBottom: '12px' }}>Declaro haber recibido a conformidad las prendas antes detalladas, las cuales se encuentran en buen estado y son de uso obligatorio durante mi jornada laboral. Asimismo, me comprometo a dar un uso adecuado al uniforme y a conservarlo en buenas condiciones, haciéndome responsable de su cuidado.</p>
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

      {/* Estilos para impresión */}
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
        @media print {
          .sidebar, .view-header, .no-print { display: none !important; }
          .reporte-preview-container,
          .reporte-preview-container * {
            visibility: visible !important;
          }
          .reporte-preview-container {
            display: block !important;
          }
          .reporte-print-area {
            overflow: visible !important;
          }
          .reporte-maestro-detalle {
            page-break-inside: auto;
          }
          .reporte-maestro-detalle thead {
            display: table-header-group !important;
          }
          .reporte-maestro-detalle thead th,
          .reporte-maestro-detalle thead td {
            break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: letter landscape;
            margin: 15mm;
          }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
};

export default AsignacionPrendasView;


