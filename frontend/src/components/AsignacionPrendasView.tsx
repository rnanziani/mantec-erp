import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './BodegaView.css'; // Reutilizamos los mismos estilos

interface AsignacionPrenda {
  idasignacionmain_09: number;
  idtrabajador_09: number;
  fecha_09: string;
  hora_09: string;
  idresponsableentrega_09: number;
  trabajador_nombre?: string;
  responsable_nombre?: string;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Formulario Maestro
  const [showForm, setShowForm] = useState<boolean>(false);
  const [idAsignacionSeleccionada, setIdAsignacionSeleccionada] = useState<number | null>(null);
  const [buscarApellido, setBuscarApellido] = useState<string>('');
  const [idResponsable, setIdResponsable] = useState<string>('');
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

  // Búsqueda y ordenamiento
  const [filtro, setFiltro] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const registrosPorPagina = 10;

  const API_URL = 'http://localhost:3001/api/asignaciones-prendas';
  const TRABAJADORES_URL = 'http://localhost:3001/api/trabajadores';
  const RESPONSABLES_URL = 'http://localhost:3001/api/responsables-entrega';

  useEffect(() => {
    fetchAsignaciones();
    fetchPrendas();
    fetchTallas();
    fetchTrabajadores();
    fetchResponsables();
  }, [fetchAsignaciones, fetchPrendas, fetchTallas, fetchTrabajadores, fetchResponsables]);

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
      alert('Todos los campos son requeridos');
      return;
    }

    if (detallePrendas.length === 0) {
      alert('Debe agregar al menos una prenda');
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
        alert(data.message || 'Asignación guardada exitosamente');
        await fetchAsignaciones();
        resetForm();
      } else {
        alert(data.error || 'Error al guardar la asignación');
      }
    } catch (err) {
      alert('Error al guardar la asignación');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta asignación? Se eliminarán también todos sus detalles.')) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        alert(data.message || 'Asignación eliminada exitosamente');
        await fetchAsignaciones();
        resetForm();
      } else {
        alert(data.error || 'Error al eliminar la asignación');
      }
    } catch (err) {
      alert('Error al eliminar la asignación');
      console.error('Error:', err);
    }
  };

  const handleAgregarPrenda = () => {
    if (!prendaSeleccionada || !tallaSeleccionada || cantidad < 1) {
      alert('Debe seleccionar una prenda, talla y cantidad válida');
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
            className="btn-secondary"
            onClick={resetForm}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="form-container" style={{ background: '#FEE2E2', color: '#991B1B', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>Datos de la Asignación</h3>
          
          {/* Primera fila: Búsqueda de trabajador y responsable */}
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
          </div>

          {/* Segunda fila: Fecha y Hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
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

          {/* Selección de Trabajador */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
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
      {!showForm && (
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
    </div>
  );
};

export default AsignacionPrendasView;


