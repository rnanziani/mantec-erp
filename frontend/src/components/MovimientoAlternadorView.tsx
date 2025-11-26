import React, { useState, useEffect, useMemo } from 'react';
import './MovimientoAlternadorView.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface MovimientoAlternador {
  id_movimiento_22: number;
  id_alternador_22: number;
  id_estado_anterior_22?: number;
  id_estado_actual_22: number;
  id_maquina_22?: number;
  fecha_movimiento_22: string;
  tipo_movimiento_22: 'ENTRADA' | 'SALIDA' | 'ASIGNACION' | 'REPARACION';
  observaciones_22?: string;
  usuario_responsable_22?: string;
  // JOINed fields
  cod_alternador_19?: string;
  estado_anterior?: string;
  estado_actual?: string;
  numinterno_11?: string;
  ppu_11?: string;
  descripcion_11?: string;
}

interface Alternador {
  id_alternador_19: number;
  cod_alternador_19: string;
}

interface Estado {
  id_estado_20: number;
  estado_20: string;
}

interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
  descripcion_11: string;
}

interface ApiResponse {
  success: boolean;
  data?: MovimientoAlternador[] | MovimientoAlternador | Alternador[] | Estado[] | Maquina[];
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof MovimientoAlternador;
  direction: 'asc' | 'desc';
};

