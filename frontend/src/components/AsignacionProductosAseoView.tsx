import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css'; // Reutilizamos los mismos estilos
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';

interface Asignacion {
  id_asignacion: number;
  id_maquina: number;
  id_trabajador: number;
  id_responsable: number;
  fecha: string;
  hora: string;
  created_at?: string;
  updated_at?: string;
  // Campos JOINed
  maquina_ppu?: string;
  maquina_numinterno?: string;
  maquina_descripcion?: string;
  trabajador_nombre?: string;
  responsable_nombre?: string;
}

interface DetalleAsignacion {
  id_detalle: number;
  id_asignacion: number;
  id_producto: number;
  cantidad: number;
  // Campos JOINed
  producto_nombre?: string;
}

interface ProductoAseo {
  id_producto: number;
  nombre_producto: string;
  activo?: boolean;
}

interface Maquina {
  idmaquina_11: number;
  ppu_11: string;
  numinterno_11: string;
  descripcion_11: string;
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
  key: keyof Asignacion;
  direction: 'asc' | 'desc';
};

const AsignacionProductosAseoView: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [productos, setProductos] = useState<ProductoAseo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Formulario Maestro
  const [showForm, setShowForm] = useState<boolean>(false);
  const [idAsignacionSeleccionada, setIdAsignacionSeleccionada] = useState<number | null>(null);
  const [buscarPatente, setBuscarPatente] = useState<string>('');
  const [buscarApellido, setBuscarApellido] = useState<string>('');
  const [idResponsable, setIdResponsable] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState<string>(new Date().toTimeString().split(' ')[0].substring(0, 5));
  
  // Detalle de productos
  const [detalleProductos, setDetalleProductos] = useState<DetalleAsignacion[]>([]);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState<Maquina | null>(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<Trabajador | null>(null);

  // Búsqueda y ordenamiento
  const [filtro, setFiltro] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const registrosPorPagina = 10;

  // Estados para el modal de reporte
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [reportFechaDesde, setReportFechaDesde] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [reportFechaHasta, setReportFechaHasta] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportBuscarPatente, setReportBuscarPatente] = useState<string>('');
  const [reportBuscarTrabajador, setReportBuscarTrabajador] = useState<string>('');
  const [reportMaquinaSeleccionada, setReportMaquinaSeleccionada] = useState<Maquina | null>(null);
  const [reportTrabajadorSeleccionado, setReportTrabajadorSeleccionado] = useState<Trabajador | null>(null);
  const [reportProducto, setReportProducto] = useState<string>('');

  const API_URL = 'http://localhost:3001/api/asignaciones-productos-aseo';
  const PRODUCTOS_URL = 'http://localhost:3001/api/productos-aseo';
  const MAQUINAS_URL = 'http://localhost:3001/api/maquinas';
  const TRABAJADORES_URL = 'http://localhost:3001/api/trabajadores';
  const RESPONSABLES_URL = 'http://localhost:3001/api/responsables-entrega';

  useEffect(() => {
    fetchAsignaciones();
    fetchProductos();
    fetchMaquinas();
    fetchTrabajadores();
    fetchResponsables();
  }, []);

  useEffect(() => {
    if (idAsignacionSeleccionada) {
      fetchDetallesAsignacion(idAsignacionSeleccionada);
    } else {
      setDetalleProductos([]);
    }
  }, [idAsignacionSeleccionada]);

  const fetchAsignaciones = async () => {
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
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch(PRODUCTOS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Mapear los campos de la base de datos a los campos esperados por el componente
        const productosMapeados = data.data.map((producto: any) => ({
          id_producto: producto.idproductoaseo_10 || producto.id_producto,
          nombre_producto: producto.productoaseo_10 || producto.nombre_producto,
          activo: producto.enuso_10 !== undefined ? producto.enuso_10 : (producto.activo !== undefined ? producto.activo : true)
        }));
        console.log('Productos cargados:', productosMapeados.length);
        setProductos(productosMapeados);
      } else {
        console.error('Error en respuesta de productos:', data);
        setError('Error al cargar productos: ' + (data.error || 'Respuesta inválida'));
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error de conexión al cargar productos');
    }
  };

  const fetchMaquinas = async () => {
    try {
      const response = await fetch(MAQUINAS_URL);
      const data: ApiResponse = await response.json();
      console.log('Máquinas response:', data); // Debug
      if (data.success && Array.isArray(data.data)) {
        setMaquinas(data.data);
      } else {
        console.error('Error en respuesta de máquinas:', data);
      }
    } catch (err) {
      console.error('Error al cargar máquinas:', err);
    }
  };

  const fetchTrabajadores = async () => {
    try {
      const response = await fetch(TRABAJADORES_URL);
      const data: ApiResponse = await response.json();
      console.log('Trabajadores response:', data); // Debug
      if (data.success && Array.isArray(data.data)) {
        setTrabajadores(data.data);
      } else {
        console.error('Error en respuesta de trabajadores:', data);
      }
    } catch (err) {
      console.error('Error al cargar trabajadores:', err);
    }
  };

  const fetchResponsables = async () => {
    try {
      const response = await fetch(RESPONSABLES_URL);
      const data: ApiResponse = await response.json();
      console.log('Responsables response:', data); // Debug
      if (data.success && Array.isArray(data.data)) {
        setResponsables(data.data);
      } else {
        console.error('Error en respuesta de responsables:', data);
        setError('Error al cargar responsables');
      }
    } catch (err) {
      console.error('Error al cargar responsables:', err);
      setError('Error de conexión al cargar responsables');
    }
  };

  const fetchDetallesAsignacion = async (idAsignacion: number) => {
    try {
      const response = await fetch(`${API_URL}/${idAsignacion}/detalles`);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setDetalleProductos(data.data);
      }
    } catch (err) {
      console.error('Error al cargar detalles:', err);
      setDetalleProductos([]);
    }
  };

  // Lógica de filtrado y ordenamiento
  const processedAsignaciones = useMemo(() => {
    let data = [...asignaciones];

    // Filtrar por fecha (últimos 3 días + hoy)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio del día actual
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() - 3); // 3 días atrás
    
    data = data.filter(a => {
      if (!a.fecha) return false;
      const fechaAsignacion = new Date(a.fecha);
      fechaAsignacion.setHours(0, 0, 0, 0);
      return fechaAsignacion >= fechaLimite && fechaAsignacion <= hoy;
    });

    // Filtrar por búsqueda de texto
    if (filtro) {
      const lowerFiltro = filtro.toLowerCase();
      data = data.filter(a =>
        a.maquina_ppu?.toLowerCase().includes(lowerFiltro) ||
        a.maquina_numinterno?.toLowerCase().includes(lowerFiltro) ||
        a.trabajador_nombre?.toLowerCase().includes(lowerFiltro) ||
        a.responsable_nombre?.toLowerCase().includes(lowerFiltro) ||
        a.id_asignacion.toString().includes(filtro)
      );
    }

    // Ordenar (por defecto por fecha más reciente primero)
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
      // Ordenar por fecha descendente por defecto
      data.sort((a, b) => {
        const fechaA = new Date(a.fecha + ' ' + a.hora);
        const fechaB = new Date(b.fecha + ' ' + b.hora);
        return fechaB.getTime() - fechaA.getTime();
      });
    }

    return data;
  }, [asignaciones, filtro, sortConfig]);

  // Paginación
  const asignacionesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    return processedAsignaciones.slice(inicio, fin);
  }, [processedAsignaciones, paginaActual]);

  const totalPaginas = Math.ceil(processedAsignaciones.length / registrosPorPagina);

  const handleCambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  const handleSort = (key: keyof Asignacion) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Asignacion) => {
    if (!sortConfig || sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleNuevo = () => {
    resetForm();
    setShowForm(true);
    setIdAsignacionSeleccionada(null);
    setDetalleProductos([]);
    setMaquinaSeleccionada(null);
    setTrabajadorSeleccionado(null);
  };

  const handleGuardar = async () => {
    if (!maquinaSeleccionada || !trabajadorSeleccionado || !idResponsable || !fecha || !hora) {
      await showError('Validación', 'Todos los campos son requeridos');
      return;
    }

    if (detalleProductos.length === 0) {
      await showError('Validación', 'Debe agregar al menos un producto');
      return;
    }

    setLoading(true);

    try {
      setError('');
      
      // Guardar asignación
      const asignacionData = {
        id_maquina: maquinaSeleccionada.idmaquina_11,
        id_trabajador: trabajadorSeleccionado.idtrabajador_06,
        id_responsable: parseInt(idResponsable),
        fecha: fecha,
        hora: hora,
        detalles: detalleProductos.map(d => ({
          id_producto: d.id_producto,
          cantidad: d.cantidad
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
    const confirmed = await showDeleteConfirm('esta asignación');
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
        if (idAsignacionSeleccionada === id) {
          resetForm();
        }
      } else {
        await showError('Error', data.error || 'Error al eliminar la asignación');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar la asignación');
      console.error('Error:', err);
    }
  };

  const handleSeleccionarAsignacion = (asignacion: Asignacion) => {
    setIdAsignacionSeleccionada(asignacion.id_asignacion);
    setFecha(asignacion.fecha);
    setHora(asignacion.hora);
    setIdResponsable(asignacion.id_responsable.toString());
    
    // Buscar máquina y trabajador
    const maq = maquinas.find(m => m.idmaquina_11 === asignacion.id_maquina);
    const trab = trabajadores.find(t => t.idtrabajador_06 === asignacion.id_trabajador);
    
    setMaquinaSeleccionada(maq || null);
    setTrabajadorSeleccionado(trab || null);
    setShowForm(true);
  };

  const handleAgregarProducto = (producto: ProductoAseo) => {
    // Verificar si ya existe en el detalle
    const existe = detalleProductos.find(d => d.id_producto === producto.id_producto);
    
    if (existe) {
      // Incrementar cantidad
      setDetalleProductos(detalleProductos.map(d =>
        d.id_producto === producto.id_producto
          ? { ...d, cantidad: d.cantidad + 1 }
          : d
      ));
    } else {
      // Agregar nuevo producto
      const nuevoDetalle: DetalleAsignacion = {
        id_detalle: 0,
        id_asignacion: idAsignacionSeleccionada || 0,
        id_producto: producto.id_producto,
        cantidad: 1,
        producto_nombre: producto.nombre_producto
      };
      setDetalleProductos([...detalleProductos, nuevoDetalle]);
    }
  };

  const handleEliminarDetalle = (idProducto: number) => {
    setDetalleProductos(detalleProductos.filter(d => d.id_producto !== idProducto));
  };

  const handleCambiarCantidad = (idProducto: number, cantidad: number) => {
    if (cantidad < 1) {
      handleEliminarDetalle(idProducto);
      return;
    }
    setDetalleProductos(detalleProductos.map(d =>
      d.id_producto === idProducto
        ? { ...d, cantidad }
        : d
    ));
  };

  const resetForm = () => {
    setBuscarPatente('');
    setBuscarApellido('');
    setIdResponsable('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setDetalleProductos([]);
    setMaquinaSeleccionada(null);
    setTrabajadorSeleccionado(null);
    setIdAsignacionSeleccionada(null);
    setShowForm(false);
    setError('');
  };

  // Filtrar máquinas y trabajadores para el modal de reporte
  const reportMaquinasFiltradas = useMemo(() => {
    if (!reportBuscarPatente || reportBuscarPatente.trim() === '') return maquinas;
    const patenteLower = reportBuscarPatente.toLowerCase();
    return maquinas.filter(m =>
      (m.ppu_11 && m.ppu_11.toLowerCase().includes(patenteLower)) ||
      (m.numinterno_11 && m.numinterno_11.toLowerCase().includes(patenteLower)) ||
      (m.descripcion_11 && m.descripcion_11.toLowerCase().includes(patenteLower))
    );
  }, [maquinas, reportBuscarPatente]);

  const reportTrabajadoresFiltrados = useMemo(() => {
    if (!reportBuscarTrabajador || reportBuscarTrabajador.trim() === '') {
      return trabajadores;
    }
    const busqueda = reportBuscarTrabajador.trim();
    const apellidos = busqueda.split(/\s+/).map(a => a.toLowerCase());
    if (apellidos.length === 1) {
      const word = apellidos[0];
      const paternoMatch = trabajadores.filter(t =>
        t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(word)
      );
      const maternoMatch = trabajadores.filter(t =>
        t.amaterno_06 != null && t.amaterno_06.toLowerCase().startsWith(word) &&
        !paternoMatch.some(p => p.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paternoMatch, ...maternoMatch];
    }
    const [primer, segundo] = apellidos;
    return trabajadores
      .filter(t =>
        t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(primer) &&
        t.amaterno_06 != null && t.amaterno_06.toLowerCase().startsWith(segundo)
      )
      .sort((a, b) => {
        const cmpP = (a.apaterno_06 || '').localeCompare(b.apaterno_06 || '');
        return cmpP !== 0 ? cmpP : (a.amaterno_06 || '').localeCompare(b.amaterno_06 || '');
      });
  }, [trabajadores, reportBuscarTrabajador]);

  const handleLimpiarFiltrosReporte = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    setReportFechaDesde(date.toISOString().split('T')[0]);
    setReportFechaHasta(new Date().toISOString().split('T')[0]);
    setReportBuscarPatente('');
    setReportBuscarTrabajador('');
    setReportMaquinaSeleccionada(null);
    setReportTrabajadorSeleccionado(null);
    setReportProducto('');
  };

  const buildReportParams = () => {
    const params = new URLSearchParams({
      fecha_desde: reportFechaDesde,
      fecha_hasta: reportFechaHasta
    });

    // Agregar filtros opcionales si están seleccionados
    if (reportMaquinaSeleccionada && reportMaquinaSeleccionada.ppu_11) {
      params.append('patente', reportMaquinaSeleccionada.ppu_11);
    }
    if (reportTrabajadorSeleccionado) {
      params.append('id_trabajador', reportTrabajadorSeleccionado.idtrabajador_06.toString());
    }
    if (reportProducto) {
      params.append('id_producto', reportProducto);
    }

    return params;
  };

  const handleVistaPrevia = async () => {
    // Validar fechas requeridas
    if (!reportFechaDesde || !reportFechaHasta) {
      await showError('Validación', 'Las fechas desde y hasta son requeridas');
      return;
    }

    setPreviewLoading(true);
    try {
      const params = buildReportParams();
      const response = await fetch(`http://localhost:3001/api/asignaciones-productos-aseo/reporte/datos?${params.toString()}`);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setPreviewData(data.data);
        setShowPreview(true);
        setShowReportModal(false);
      } else {
        await showError('Error', data.error || 'Error al cargar la vista previa');
      }
    } catch (err) {
      await showError('Error', 'Error al cargar la vista previa');
      console.error('Error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerarReporte = async () => {
    if (!reportFechaDesde || !reportFechaHasta) {
      await showError('Validación', 'Las fechas desde y hasta son requeridas');
      return;
    }

    const params = buildReportParams();

    // Abrir el reporte en una nueva ventana para descargar
    const reportUrl = `http://localhost:3001/api/asignaciones-productos-aseo/reporte/pdf?${params.toString()}`;
    window.open(reportUrl, '_blank');

    // Cerrar el modal y vista previa
    setShowReportModal(false);
    setShowPreview(false);
  };

  // Filtrar máquinas y trabajadores para mostrar en las listas de selección
  const maquinasFiltradas = useMemo(() => {
    if (!buscarPatente || buscarPatente.trim() === '') return maquinas;
    const patenteLower = buscarPatente.toLowerCase();
    return maquinas.filter(m =>
      (m.ppu_11 && m.ppu_11.toLowerCase().includes(patenteLower)) ||
      (m.numinterno_11 && m.numinterno_11.toLowerCase().includes(patenteLower)) ||
      (m.descripcion_11 && m.descripcion_11.toLowerCase().includes(patenteLower))
    );
  }, [maquinas, buscarPatente]);

  const trabajadoresFiltrados = useMemo(() => {
    if (!buscarApellido || buscarApellido.trim() === '') {
      return trabajadores;
    }
    const busqueda = buscarApellido.trim();
    const apellidos = busqueda.split(/\s+/).map(a => a.toLowerCase());
    if (apellidos.length === 1) {
      const word = apellidos[0];
      const paternoMatch = trabajadores.filter(t =>
        t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(word)
      );
      const maternoMatch = trabajadores.filter(t =>
        t.amaterno_06 != null && t.amaterno_06.toLowerCase().startsWith(word) &&
        !paternoMatch.some(p => p.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paternoMatch, ...maternoMatch];
    }
    const [primer, segundo] = apellidos;
    return trabajadores
      .filter(t =>
        t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(primer) &&
        t.amaterno_06 != null && t.amaterno_06.toLowerCase().startsWith(segundo)
      )
      .sort((a, b) => {
        const cmpP = (a.apaterno_06 || '').localeCompare(b.apaterno_06 || '');
        return cmpP !== 0 ? cmpP : (a.amaterno_06 || '').localeCompare(b.amaterno_06 || '');
      });
  }, [trabajadores, buscarApellido]);

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🧼 Asignación de Productos de Aseo</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
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
          <button
            className="btn-primary"
            onClick={() => setShowReportModal(true)}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📊 Generar Reporte
          </button>
          <button
            className="btn-secondary"
            onClick={resetForm}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>Datos de la Asignación</h3>
          
          {/* Fila única: Buscar Patente | Seleccionar Máquina | Buscar Trabajador | Seleccionar Trabajador */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}
          >
            <div className="form-group">
              <label>Buscar Por Patente</label>
              <input
                type="text"
                value={buscarPatente}
                onChange={(e) => setBuscarPatente(e.target.value.toUpperCase())}
                placeholder="INGRESE PATENTE O NÚMERO INTERNO"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div className="form-group">
              <label>Seleccionar Máquina *</label>
              <div
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  padding: '10px'
                }}
              >
                {maquinasFiltradas.length > 0 ? (
                  maquinasFiltradas.map((maq) => (
                    <div
                      key={maq.idmaquina_11}
                      onClick={() => setMaquinaSeleccionada(maq)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor:
                          maquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? '#007bff' : 'transparent',
                        color: maquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? 'white' : 'black',
                        marginBottom: '5px',
                        borderRadius: '4px',
                        border:
                          maquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11
                            ? '2px solid #0056b3'
                            : '1px solid #ced4da'
                      }}
                    >
                      <strong>{maq.ppu_11 || 'N/A'}</strong> - {maq.numinterno_11 || 'N/A'}{' '}
                      {maq.descripcion_11 ? `(${maq.descripcion_11})` : ''}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#6c757d',
                      padding: '10px'
                    }}
                  >
                    {maquinas.length === 0 ? 'Cargando máquinas...' : 'No se encontraron máquinas con ese criterio'}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Buscar Trabajador Por Apellido</label>
              <input
                type="text"
                value={buscarApellido}
                onChange={(e) => setBuscarApellido(e.target.value.toUpperCase())}
                placeholder="EJ: GONZALEZ O GONZALEZ PEREZ"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  textTransform: 'uppercase'
                }}
              />
              <small style={{ color: '#6c757d', fontSize: '0.85em' }}>
                💡 Tip: Una palabra busca por apellido paterno primero, luego materno (empieza con). Dos
                palabras: paterno y materno en ese orden.
              </small>
            </div>

            <div className="form-group">
              <label>Seleccionar Trabajador *</label>
              <div
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
                      onClick={() => setTrabajadorSeleccionado(trab)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor:
                          trabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06
                            ? '#007bff'
                            : 'transparent',
                        color: trabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? 'white' : 'black',
                        marginBottom: '5px',
                        borderRadius: '4px',
                        border:
                          trabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06
                            ? '2px solid #0056b3'
                            : '1px solid #ced4da'
                      }}
                    >
                      <strong>{trab.apaterno_06 || ''} {trab.amaterno_06 || ''}</strong> {trab.nombre_06 || ''} -{' '}
                      <span style={{ fontSize: '0.9em', opacity: 0.8 }}>{trab.ruttrabajador_06 || ''}</span>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#6c757d',
                      padding: '10px'
                    }}
                  >
                    {trabajadores.length === 0
                      ? 'Cargando trabajadores...'
                      : 'No se encontraron trabajadores con ese criterio'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fila Inferior: Responsable, Fecha y Hora en 3 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Responsable *</label>
              <select
                value={idResponsable}
                onChange={(e) => setIdResponsable(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
              >
                <option value="">Seleccione un responsable</option>
                {responsables.length === 0 ? (
                  <option value="" disabled>Cargando responsables...</option>
                ) : (
                  responsables.map(resp => (
                    <option key={resp.idresponsableentrega_08} value={resp.idresponsableentrega_08}>
                      {resp.nombre_completo || 
                       `${resp.nombreresponsableentrega_08 || ''} ${resp.apaternoresponsableentrega_08 || ''} ${resp.amaternoresponsableentrega_08 || ''}`.trim()}
                    </option>
                  ))
                )}
              </select>
              {error && error.includes('responsable') && (
                <small style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>{error}</small>
              )}
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <div className="form-group">
              <label>Hora *</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>
          </div>

          {/* Botones dinámicos de productos */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Productos Disponibles</label>
            {productos.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#6c757d', 
                padding: '20px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa'
              }}>
                {loading ? 'Cargando productos...' : 'No hay productos disponibles. Verifique la conexión con el servidor.'}
              </div>
            ) : productos.filter(p => p.activo !== false).length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#6c757d', 
                padding: '20px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa'
              }}>
                No hay productos activos disponibles.
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                gap: '10px' 
              }}>
                {productos.filter(p => p.activo !== false).map(producto => (
                  <button
                    key={producto.id_producto}
                    type="button"
                    onClick={() => handleAgregarProducto(producto)}
                    className="btn-primary"
                    style={{
                      padding: '10px',
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      height: 'auto',
                      minHeight: '50px'
                    }}
                  >
                    {producto.nombre_producto}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de detalles */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Productos Asignados</label>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleProductos.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>
                        No hay productos asignados
                      </td>
                    </tr>
                  ) : (
                    detalleProductos.map((detalle) => {
                      const producto = productos.find(p => p.id_producto === detalle.id_producto);
                      return (
                        <tr key={detalle.id_producto}>
                          <td>{producto?.nombre_producto || detalle.producto_nombre || 'N/A'}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={detalle.cantidad}
                              onChange={(e) => handleCambiarCantidad(detalle.id_producto, parseInt(e.target.value) || 1)}
                              style={{ width: '80px', padding: '4px', textAlign: 'center' }}
                            />
                          </td>
                          <td className="actions">
                            <button
                              className="btn-delete"
                              onClick={() => handleEliminarDetalle(detalle.id_producto)}
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

      {/* Modal de Reporte */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="form-container" style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>📊 Generar Reporte de Entregas</h3>
            
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>Fecha Desde *</label>
                  <input
                    type="date"
                    value={reportFechaDesde}
                    onChange={(e) => setReportFechaDesde(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha Hasta *</label>
                  <input
                    type="date"
                    value={reportFechaHasta}
                    onChange={(e) => setReportFechaHasta(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>Buscar Por Patente</label>
                  <input
                    type="text"
                    value={reportBuscarPatente}
                    onChange={(e) => setReportBuscarPatente(e.target.value.toUpperCase())}
                    placeholder="Ingrese patente o número interno"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label>Buscar Trabajador Por Apellido</label>
                    <input
                      type="text"
                      value={reportBuscarTrabajador}
                      onChange={(e) => setReportBuscarTrabajador(e.target.value.toUpperCase())}
                      placeholder="Ej: GONZALEZ o GONZALEZ PEREZ"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase', fontSize: '14px' }}
                    />
                    <small style={{ color: '#6c757d', fontSize: '0.85em' }}>
                      💡 Tip: Una palabra busca por apellido paterno primero, luego materno (empieza con). Dos palabras: paterno y materno en ese orden.
                    </small>
                </div>
              </div>

              {/* Selección de Máquina para Reporte */}
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Seleccionar Máquina (opcional)</label>
                <div style={{ 
                  maxHeight: '120px', 
                  overflowY: 'auto', 
                  border: '1px solid #ced4da', 
                  borderRadius: '4px',
                  padding: '8px'
                }}>
                  {reportMaquinasFiltradas.length > 0 ? (
                    <>
                      <div
                        onClick={() => setReportMaquinaSeleccionada(null)}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: reportMaquinaSeleccionada === null ? '#007bff' : 'transparent',
                          color: reportMaquinaSeleccionada === null ? 'white' : 'black',
                          marginBottom: '5px',
                          borderRadius: '4px',
                          border: reportMaquinaSeleccionada === null ? '2px solid #0056b3' : '1px solid #ced4da',
                          fontSize: '14px',
                          fontWeight: reportMaquinaSeleccionada === null ? 'bold' : 'normal'
                        }}
                      >
                        TODAS
                      </div>
                      {reportMaquinasFiltradas.map(maq => (
                        <div
                          key={maq.idmaquina_11}
                          onClick={() => setReportMaquinaSeleccionada(maq)}
                          style={{
                            padding: '8px',
                            cursor: 'pointer',
                            backgroundColor: reportMaquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? '#007bff' : 'transparent',
                            color: reportMaquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? 'white' : 'black',
                            marginBottom: '5px',
                            borderRadius: '4px',
                            border: reportMaquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? '2px solid #0056b3' : '1px solid #ced4da',
                            fontSize: '14px'
                          }}
                        >
                          <strong>{maq.ppu_11 || 'N/A'}</strong> - {maq.numinterno_11 || 'N/A'} {maq.descripcion_11 ? `(${maq.descripcion_11})` : ''}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#6c757d', 
                      padding: '10px',
                      fontSize: '14px'
                    }}>
                      {maquinas.length === 0 ? 'Cargando máquinas...' : 'No se encontraron máquinas con ese criterio'}
                    </div>
                  )}
                </div>
              </div>

              {/* Selección de Trabajador para Reporte */}
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Seleccionar Trabajador (opcional)</label>
                <div style={{ 
                  maxHeight: '120px', 
                  overflowY: 'auto', 
                  border: '1px solid #ced4da', 
                  borderRadius: '4px',
                  padding: '8px'
                }}>
                  {reportTrabajadoresFiltrados.length > 0 ? (
                    <>
                      <div
                        onClick={() => setReportTrabajadorSeleccionado(null)}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: reportTrabajadorSeleccionado === null ? '#007bff' : 'transparent',
                          color: reportTrabajadorSeleccionado === null ? 'white' : 'black',
                          marginBottom: '5px',
                          borderRadius: '4px',
                          border: reportTrabajadorSeleccionado === null ? '2px solid #0056b3' : '1px solid #ced4da',
                          fontSize: '14px',
                          fontWeight: reportTrabajadorSeleccionado === null ? 'bold' : 'normal'
                        }}
                      >
                        TODOS
                      </div>
                      {reportTrabajadoresFiltrados.map(trab => (
                        <div
                          key={trab.idtrabajador_06}
                          onClick={() => setReportTrabajadorSeleccionado(trab)}
                          style={{
                            padding: '8px',
                            cursor: 'pointer',
                            backgroundColor: reportTrabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? '#007bff' : 'transparent',
                            color: reportTrabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? 'white' : 'black',
                            marginBottom: '5px',
                            borderRadius: '4px',
                            border: reportTrabajadorSeleccionado?.idtrabajador_06 === trab.idtrabajador_06 ? '2px solid #0056b3' : '1px solid #ced4da',
                            fontSize: '14px'
                          }}
                        >
                          <strong>{trab.apaterno_06 || ''} {trab.amaterno_06 || ''}</strong> {trab.nombre_06 || ''} - <span style={{ fontSize: '0.9em', opacity: 0.8 }}>{trab.ruttrabajador_06 || ''}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#6c757d', 
                      padding: '10px',
                      fontSize: '14px'
                    }}>
                      {trabajadores.length === 0 ? 'Cargando trabajadores...' : 'No se encontraron trabajadores con ese criterio'}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Insumo (Producto)</label>
                <select
                  value={reportProducto}
                  onChange={(e) => setReportProducto(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  <option value="">TODOS</option>
                  {productos.filter(p => p.activo !== false).map(producto => (
                    <option key={producto.id_producto} value={producto.id_producto.toString()}>
                      {producto.nombre_producto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleVistaPrevia}
                  disabled={previewLoading}
                  style={{ backgroundColor: '#17a2b8' }}
                >
                  {previewLoading ? 'Cargando...' : '👁️ Vista Previa'}
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleGenerarReporte}
                  style={{ backgroundColor: '#28a745' }}
                >
                  📥 Generar PDF
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleLimpiarFiltrosReporte}
                  style={{ backgroundColor: '#6c757d' }}
                >
                  🧹 Limpiar
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowReportModal(false);
                    handleLimpiarFiltrosReporte();
                  }}
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista Previa del Reporte */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Header de Vista Previa */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e0e0e0'
            }}>
              <div>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>📊 Vista Previa del Reporte</h2>
                <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                  Período: {reportFechaDesde} - {reportFechaHasta} | Total: {previewData.length} registros
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={handleGenerarReporte}
                  style={{ backgroundColor: '#28a745' }}
                >
                  📥 Generar PDF
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowPreview(false);
                    setShowReportModal(true);
                  }}
                >
                  ← Volver a Filtros
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData([]);
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Tabla de Vista Previa */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontFamily: 'Arial, sans-serif'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '80px', minWidth: '80px' }}>Fecha</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '70px', minWidth: '70px' }}>Hora</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '100px', minWidth: '100px' }}>Patente</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '200px', minWidth: '200px' }}>Responsable</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '200px', minWidth: '200px' }}>Trabajador</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '200px', minWidth: '200px' }}>Producto</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '80px', minWidth: '80px' }}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        No hay datos para mostrar
                      </td>
                    </tr>
                  ) : (
                    previewData.map((row, index) => {
                      const formatDate = (date: string) => {
                        if (!date) return 'N/A';
                        const d = new Date(date);
                        return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      };

                      const formatTime = (time: string) => {
                        if (!time) return 'N/A';
                        const parts = time.split(':');
                        if (parts.length >= 2) {
                          return `${parts[0]}:${parts[1]}`;
                        }
                        return time;
                      };

                      return (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                            {formatDate(row.fecha_12)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                            {formatTime(row.hora_12)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', fontWeight: 'bold' }}>
                            {row.ppu_11 || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                            {row.responsable || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                            {row.trabajador || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                            {row.productoaseo_10 || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>
                            {parseFloat(row.cantidad_13).toFixed(0)}
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

      {/* Buscador y información de paginación */}
      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            📅 Mostrando asignaciones de los últimos 3 días (Total: {processedAsignaciones.length})
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar asignación..."
          value={filtro}
          onChange={(e) => {
            setFiltro(e.target.value.toUpperCase());
            setPaginaActual(1); // Resetear a página 1 al buscar
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase' }}
        />
      </div>

      {/* Tabla de asignaciones */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_asignacion')} style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_asignacion')}
              </th>
              <th onClick={() => handleSort('maquina_ppu')} style={{ cursor: 'pointer' }}>
                Máquina {getSortIndicator('maquina_ppu')}
              </th>
              <th onClick={() => handleSort('trabajador_nombre')} style={{ cursor: 'pointer' }}>
                Trabajador {getSortIndicator('trabajador_nombre')}
              </th>
              <th onClick={() => handleSort('fecha')} style={{ cursor: 'pointer' }}>
                Fecha {getSortIndicator('fecha')}
              </th>
              <th onClick={() => handleSort('hora')} style={{ cursor: 'pointer' }}>
                Hora {getSortIndicator('hora')}
              </th>
              <th onClick={() => handleSort('responsable_nombre')} style={{ cursor: 'pointer' }}>
                Responsable {getSortIndicator('responsable_nombre')}
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && asignaciones.length === 0 ? (
              <tr><td colSpan={7}>Cargando...</td></tr>
            ) : asignacionesPaginadas.length === 0 ? (
              <tr><td colSpan={7}>No hay asignaciones registradas en este rango de fechas</td></tr>
            ) : (
              asignacionesPaginadas.map((asignacion) => (
                <tr 
                  key={asignacion.id_asignacion}
                  onClick={() => handleSeleccionarAsignacion(asignacion)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{asignacion.id_asignacion}</td>
                  <td>
                    <strong>{asignacion.maquina_ppu}</strong> - {asignacion.maquina_numinterno}
                    {asignacion.maquina_descripcion && ` (${asignacion.maquina_descripcion})`}
                  </td>
                  <td>{asignacion.trabajador_nombre || 'N/A'}</td>
                  <td>
                    {asignacion.fecha
                      ? new Date(asignacion.fecha).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : 'N/A'}
                  </td>
                  <td>{asignacion.hora || 'N/A'}</td>
                  <td>{asignacion.responsable_nombre || 'N/A'}</td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-delete"
                      onClick={() => handleEliminar(asignacion.id_asignacion)}
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

      {/* Controles de paginación */}
      {totalPaginas > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '10px', 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => handleCambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="btn-secondary"
            style={{
              padding: '8px 15px',
              cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
              opacity: paginaActual === 1 ? 0.5 : 1
            }}
          >
            ← Anterior
          </button>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(numPagina => (
              <button
                key={numPagina}
                onClick={() => handleCambiarPagina(numPagina)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: paginaActual === numPagina ? '#007bff' : 'white',
                  color: paginaActual === numPagina ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontWeight: paginaActual === numPagina ? 'bold' : 'normal'
                }}
              >
                {numPagina}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handleCambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="btn-secondary"
            style={{
              padding: '8px 15px',
              cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
              opacity: paginaActual === totalPaginas ? 0.5 : 1
            }}
          >
            Siguiente →
          </button>
          
          <div style={{ marginLeft: '15px', color: '#6c757d' }}>
            Página {paginaActual} de {totalPaginas}
          </div>
        </div>
      )}
    </div>
  );
};

export default AsignacionProductosAseoView;


