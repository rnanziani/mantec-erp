import React, { useState, useEffect, useMemo } from 'react';
import { showSuccess, showError, showDeleteConfirm, showWarning } from '../utils/swal';
import './BodegaView.css'; // Reutilizamos los mismos estilos que TipoTransaccionView

interface Transaccion {
  id_transaccion_28: number;
  id_alternador_28: number;
  id_ubicacion_origen_28: number;
  id_ubicacion_destino_28: number;
  id_tipo_transaccion_28: number;
  id_tecnico_28?: number;
  id_maquina_28?: number;
  fecha_28: string;
  hora_28: string;
  created_at: string;
  updated_at: string;
  cod_alternador_19?: string;
  marca_18?: string;
  ubicacion_origen_descripcion?: string;
  ubicacion_destino_descripcion?: string;
  tipo_descripcion?: string;
  tipo_codigo?: string;
  valor_accion?: -1 | 0 | 1;
  tecnico_nombre?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  tipo_comp_descripcion?: string;
}

interface Alternador {
  id_alternador_19: number;
  cod_alternador_19: string;
  marca_18?: string;
}

interface Ubicacion {
  id_ubicacion_27: number;
  descripcion_27: string;
}

interface TipoTransaccion {
  id_tipo_transaccion_25: number;
  descripcion_25: string;
  cod_accion_25: string;
  valor_accion_25: -1 | 0 | 1;
}

interface Tecnico {
  id_tecnico_21: number;
  rut_21: string;
  nombres_21: string;
  a_paterno_21: string;
  a_materno_21: string;
  nombre_cargo?: string;
}

interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
  descripcion_11: string;
}

interface Marca {
  id_marca_18: number;
  marca_18: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Transaccion;
  direction: 'asc' | 'desc';
};