const MovimientoAlternadorView: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoAlternador[]>([]);
  const [alternadores, setAlternadores] = useState<Alternador[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Form fields
  const [idAlternador, setIdAlternador] = useState<string>('');
  const [idEstadoAnterior, setIdEstadoAnterior] = useState<string>('');
  const [idEstadoActual, setIdEstadoActual] = useState<string>('');
  const [idMaquina, setIdMaquina] = useState<string>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [usuarioResponsable, setUsuarioResponsable] = useState<string>('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Features
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_movimiento_22', direction: 'desc' });

  // Machine dropdown search
  const [maquinaSearch, setMaquinaSearch] = useState<string>('');
  const [showMaquinaDropdown, setShowMaquinaDropdown] = useState<boolean>(false);

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/movimientos';

  useEffect(() => {
    fetchMovimientos();
    fetchAlternadores();
    fetchEstados();
    fetchMaquinas();
  }, []);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setMovimientos(data.data as MovimientoAlternador[]);
      } else {
        setError('Error al cargar los movimientos');
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
      const response = await fetch('http://localhost:3001/api/alternadores');
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAlternadores(data.data as Alternador[]);
      }
    } catch (err) {
      console.error('Error al cargar alternadores:', err);
    }
  };

  const fetchEstados = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/estados');
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setEstados(data.data as Estado[]);
      }
    } catch (err) {
      console.error('Error al cargar estados:', err);
    }
  };

  const fetchMaquinas = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/maquinas');
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMaquinas(data.data as Maquina[]);
      }
    } catch (err) {
      console.error('Error al cargar máquinas:', err);
      // No es crítico si no hay endpoint de máquinas aún
    }
  };

  // Filtrar máquinas por búsqueda
  const filteredMaquinas = useMemo(() => {
    if (!maquinaSearch.trim()) return maquinas;
    const search = maquinaSearch.toLowerCase();
    return maquinas.filter(maq =>
      maq.numinterno_11.toLowerCase().includes(search) ||
      maq.ppu_11.toLowerCase().includes(search)
    );
  }, [maquinas, maquinaSearch]);

  // Obtener el texto de la máquina seleccionada
  const getSelectedMaquinaText = () => {
    if (!idMaquina) return '';
    const maquina = maquinas.find(m => m.idmaquina_11.toString() === idMaquina);
    if (!maquina) return '';
    return `${maquina.numinterno_11} - ${maquina.ppu_11} (${maquina.descripcion_11})`;
  };

  // Filtrar y ordenar datos
  const filteredAndSortedMovimientos = useMemo(() => {
    let filtered = movimientos.filter(mov =>
      mov.cod_alternador_19?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.estado_actual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.tipo_movimiento_22?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.usuario_responsable_22?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.observaciones_22?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [movimientos, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMovimientos = filteredAndSortedMovimientos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedMovimientos.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof MovimientoAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof MovimientoAlternador) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idAlternador || !idEstadoActual || !tipoMovimiento) {
      showToast('Alternador, Estado Actual y Tipo de Movimiento son requeridos', 'error');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alternador_22: parseInt(idAlternador),
          id_estado_anterior_22: idEstadoAnterior ? parseInt(idEstadoAnterior) : undefined,
          id_estado_actual_22: parseInt(idEstadoActual),
          id_maquina_22: idMaquina ? parseInt(idMaquina) : undefined,
          tipo_movimiento_22: tipoMovimiento,
          observaciones_22: observaciones.trim() || undefined,
          usuario_responsable_22: usuarioResponsable.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMovimientos();
        resetForm();
        showToast('Movimiento creado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear el movimiento', 'error');
      }
    } catch (err) {
      showToast('Error al crear el movimiento', 'error');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idAlternador || !idEstadoActual || !tipoMovimiento || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alternador_22: parseInt(idAlternador),
          id_estado_anterior_22: idEstadoAnterior ? parseInt(idEstadoAnterior) : undefined,
          id_estado_actual_22: parseInt(idEstadoActual),
          id_maquina_22: idMaquina ? parseInt(idMaquina) : undefined,
          tipo_movimiento_22: tipoMovimiento,
          observaciones_22: observaciones.trim() || undefined,
          usuario_responsable_22: usuarioResponsable.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMovimientos();
        resetForm();
        showToast('Movimiento actualizado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al actualizar el movimiento', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar el movimiento', 'error');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este movimiento?')) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMovimientos();
        showToast('Movimiento eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar el movimiento', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar el movimiento', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (movimiento: MovimientoAlternador) => {
    setEditingId(movimiento.id_movimiento_22);
    setIdAlternador(movimiento.id_alternador_22.toString());
    setIdEstadoAnterior(movimiento.id_estado_anterior_22?.toString() || '');
    setIdEstadoActual(movimiento.id_estado_actual_22.toString());
    setIdMaquina(movimiento.id_maquina_22?.toString() || '');
    setTipoMovimiento(movimiento.tipo_movimiento_22);
    setObservaciones(movimiento.observaciones_22 || '');
    setUsuarioResponsable(movimiento.usuario_responsable_22 || '');
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setIdAlternador('');
    setIdEstadoAnterior('');
    setIdEstadoActual('');
    setIdMaquina('');
    setTipoMovimiento('');
    setObservaciones('');
    setUsuarioResponsable('');
    setEditingId(null);
    setShowForm(false);
    setError('');
    setMaquinaSearch('');
    setShowMaquinaDropdown(false);
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedMovimientos.map(m => ({
      ID: m.id_movimiento_22,
      Alternador: m.cod_alternador_19 || '',
      'Estado Anterior': m.estado_anterior || '-',
      'Estado Actual': m.estado_actual || '',
      Máquina: m.numinterno_11 ? `${m.numinterno_11} - ${m.ppu_11}` : '-',
      Tipo: m.tipo_movimiento_22,
      Fecha: new Date(m.fecha_movimiento_22).toLocaleString('es-CL'),
      Usuario: m.usuario_responsable_22 || '-',
      Observaciones: m.observaciones_22 || '-'
    }));
    exportToExcel(dataToExport, 'movimientos-alternador', 'Movimientos');
    showToast('Datos exportados exitosamente', 'success');
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="movimientos-container fade-in">
      <div className="movimientos-header">
        <h2>📋 Gestión de Movimientos de Alternador</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={showCreateForm}>
                ➕ Nuevo Movimiento
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar por alternador, estado, tipo, usuario..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            {filteredAndSortedMovimientos.length} resultado{filteredAndSortedMovimientos.length !== 1 ? 's' : ''}
            {searchTerm && ` para "${searchTerm}"`}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error fade-in">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-card fade-in">
          <h3>{editingId ? '✏️ Editar Movimiento' : '➕ Nuevo Movimiento'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="alternador">Alternador: *</label>
                <select
                  id="alternador"
                  className="form-select"
                  value={idAlternador}
                  onChange={(e) => setIdAlternador(e.target.value)}
                  required
                >
                  <option value="">Seleccione un alternador</option>
                  {alternadores.map(alt => (
                    <option key={alt.id_alternador_19} value={alt.id_alternador_19}>
                      {alt.cod_alternador_19}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipoMovimiento">Tipo de Movimiento: *</label>
                <select
                  id="tipoMovimiento"
                  className="form-select"
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value)}
                  required
                >
                  <option value="">Seleccione tipo</option>
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="SALIDA">SALIDA</option>
                  <option value="ASIGNACION">ASIGNACION</option>
                  <option value="REPARACION">REPARACION</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="estadoAnterior">Estado Anterior:</label>
                <select
                  id="estadoAnterior"
                  className="form-select"
                  value={idEstadoAnterior}
                  onChange={(e) => setIdEstadoAnterior(e.target.value)}
                >
                  <option value="">Sin estado anterior</option>
                  {estados.map(est => (
                    <option key={est.id_estado_20} value={est.id_estado_20}>
                      {est.estado_20}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="estadoActual">Estado Actual: *</label>
                <select
                  id="estadoActual"
                  className="form-select"
                  value={idEstadoActual}
                  onChange={(e) => setIdEstadoActual(e.target.value)}
                  required
                >
                  <option value="">Seleccione estado</option>
                  {estados.map(est => (
                    <option key={est.id_estado_20} value={est.id_estado_20}>
                      {est.estado_20}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="maquina">Máquina:</label>
                <div className="searchable-select-container" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="maquina"
                    className="form-input"
                    placeholder="Buscar por número interno o PPU..."
                    value={idMaquina ? getSelectedMaquinaText() : maquinaSearch}
                    onChange={(e) => {
                      setMaquinaSearch(e.target.value);
                      setIdMaquina('');
                    }}
                    onFocus={() => setShowMaquinaDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMaquinaDropdown(false), 200)}
                    autoComplete="off"
                  />
                  {showMaquinaDropdown && (
                    <div className="searchable-dropdown" style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      marginTop: '4px',
                      zIndex: 9999,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                      isolation: 'isolate'
                    }}>
                      <div
                        className="dropdown-item"
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseDown={() => {
                          setIdMaquina('');
                          setMaquinaSearch('');
                          setShowMaquinaDropdown(false);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <em style={{ color: 'var(--text-secondary)' }}>Sin máquina asignada</em>
                      </div>
                      {filteredMaquinas.length === 0 ? (
                        <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No se encontraron máquinas
                        </div>
                      ) : (
                        filteredMaquinas.map(maq => (
                          <div
                            key={maq.idmaquina_11}
                            className="dropdown-item"
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseDown={() => {
                              setIdMaquina(maq.idmaquina_11.toString());
                              setMaquinaSearch('');
                              setShowMaquinaDropdown(false);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <strong>{maq.numinterno_11}</strong> - {maq.ppu_11}
                            <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {maq.descripcion_11}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="usuario">Usuario Responsable:</label>
                <input
                  type="text"
                  id="usuario"
                  className="form-input"
                  value={usuarioResponsable}
                  onChange={(e) => setUsuarioResponsable(e.target.value)}
                  placeholder="Nombre del usuario"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="observaciones">Observaciones:</label>
              <textarea
                id="observaciones"
                className="form-textarea"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones del movimiento..."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ Cargando movimientos...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="movimientos-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id_movimiento_22')} className="sortable">
                    ID {getSortIcon('id_movimiento_22')}
                  </th>
                  <th onClick={() => handleSort('cod_alternador_19')} className="sortable">
                    Alternador {getSortIcon('cod_alternador_19')}
                  </th>
                  <th>Estado Anterior</th>
                  <th>Estado Actual</th>
                  <th>Máquina</th>
                  <th onClick={() => handleSort('tipo_movimiento_22')} className="sortable">
                    Tipo {getSortIcon('tipo_movimiento_22')}
                  </th>
                  <th onClick={() => handleSort('fecha_movimiento_22')} className="sortable">
                    Fecha {getSortIcon('fecha_movimiento_22')}
                  </th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentMovimientos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron movimientos con "${searchTerm}"`
                        : '📋 No hay movimientos registrados'
                      }
                    </td>
                  </tr>
                ) : (
                  currentMovimientos.map((movimiento) => (
                    <tr key={movimiento.id_movimiento_22} className="fade-in">
                      <td>{movimiento.id_movimiento_22}</td>
                      <td className="movimiento-alternador">{movimiento.cod_alternador_19}</td>
                      <td className="movimiento-estado">{movimiento.estado_anterior || '-'}</td>
                      <td className="movimiento-estado-actual">{movimiento.estado_actual}</td>
                      <td className="movimiento-maquina">
                        {movimiento.numinterno_11 ? `${movimiento.numinterno_11} - ${movimiento.ppu_11}` : '-'}
                      </td>
                      <td>
                        <span className={`badge badge-${movimiento.tipo_movimiento_22.toLowerCase()}`}>
                          {movimiento.tipo_movimiento_22}
                        </span>
                      </td>
                      <td className="movimiento-fecha">{formatFecha(movimiento.fecha_movimiento_22)}</td>
                      <td>{movimiento.usuario_responsable_22 || '-'}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(movimiento)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(movimiento.id_movimiento_22)}
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

          {filteredAndSortedMovimientos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedMovimientos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MovimientoAlternadorView;
