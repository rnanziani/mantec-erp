import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './AlternadoresView.css';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface Alternador {
  id_alternador_19: number;
  cod_alternador_19: string;
  id_marca_19: number;
  estado_ubicacion?: string;
  id_tipo_comp_alternador_19: number;
  marca_18?: string;
  tipo_comp_descripcion?: string;
}

interface Marca {
  id_marca_18: number;
  marca_18: string;
}

interface TipoCompAlternador {
  id_tipo_comp_alternador_30: number;
  tipo_comp_alternador_30: string;
}

interface ApiResponse {
  success: boolean;
  data?: Alternador[] | Alternador | Marca[];
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Alternador;
  direction: 'asc' | 'desc';
};

const AlternadoresView: React.FC = () => {
  const [alternadores, setAlternadores] = useState<Alternador[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tiposComp, setTiposComp] = useState<TipoCompAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedMarca, setSelectedMarca] = useState<number>(0);
  const [estadoUbicacion, setEstadoUbicacion] = useState<string>('BODEGA');
  const [selectedTipoComp, setSelectedTipoComp] = useState<number>(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTipoComp, setFilterTipoComp] = useState<number>(0); // 0 = todos
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_alternador_19', direction: 'asc' });

  const API_URL = 'http://localhost:3001/api/alternadores';
  const MARCAS_URL = 'http://localhost:3001/api/marcas';
  const TIPOS_COMP_URL = 'http://localhost:3001/api/tipos-comp-alternador';

  useEffect(() => {
    fetchAlternadores();
    fetchMarcas();
    fetchTiposComp();
  }, []);

  const fetchAlternadores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setAlternadores(data.data as Alternador[]);
      } else {
        setError('Error al cargar los alternadores');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcas = async () => {
    try {
      const response = await fetch(MARCAS_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data as Marca[]);
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
        setTiposComp(data.data as unknown as TipoCompAlternador[]);
      }
    } catch (err) {
      console.error('Error al cargar tipos de componente:', err);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedAlternadores = useMemo(() => {
    let filtered = alternadores.filter(alt => {
      // Filtro por búsqueda de texto
      const matchesSearch = alt.cod_alternador_19.includes(searchTerm) ||
        alt.marca_18?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alt.estado_ubicacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alt.tipo_comp_descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por tipo de componente
      const matchesTipoComp = filterTipoComp === 0 || alt.id_tipo_comp_alternador_19 === filterTipoComp;
      
      return matchesSearch && matchesTipoComp;
    });

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [alternadores, searchTerm, filterTipoComp, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlternadores = filteredAndSortedAlternadores.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedAlternadores.length / itemsPerPage);

  // Resetear página al buscar o filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipoComp]);

  const handleSort = (key: keyof Alternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof Alternador) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarca || selectedMarca === 0) {
      await showError('Validación', 'Debe seleccionar una marca');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id_marca_19: selectedMarca,
          estado_ubicacion: estadoUbicacion || 'BODEGA',
          id_tipo_comp_alternador_19: selectedTipoComp || 1
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchAlternadores();
        setSelectedMarca(0);
        setEstadoUbicacion('BODEGA');
        setSelectedTipoComp(1);
        setShowForm(false);
        await showSuccess('¡Éxito!', 'Alternador creado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al crear el alternador');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el alternador');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarca || selectedMarca === 0 || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id_marca_19: selectedMarca,
          estado_ubicacion: estadoUbicacion || 'BODEGA',
          id_tipo_comp_alternador_19: selectedTipoComp || 1
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchAlternadores();
        setSelectedMarca(0);
        setEstadoUbicacion('BODEGA');
        setSelectedTipoComp(1);
        setEditingId(null);
        setShowForm(false);
        await showSuccess('¡Éxito!', 'Alternador actualizado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al actualizar el alternador');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el alternador');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este alternador');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchAlternadores();
        await showSuccess('¡Éxito!', 'Alternador eliminado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al eliminar el alternador');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el alternador');
      console.error('Error:', err);
    }
  };

  const startEdit = (alternador: Alternador) => {
    setEditingId(alternador.id_alternador_19);
    setSelectedMarca(alternador.id_marca_19);
    setEstadoUbicacion(alternador.estado_ubicacion || 'BODEGA');
    setSelectedTipoComp(alternador.id_tipo_comp_alternador_19 || 1);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setSelectedMarca(0);
    setEstadoUbicacion('BODEGA');
    setSelectedTipoComp(1);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setSelectedMarca(0);
    setEstadoUbicacion('BODEGA');
    setSelectedTipoComp(1);
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedAlternadores.map(a => ({
      ID: a.id_alternador_19,
      Código: a.cod_alternador_19,
      Marca: a.marca_18 || '',
      'Estado Ubicación': a.estado_ubicacion || 'BODEGA',
      'Tipo Componente': a.tipo_comp_descripcion || 'Tipo ' + (a.id_tipo_comp_alternador_19 || 1)
    }));
    exportToExcel(dataToExport, 'alternadores', 'Alternadores');
    await showSuccess('¡Éxito!', 'Datos exportados exitosamente');
  };

  return (
    <div className="bodega-view alternadores-view">
      <header className="view-header">
        <h2>⚡ Gestión de Alternadores</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button
                type="button"
                className="btn-export"
                onClick={handleExport}
                title="Exportar a Excel"
                aria-label="Exportar alternadores a Excel"
              >
                📊 Exportar
              </button>
              <button
                type="button"
                className="btn-primary alternadores-btn-new"
                onClick={showCreateForm}
                aria-label="Crear nuevo alternador"
              >
                ➕ Nuevo Alternador
              </button>
            </>
          )}
        </div>
      </header>

      {!showForm && (
        <div className="form-container alternadores-search-section">
          <div className="alternadores-filters-row">
            <div className="alternadores-search-wrap">
              <SearchBar
                placeholder="Buscar por código o marca..."
                value={searchTerm}
                onChange={setSearchTerm}
                ariaLabel="Buscar alternadores por código o marca"
              />
            </div>
            <div className="alternadores-filter-wrap">
              <label htmlFor="filter-tipo-comp" className="alternadores-filter-label">
                Filtrar por Tipo:
              </label>
              <select
                id="filter-tipo-comp"
                value={filterTipoComp}
                onChange={(e) => setFilterTipoComp(parseInt(e.target.value))}
                className="alternadores-filter-select"
                aria-label="Filtrar alternadores por tipo de componente"
              >
                <option value={0}>Todos los tipos</option>
                {tiposComp.map(tipo => (
                  <option key={tipo.id_tipo_comp_alternador_30} value={tipo.id_tipo_comp_alternador_30}>
                    {tipo.tipo_comp_alternador_30}
                  </option>
                ))}
              </select>
            </div>
            <div className="alternadores-results-info">
              Mostrando {currentAlternadores.length} de {filteredAndSortedAlternadores.length} registros
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alternadores-alert-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container alternadores-form-card">
          <h3>{editingId ? '✏️ Editar Alternador' : '➕ Nuevo Alternador'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="marca">Marca del Alternador:</label>
              <select
                id="marca"
                className="form-select"
                value={selectedMarca}
                onChange={(e) => setSelectedMarca(parseInt(e.target.value))}
                required
              >
                <option value="0">-- Seleccione una marca --</option>
                {marcas.map((marca) => (
                  <option key={marca.id_marca_18} value={marca.id_marca_18}>
                    {marca.marca_18}
                  </option>
                ))}
              </select>
              <small className="form-hint">
                💡 El código del alternador se generará automáticamente
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="estadoUbicacion">Estado de Ubicación:</label>
              <input
                id="estadoUbicacion"
                type="text"
                className="form-input"
                value={estadoUbicacion}
                onChange={(e) => setEstadoUbicacion(e.target.value)}
                placeholder="BODEGA"
                maxLength={20}
              />
              <small className="form-hint">
                💡 Estado de ubicación del alternador (por defecto: BODEGA)
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="tipoComp">Tipo de Componente:</label>
              <select
                id="tipoComp"
                className="form-select"
                value={selectedTipoComp}
                onChange={(e) => setSelectedTipoComp(parseInt(e.target.value))}
                required
              >
                <option value="0">-- Seleccione un tipo --</option>
                {tiposComp.map((tipo) => (
                  <option key={tipo.id_tipo_comp_alternador_30} value={tipo.id_tipo_comp_alternador_30}>
                    {tipo.tipo_comp_alternador_30}
                  </option>
                ))}
              </select>
              <small className="form-hint">
                💡 Tipo de componente del alternador (por defecto: 1)
              </small>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn-success"
                aria-label={editingId ? 'Guardar cambios del alternador' : 'Crear nuevo alternador'}
              >
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelForm}
                aria-label="Cancelar y cerrar formulario"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ Cargando alternadores...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table alternadores-table" role="grid" aria-label="Lista de alternadores">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('id_alternador_19')}
                    className={`sortable ${sortConfig.key === 'id_alternador_19' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    scope="col"
                    aria-sort={sortConfig.key === 'id_alternador_19' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    ID
                  </th>
                  <th
                    onClick={() => handleSort('cod_alternador_19')}
                    className={`sortable ${sortConfig.key === 'cod_alternador_19' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    scope="col"
                    aria-sort={sortConfig.key === 'cod_alternador_19' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    CÓDIGO
                  </th>
                  <th
                    onClick={() => handleSort('marca_18')}
                    className={`sortable ${sortConfig.key === 'marca_18' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    scope="col"
                    aria-sort={sortConfig.key === 'marca_18' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    MARCA
                  </th>
                  <th
                    onClick={() => handleSort('estado_ubicacion')}
                    className={`sortable ${sortConfig.key === 'estado_ubicacion' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    scope="col"
                    aria-sort={sortConfig.key === 'estado_ubicacion' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    ESTADO UBICACIÓN
                  </th>
                  <th
                    onClick={() => handleSort('tipo_comp_descripcion')}
                    className={`sortable ${sortConfig.key === 'tipo_comp_descripcion' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    scope="col"
                    aria-sort={sortConfig.key === 'tipo_comp_descripcion' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    TIPO COMPONENTE
                  </th>
                  <th scope="col">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentAlternadores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron alternadores con "${searchTerm}"`
                        : '📋 No hay alternadores registrados'
                      }
                    </td>
                  </tr>
                ) : (
                  currentAlternadores.map((alternador) => (
                    <tr key={alternador.id_alternador_19} className="fade-in">
                      <td>{alternador.id_alternador_19}</td>
                      <td className="codigo-alternador">{alternador.cod_alternador_19}</td>
                      <td className="marca-name">{alternador.marca_18}</td>
                      <td className="estado-ubicacion">{alternador.estado_ubicacion || 'BODEGA'}</td>
                      <td className="tipo-comp">{alternador.tipo_comp_descripcion || 'Tipo ' + (alternador.id_tipo_comp_alternador_19 || 1)}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => startEdit(alternador)}
                          title="Editar alternador"
                          aria-label={`Editar alternador con código ${alternador.cod_alternador_19}`}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDelete(alternador.id_alternador_19)}
                          title="Eliminar alternador"
                          aria-label={`Eliminar alternador con código ${alternador.cod_alternador_19}`}
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

          {filteredAndSortedAlternadores.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedAlternadores.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AlternadoresView;