const TransaccionView: React.FC = () => {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [alternadores, setAlternadores] = useState<Alternador[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [tiposTransaccion, setTiposTransaccion] = useState<TipoTransaccion[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tiposComp, setTiposComp] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Formulario
  const [showForm, setShowForm] = useState<boolean>(false);
  const [idAlternador, setIdAlternador] = useState<string>('');
  const [idUbicacionOrigen, setIdUbicacionOrigen] = useState<string>('');
  const [idUbicacionDestino, setIdUbicacionDestino] = useState<string>('');
  const [idTipoTransaccion, setIdTipoTransaccion] = useState<string>('');
  const [idTecnico, setIdTecnico] = useState<string>('');
  const [idMaquina, setIdMaquina] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState<string>(new Date().toTimeString().split(' ')[0].substring(0, 5));
  
  // Búsqueda para alternadores y máquinas
  const [buscarAlternador, setBuscarAlternador] = useState<string>('');
  const [buscarMaquina, setBuscarMaquina] = useState<string>('');
  const [alternadorSeleccionado, setAlternadorSeleccionado] = useState<Alternador | null>(null);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState<Maquina | null>(null);

  // Estados para el modal de reporte
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<Transaccion[]>([]);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [reportFechaDesde, setReportFechaDesde] = useState<string>('');
  const [reportFechaHasta, setReportFechaHasta] = useState<string>('');
  const [reportIdTipoTransaccion, setReportIdTipoTransaccion] = useState<string>('');
  const [reportIdMarca, setReportIdMarca] = useState<string>('');
  const [reportIdDestino, setReportIdDestino] = useState<string>('');
  const [reportIdMaquina, setReportIdMaquina] = useState<string>('');
  const [reportIdAlternador, setReportIdAlternador] = useState<string>('');

  // Estados para el modal de reporte de cantidad de componentes
  const [showCantComponentesModal, setShowCantComponentesModal] = useState<boolean>(false);
  const [cantCompFechaDesde, setCantCompFechaDesde] = useState<string>('');
  const [cantCompFechaHasta, setCantCompFechaHasta] = useState<string>('');
  const [cantCompIdTipoTransaccion, setCantCompIdTipoTransaccion] = useState<string>('');
  const [cantCompIdMarca, setCantCompIdMarca] = useState<string>('');
  const [cantCompIdDestino, setCantCompIdDestino] = useState<string>('');
  const [cantCompIdMaquina, setCantCompIdMaquina] = useState<string>('');
  const [cantCompIdTipoComp, setCantCompIdTipoComp] = useState<string>('');
  const [cantCompIdAlternador, setCantCompIdAlternador] = useState<string>('');

  // Búsqueda y ordenamiento (igual que TipoTransaccionView)
  const [filtro, setFiltro] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaccion; direction: 'asc' | 'desc' } | null>(null);

  const API_URL = 'http://localhost:3001/api/transacciones';
  const ALTERNADORES_URL = 'http://localhost:3001/api/alternadores';
  const UBICACIONES_URL = 'http://localhost:3001/api/bodegas';
  const TIPOS_URL = 'http://localhost:3001/api/tipos-transaccion';
  const TECNICOS_URL = 'http://localhost:3001/api/tecnicos';
  const MAQUINAS_URL = 'http://localhost:3001/api/maquinas';
  const MARCAS_URL = 'http://localhost:3001/api/marcas';
  const TIPOS_COMP_URL = 'http://localhost:3001/api/tipos-comp-alternador';

  useEffect(() => {
    fetchTransacciones();
    fetchAlternadores();
    fetchUbicaciones();
    fetchTiposTransaccion();
    fetchTecnicos();
    fetchMaquinas();
    fetchMarcas();
    fetchTiposComp();
  }, []);

  const fetchTransacciones = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTransacciones(data.data);
      } else {
        setError('Error al cargar las transacciones');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternadores = async () => {
    try {
      const response = await fetch(ALTERNADORES_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAlternadores(data.data);
      }
    } catch (err) {
      console.error('Error al cargar alternadores:', err);
    }
  };

  const fetchUbicaciones = async () => {
    try {
      const response = await fetch(UBICACIONES_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setUbicaciones(data.data);
      }
    } catch (err) {
      console.error('Error al cargar ubicaciones:', err);
    }
  };

  const fetchTiposTransaccion = async () => {
    try {
      const response = await fetch(TIPOS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTiposTransaccion(data.data);
      }
    } catch (err) {
      console.error('Error al cargar tipos de transacción:', err);
    }
  };

  const fetchTecnicos = async () => {
    try {
      const response = await fetch(TECNICOS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTecnicos(data.data);
      }
    } catch (err) {
      console.error('Error al cargar técnicos:', err);
    }
  };

  const fetchMaquinas = async () => {
    try {
      const response = await fetch(MAQUINAS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMaquinas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar máquinas:', err);
    }
  };

  const fetchMarcas = async () => {
    try {
      const response = await fetch(MARCAS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar marcas:', err);
    }
  };

  const fetchTiposComp = async () => {
    try {
      const response = await fetch(TIPOS_COMP_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTiposComp(data.data);
      }
    } catch (err) {
      console.error('Error al cargar tipos de componente:', err);
    }
  };

  // Lógica de Filtrado y Ordenamiento Combinada (igual que TipoTransaccionView)
  const processedTransacciones = useMemo(() => {
    let data = [...transacciones];

    // 1. Filtrar
    if (filtro) {
      const lowerFiltro = filtro.toLowerCase();
      data = data.filter(t =>
        t.cod_alternador_19?.toLowerCase().includes(lowerFiltro) ||
        t.marca_18?.toLowerCase().includes(lowerFiltro) ||
        t.ubicacion_origen_descripcion?.toLowerCase().includes(lowerFiltro) ||
        t.ubicacion_destino_descripcion?.toLowerCase().includes(lowerFiltro) ||
        t.tipo_descripcion?.toLowerCase().includes(lowerFiltro) ||
        t.tipo_codigo?.toLowerCase().includes(lowerFiltro) ||
        t.tecnico_nombre?.toLowerCase().includes(lowerFiltro) ||
        t.maquina_numinterno?.toLowerCase().includes(lowerFiltro) ||
        t.maquina_ppu?.toLowerCase().includes(lowerFiltro) ||
        t.id_transaccion_28.toString().includes(filtro)
      );
    }

    // 2. Ordenar
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
    }

    return data;
  }, [transacciones, filtro, sortConfig]);

  // Lógica de Ordenamiento (igual que TipoTransaccionView)
  const handleSort = (key: keyof Transaccion) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Transaccion) => {
    if (!sortConfig || sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idAlternador || !idUbicacionOrigen || !idUbicacionDestino || !idTipoTransaccion) {
      await showError('Validación', 'Todos los campos marcados con * son requeridos');
      return;
    }

    if (!alternadorSeleccionado) {
      await showError('Validación', 'Por favor seleccione un alternador de la lista');
      return;
    }

    if (idUbicacionOrigen === idUbicacionDestino) {
      await showError('Validación', 'La ubicación de origen y destino deben ser diferentes');
      return;
    }

    setLoading(true);

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alternador_28: parseInt(idAlternador),
          id_ubicacion_origen_28: parseInt(idUbicacionOrigen),
          id_ubicacion_destino_28: parseInt(idUbicacionDestino),
          id_tipo_transaccion_28: parseInt(idTipoTransaccion),
          id_tecnico_28: idTecnico ? parseInt(idTecnico) : undefined,
          id_maquina_28: idMaquina ? parseInt(idMaquina) : undefined,
          fecha_28: fecha || undefined,
          hora_28: hora || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await showSuccess('¡Éxito!', data.message || 'Transacción creada exitosamente');
        await fetchTransacciones();
        resetForm();
      } else {
        const mensaje = [data.error, data.message].filter(Boolean).join(': ') || 'Error al crear la transacción';
        await showError('Error', mensaje);
      }
    } catch (err) {
      await showError('Error', 'Error al crear la transacción');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta transacción');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await showSuccess('¡Eliminado!', data.message || 'Transacción eliminada exitosamente');
        await fetchTransacciones();
      } else {
        await showError('Error', data.error || 'Error al eliminar la transacción');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar la transacción');
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setIdAlternador('');
    setIdUbicacionOrigen('');
    setIdUbicacionDestino('');
    setIdTipoTransaccion('');
    setIdTecnico('');
    setIdMaquina('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setBuscarAlternador('');
    setBuscarMaquina('');
    setAlternadorSeleccionado(null);
    setMaquinaSeleccionada(null);
    setShowForm(false);
    setError('');
  };

  // Filtrar alternadores y máquinas para mostrar en las listas de selección
  const alternadoresFiltrados = useMemo(() => {
    if (!buscarAlternador || buscarAlternador.trim() === '') return alternadores;
    const busquedaLower = buscarAlternador.toLowerCase();
    return alternadores.filter(alt =>
      (alt.cod_alternador_19 && alt.cod_alternador_19.toLowerCase().includes(busquedaLower)) ||
      (alt.marca_18 && alt.marca_18.toLowerCase().includes(busquedaLower))
    );
  }, [alternadores, buscarAlternador]);

  const maquinasFiltradas = useMemo(() => {
    if (!buscarMaquina || buscarMaquina.trim() === '') return maquinas;
    const busquedaLower = buscarMaquina.toLowerCase();
    return maquinas.filter(maq =>
      (maq.ppu_11 && maq.ppu_11.toLowerCase().includes(busquedaLower)) ||
      (maq.numinterno_11 && maq.numinterno_11.toLowerCase().includes(busquedaLower)) ||
      (maq.descripcion_11 && maq.descripcion_11.toLowerCase().includes(busquedaLower))
    );
  }, [maquinas, buscarMaquina]);

  const getValorAccionIcon = (valor?: -1 | 0 | 1) => {
    if (valor === 1) return '📈 +1';
    if (valor === -1) return '📉 -1';
    return '➖ 0';
  };

  const handleVistaPrevia = async () => {
    // Validar fechas requeridas
    if (!reportFechaDesde || !reportFechaHasta) {
      await showError('Validación', 'Las fechas desde y hasta son requeridas');
      return;
    }

    setPreviewLoading(true);
    try {
      // Construir URL con parámetros
      const params = new URLSearchParams({
        fecha_desde: reportFechaDesde,
        fecha_hasta: reportFechaHasta
      });

      // Agregar filtros opcionales si están seleccionados
      if (reportIdTipoTransaccion) {
        params.append('id_tipo_transaccion', reportIdTipoTransaccion);
      }
      if (reportIdMarca) {
        params.append('id_marca', reportIdMarca);
      }
      if (reportIdDestino) {
        params.append('id_destino', reportIdDestino);
      }
      if (reportIdMaquina) {
        params.append('id_maquina', reportIdMaquina);
      }
      if (reportIdAlternador) {
        params.append('id_alternador', reportIdAlternador);
      }

      const response = await fetch(`http://localhost:3001/api/transacciones/filtradas?${params.toString()}`);
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
    // Validar fechas requeridas
    if (!reportFechaDesde || !reportFechaHasta) {
      await showError('Validación', 'Las fechas desde y hasta son requeridas');
      return;
    }

    // Construir URL con parámetros
    const params = new URLSearchParams({
      fecha_desde: reportFechaDesde,
      fecha_hasta: reportFechaHasta
    });

    // Agregar filtros opcionales si están seleccionados
    if (reportIdTipoTransaccion) {
      params.append('id_tipo_transaccion', reportIdTipoTransaccion);
    }
    if (reportIdMarca) {
      params.append('id_marca', reportIdMarca);
    }
    if (reportIdDestino) {
      params.append('id_destino', reportIdDestino);
    }
    if (reportIdMaquina) {
      params.append('id_maquina', reportIdMaquina);
    }
    if (reportIdAlternador) {
      params.append('id_alternador', reportIdAlternador);
    }

    // Abrir el reporte en una nueva ventana para descargar
    const reportUrl = `http://localhost:3001/api/transacciones/reporte/pdf?${params.toString()}`;
    window.open(reportUrl, '_blank');

    // Cerrar el modal y vista previa
    setShowReportModal(false);
    setShowPreview(false);
    
    // Resetear filtros
    setReportFechaDesde('');
    setReportFechaHasta('');
    setReportIdTipoTransaccion('');
    setReportIdMarca('');
    setReportIdDestino('');
    setReportIdMaquina('');
    setReportIdAlternador('');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📝 Movimientos de Inventario - Transacciones</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            style={{ backgroundColor: showForm ? '#6c757d' : '#007bff' }}
          >
            {showForm ? '✕ Cancelar' : '+ Nueva Transacción'}
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowReportModal(true)}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📊 Generar Reporte
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowCantComponentesModal(true)}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📦 Cant de componentes
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>Nueva Transacción</h3>
          <form onSubmit={handleCreate}>
            {/* Primera fila: Búsqueda de Alternador y Selección de Alternador */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Buscar Alternador</label>
                <input
                  type="text"
                  value={buscarAlternador}
                  onChange={(e) => setBuscarAlternador(e.target.value.toUpperCase())}
                  placeholder="INGRESE CÓDIGO O MARCA"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase', fontSize: '14px' }}
                />
                <small style={{ color: '#007bff', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  💡 Tip: Busque por código de alternador o marca
                </small>
              </div>

              <div className="form-group">
                <label>Seleccionar Alternador *</label>
                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: '1px solid #ced4da', 
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  {alternadoresFiltrados.length > 0 ? (
                    alternadoresFiltrados.map(alt => (
                      <div
                        key={alt.id_alternador_19}
                        onClick={() => {
                          setAlternadorSeleccionado(alt);
                          setIdAlternador(alt.id_alternador_19.toString());
                        }}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: alternadorSeleccionado?.id_alternador_19 === alt.id_alternador_19 ? '#007bff' : 'transparent',
                          color: alternadorSeleccionado?.id_alternador_19 === alt.id_alternador_19 ? 'white' : 'black',
                          marginBottom: '5px',
                          borderRadius: '4px',
                          border: alternadorSeleccionado?.id_alternador_19 === alt.id_alternador_19 ? '2px solid #0056b3' : '1px solid #ced4da',
                          fontSize: '14px'
                        }}
                      >
                        <strong>{alt.cod_alternador_19 || 'N/A'}</strong> - {alt.marca_18 || 'N/A'}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#6c757d', 
                      padding: '10px',
                      fontSize: '14px'
                    }}>
                      {alternadores.length === 0 ? 'Cargando alternadores...' : 'No se encontraron alternadores con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Segunda fila: Ubicación Origen, Ubicación Destino y Tipo de Transacción */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Ubicación Origen *</label>
                <select
                  value={idUbicacionOrigen}
                  onChange={(e) => setIdUbicacionOrigen(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  <option value="">Seleccione ubicación origen</option>
                  {ubicaciones.map(ubic => (
                    <option key={ubic.id_ubicacion_27} value={ubic.id_ubicacion_27}>
                      {ubic.descripcion_27}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ubicación Destino *</label>
                <select
                  value={idUbicacionDestino}
                  onChange={(e) => setIdUbicacionDestino(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  <option value="">Seleccione ubicación destino</option>
                  {ubicaciones.map(ubic => (
                    <option key={ubic.id_ubicacion_27} value={ubic.id_ubicacion_27}>
                      {ubic.descripcion_27}
                    </option>
                  ))}
                </select>
            </div>

              <div className="form-group">
                <label>Tipo de Transacción *</label>
                <select
                  value={idTipoTransaccion}
                  onChange={(e) => setIdTipoTransaccion(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposTransaccion.map(tipo => (
                    <option key={tipo.id_tipo_transaccion_25} value={tipo.id_tipo_transaccion_25}>
                      {tipo.cod_accion_25} - {tipo.descripcion_25} ({getValorAccionIcon(tipo.valor_accion_25)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tercera fila: Técnico, Fecha y Hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Técnico</label>
                <select
                  value={idTecnico}
                  onChange={(e) => setIdTecnico(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                >
                  <option value="">Seleccione un técnico (opcional)</option>
                  {tecnicos.map(tec => (
                    <option key={tec.id_tecnico_21} value={tec.id_tecnico_21}>
                      {tec.nombres_21} {tec.a_paterno_21} {tec.a_materno_21} {tec.nombre_cargo ? `- ${tec.nombre_cargo}` : ''}
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

            {/* Cuarta fila: Búsqueda de Máquina y Selección de Máquina */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Buscar Máquina</label>
                <input
                  type="text"
                  value={buscarMaquina}
                  onChange={(e) => setBuscarMaquina(e.target.value.toUpperCase())}
                  placeholder="INGRESE PATENTE, NÚMERO INTERNO O DESCRIPCIÓN"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase', fontSize: '14px' }}
                />
                <small style={{ color: '#007bff', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  💡 Tip: Busque por patente, número interno o descripción
                </small>
            </div>

              <div className="form-group">
              <label>Seleccionar Máquina (opcional)</label>
              <div style={{ 
                  maxHeight: '150px', 
                overflowY: 'auto', 
                border: '1px solid #ced4da', 
                borderRadius: '4px',
                  padding: '10px'
              }}>
                {maquinasFiltradas.length > 0 ? (
                  maquinasFiltradas.map(maq => (
                    <div
                      key={maq.idmaquina_11}
                      onClick={() => {
                        setMaquinaSeleccionada(maq);
                        setIdMaquina(maq.idmaquina_11.toString());
                      }}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: maquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? '#007bff' : 'transparent',
                        color: maquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? 'white' : 'black',
                        marginBottom: '5px',
                        borderRadius: '4px',
                        border: maquinaSeleccionada?.idmaquina_11 === maq.idmaquina_11 ? '2px solid #0056b3' : '1px solid #ced4da',
                        fontSize: '14px'
                      }}
                    >
                      <strong>{maq.ppu_11 || 'N/A'}</strong> - {maq.numinterno_11 || 'N/A'} {maq.descripcion_11 ? `(${maq.descripcion_11})` : ''}
                    </div>
                  ))
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
            </div>

            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ backgroundColor: '#28a745' }}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm} style={{ backgroundColor: '#6c757d' }}>
                Cancelar
              </button>
            </div>
          </form>
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
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>📊 Generar Reporte de Transacciones</h3>
            
            <div>
              <div className="form-group">
                <label>Fecha Desde *</label>
                <input
                  type="date"
                  value={reportFechaDesde}
                  onChange={(e) => setReportFechaDesde(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div className="form-group">
                <label>Fecha Hasta *</label>
                <input
                  type="date"
                  value={reportFechaHasta}
                  onChange={(e) => setReportFechaHasta(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div className="form-group">
                <label>Tipo de Transacción</label>
                <select
                  value={reportIdTipoTransaccion}
                  onChange={(e) => setReportIdTipoTransaccion(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los tipos</option>
                  {tiposTransaccion.map(tipo => (
                    <option key={tipo.id_tipo_transaccion_25} value={tipo.id_tipo_transaccion_25}>
                      {tipo.cod_accion_25} - {tipo.descripcion_25}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Marca</label>
                <select
                  value={reportIdMarca}
                  onChange={(e) => setReportIdMarca(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todas las marcas</option>
                  {marcas.map(marca => (
                    <option key={marca.id_marca_18} value={marca.id_marca_18}>
                      {marca.marca_18}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Destino (Ubicación)</label>
                <select
                  value={reportIdDestino}
                  onChange={(e) => setReportIdDestino(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los destinos</option>
                  {ubicaciones.map(ubic => (
                    <option key={ubic.id_ubicacion_27} value={ubic.id_ubicacion_27}>
                      {ubic.descripcion_27}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Máquina</label>
                <select
                  value={reportIdMaquina}
                  onChange={(e) => setReportIdMaquina(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todas las máquinas</option>
                  {maquinas.map(maq => (
                    <option key={maq.idmaquina_11} value={maq.idmaquina_11}>
                      {maq.numinterno_11} - {maq.ppu_11}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Código de alternador (componente)</label>
                <select
                  value={reportIdAlternador}
                  onChange={(e) => setReportIdAlternador(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los componentes</option>
                  {alternadores.map(alt => (
                    <option key={alt.id_alternador_19} value={alt.id_alternador_19}>
                      {alt.cod_alternador_19} - {alt.marca_18 || 'Sin marca'}
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
                  className="btn-secondary" 
                  onClick={() => {
                    setShowReportModal(false);
                    setShowPreview(false);
                    setReportFechaDesde('');
                    setReportFechaHasta('');
                    setReportIdTipoTransaccion('');
                    setReportIdMarca('');
                    setReportIdDestino('');
                    setReportIdMaquina('');
                    setReportIdAlternador('');
                    setPreviewData([]);
                  }}
                >
                  Cancelar
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
                  Período: {reportFechaDesde} - {reportFechaHasta} | Total: {previewData.length} transacciones
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
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '50px', minWidth: '50px' }}>ID</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '60px', minWidth: '60px' }}>Fecha</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '60px', minWidth: '60px' }}>Hora</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '60px', minWidth: '60px' }}>Alternador</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '80px', minWidth: '80px' }}>Marca</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '90px', minWidth: '90px' }}>Origen</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '90px', minWidth: '90px' }}>Destino</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '150px', minWidth: '150px' }}>Tipo</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '140px', minWidth: '140px' }}>Técnico</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '120px', minWidth: '120px' }}>Máquina</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '150px', minWidth: '150px' }}>Tipo Componente</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        No hay transacciones para mostrar
                      </td>
                    </tr>
                  ) : (
                    previewData.map((t, index) => {
                      return (
                        <tr key={t.id_transaccion_28} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', width: '50px' }}>{t.id_transaccion_28}</td>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', width: '90px' }}>
                            {t.fecha_28
                              ? new Date(t.fecha_28).toLocaleDateString('es-CL', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })
                              : 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', width: '70px' }}>{t.hora_28 || 'N/A'}</td>
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', fontWeight: 'bold', width: '80px' }}>
                            {t.cod_alternador_19 || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '100px' }}>{t.marca_18 || 'N/A'}</td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '120px' }}>{t.ubicacion_origen_descripcion || 'N/A'}</td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '120px' }}>{t.ubicacion_destino_descripcion || 'N/A'}</td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '180px' }}>
                            {t.tipo_codigo || 'N/A'} - {t.tipo_descripcion || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '150px' }}>{t.tecnico_nombre || 'N/A'}</td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '130px' }}>
                            {t.maquina_numinterno || 'N/A'}
                            {t.maquina_ppu && ` (${t.maquina_ppu})`}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '150px' }}>{t.tipo_comp_descripcion || 'N/A'}</td>
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

      {/* Buscador */}
      <div className="form-container" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar transacción..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_transaccion_28')} style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_transaccion_28')}
              </th>
              <th onClick={() => handleSort('fecha_28')} style={{ cursor: 'pointer' }}>
                Fecha {getSortIndicator('fecha_28')}
              </th>
              <th onClick={() => handleSort('hora_28')} style={{ cursor: 'pointer' }}>
                Hora {getSortIndicator('hora_28')}
              </th>
              <th onClick={() => handleSort('cod_alternador_19')} style={{ cursor: 'pointer' }}>
                Alternador {getSortIndicator('cod_alternador_19')}
              </th>
              <th onClick={() => handleSort('marca_18')} style={{ cursor: 'pointer' }}>
                Marca {getSortIndicator('marca_18')}
              </th>
              <th onClick={() => handleSort('ubicacion_origen_descripcion')} style={{ cursor: 'pointer' }}>
                Origen {getSortIndicator('ubicacion_origen_descripcion')}
              </th>
              <th onClick={() => handleSort('ubicacion_destino_descripcion')} style={{ cursor: 'pointer' }}>
                Destino {getSortIndicator('ubicacion_destino_descripcion')}
              </th>
              <th onClick={() => handleSort('tipo_descripcion')} style={{ cursor: 'pointer' }}>
                Tipo {getSortIndicator('tipo_descripcion')}
              </th>
              <th onClick={() => handleSort('tecnico_nombre')} style={{ cursor: 'pointer' }}>
                Técnico {getSortIndicator('tecnico_nombre')}
              </th>
              <th onClick={() => handleSort('maquina_numinterno')} style={{ cursor: 'pointer' }}>
                Máquina {getSortIndicator('maquina_numinterno')}
              </th>
              <th onClick={() => handleSort('tipo_comp_descripcion')} style={{ cursor: 'pointer' }}>
                Tipo Componente {getSortIndicator('tipo_comp_descripcion')}
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && transacciones.length === 0 ? (
              <tr><td colSpan={12}>Cargando...</td></tr>
            ) : processedTransacciones.length === 0 ? (
              <tr><td colSpan={11}>No hay transacciones registradas</td></tr>
            ) : (
              processedTransacciones.map((transaccion) => (
                <tr key={transaccion.id_transaccion_28}>
                  <td>{transaccion.id_transaccion_28}</td>
                  <td>
                    {transaccion.fecha_28
                      ? new Date(transaccion.fecha_28).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : 'N/A'}
                  </td>
                  <td>{transaccion.hora_28 || 'N/A'}</td>
                  <td><strong>{transaccion.cod_alternador_19 || 'N/A'}</strong></td>
                  <td>{transaccion.marca_18 || 'N/A'}</td>
                  <td>{transaccion.ubicacion_origen_descripcion || 'N/A'}</td>
                  <td>{transaccion.ubicacion_destino_descripcion || 'N/A'}</td>
                  <td>{transaccion.tipo_codigo || 'N/A'} - {transaccion.tipo_descripcion || 'N/A'}</td>
                  <td>{transaccion.tecnico_nombre || 'N/A'}</td>
                  <td>
                    {transaccion.maquina_numinterno || 'N/A'}
                    {transaccion.maquina_ppu && ` (${transaccion.maquina_ppu})`}
                  </td>
                  <td>{transaccion.tipo_comp_descripcion || 'N/A'}</td>
                  <td className="actions">
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(transaccion.id_transaccion_28)}
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

      {/* Modal de Reporte de Cantidad de Componentes */}
      {showCantComponentesModal && (
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
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>📦 Cantidad de componentes</h3>
            
            <div>
              <div className="form-group">
                <label>Fecha Desde *</label>
                <input
                  type="date"
                  value={cantCompFechaDesde}
                  onChange={(e) => setCantCompFechaDesde(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div className="form-group">
                <label>Fecha Hasta *</label>
                <input
                  type="date"
                  value={cantCompFechaHasta}
                  onChange={(e) => setCantCompFechaHasta(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div className="form-group">
                <label>Tipo de Transacción</label>
                <select
                  value={cantCompIdTipoTransaccion}
                  onChange={(e) => setCantCompIdTipoTransaccion(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los tipos</option>
                  {tiposTransaccion.map(tipo => (
                    <option key={tipo.id_tipo_transaccion_25} value={tipo.id_tipo_transaccion_25}>
                      {tipo.cod_accion_25} - {tipo.descripcion_25}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Marca</label>
                <select
                  value={cantCompIdMarca}
                  onChange={(e) => setCantCompIdMarca(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todas las marcas</option>
                  {marcas.map(marca => (
                    <option key={marca.id_marca_18} value={marca.id_marca_18}>
                      {marca.marca_18}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Destino (Ubicación)</label>
                <select
                  value={cantCompIdDestino}
                  onChange={(e) => setCantCompIdDestino(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los destinos</option>
                  {ubicaciones.map(ubic => (
                    <option key={ubic.id_ubicacion_27} value={ubic.id_ubicacion_27}>
                      {ubic.descripcion_27}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Máquina</label>
                <select
                  value={cantCompIdMaquina}
                  onChange={(e) => setCantCompIdMaquina(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todas las máquinas</option>
                  {maquinas.map(maq => (
                    <option key={maq.idmaquina_11} value={maq.idmaquina_11}>
                      {maq.numinterno_11} - {maq.ppu_11}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Componente</label>
                <select
                  value={cantCompIdTipoComp}
                  onChange={(e) => setCantCompIdTipoComp(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los tipos</option>
                  {tiposComp.map(tipo => (
                    <option key={tipo.id_tipo_comp_alternador_32} value={tipo.id_tipo_comp_alternador_32}>
                      {tipo.tipo_comp_alternador_32}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Componente (código de alternador)</label>
                <select
                  value={cantCompIdAlternador}
                  onChange={(e) => setCantCompIdAlternador(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Todos los componentes</option>
                  {alternadores.map(alt => (
                    <option key={alt.id_alternador_19} value={alt.id_alternador_19}>
                      {alt.cod_alternador_19} - {alt.marca_18 || 'Sin marca'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={async () => {
                    // Validar fechas requeridas
                    if (!cantCompFechaDesde || !cantCompFechaHasta) {
                      await showError('Validación', 'Las fechas desde y hasta son requeridas');
                      return;
                    }

                    // Construir URL con parámetros
                    const params = new URLSearchParams({
                      fecha_desde: cantCompFechaDesde,
                      fecha_hasta: cantCompFechaHasta
                    });

                    // Agregar filtros opcionales si están seleccionados
                    if (cantCompIdTipoTransaccion) {
                      params.append('id_tipo_transaccion', cantCompIdTipoTransaccion);
                    }
                    if (cantCompIdMarca) {
                      params.append('id_marca', cantCompIdMarca);
                    }
                    if (cantCompIdDestino) {
                      params.append('id_destino', cantCompIdDestino);
                    }
                    if (cantCompIdMaquina) {
                      params.append('id_maquina', cantCompIdMaquina);
                    }
                    if (cantCompIdTipoComp) {
                      params.append('id_tipo_comp_alternador', cantCompIdTipoComp);
                    }
                    if (cantCompIdAlternador) {
                      params.append('id_alternador', cantCompIdAlternador);
                    }

                    // Abrir el reporte en una nueva ventana para descargar
                    const reportUrl = `http://localhost:3001/api/transacciones/reporte-cantidad-componentes/pdf?${params.toString()}`;
                    window.open(reportUrl, '_blank');

                    // Cerrar el modal
                    setShowCantComponentesModal(false);
                    
                    // Resetear filtros
                    setCantCompFechaDesde('');
                    setCantCompFechaHasta('');
                    setCantCompIdTipoTransaccion('');
                    setCantCompIdMarca('');
                    setCantCompIdDestino('');
                    setCantCompIdMaquina('');
                    setCantCompIdTipoComp('');
                    setCantCompIdAlternador('');
                  }}
                  style={{ backgroundColor: '#28a745' }}
                >
                  📥 Generar PDF
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowCantComponentesModal(false);
                    setCantCompFechaDesde('');
                    setCantCompFechaHasta('');
                    setCantCompIdTipoTransaccion('');
                    setCantCompIdMarca('');
                    setCantCompIdDestino('');
                    setCantCompIdMaquina('');
                    setCantCompIdTipoComp('');
                    setCantCompIdAlternador('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransaccionView;


