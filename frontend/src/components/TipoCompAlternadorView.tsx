import React, { useState, useEffect, useMemo } from 'react';
import './TipoCompAlternadorView.css';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface TipoCompAlternador {
  id_tipo_comp_alternador_32: number;
  tipo_comp_alternador_32: string;
}

interface ApiResponse {
  success: boolean;
  data?: TipoCompAlternador[] | TipoCompAlternador;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof TipoCompAlternador;
  direction: 'asc' | 'desc';
};

const TipoCompAlternadorView: React.FC = () => {
  const [tipos, setTipos] = useState<TipoCompAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tipoId, setTipoId] = useState<number>(0);
  const [tipoNombre, setTipoNombre] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_tipo_comp_alternador_32', direction: 'asc' });

  const API_URL = 'http://localhost:3001/api/tipos-comp-alternador';

  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTipos(data.data);
      } else {
        setError('Error al cargar los tipos de componente');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedTipos = useMemo(() => {
    let filtered = tipos.filter(tipo =>
      tipo.tipo_comp_alternador_32.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.id_tipo_comp_alternador_32.toString().includes(searchTerm)
    );

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tipos, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTipos = filteredAndSortedTipos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedTipos.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof TipoCompAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof TipoCompAlternador) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId || tipoId === 0) {
      await showError('Validación', 'El ID del tipo de componente es requerido');
      return;
    }
    if (!tipoNombre.trim()) {
      await showError('Validación', 'El nombre del tipo de componente es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id_tipo_comp_alternador_32: tipoId,
          tipo_comp_alternador_32: tipoNombre.trim()
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTipos();
        setTipoId(0);
        setTipoNombre('');
        setShowForm(false);
        await showSuccess('¡Éxito!', 'Tipo de componente creado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al crear el tipo de componente');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el tipo de componente');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoNombre.trim() || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_comp_alternador_32: tipoNombre.trim() })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTipos();
        setTipoId(0);
        setTipoNombre('');
        setEditingId(null);
        setShowForm(false);
        await showSuccess('¡Éxito!', 'Tipo de componente actualizado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al actualizar el tipo de componente');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el tipo de componente');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este tipo de componente');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTipos();
        await showSuccess('¡Éxito!', 'Tipo de componente eliminado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al eliminar el tipo de componente');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el tipo de componente');
      console.error('Error:', err);
    }
  };

  const startEdit = (tipo: TipoCompAlternador) => {
    setEditingId(tipo.id_tipo_comp_alternador_32);
    setTipoId(tipo.id_tipo_comp_alternador_32);
    setTipoNombre(tipo.tipo_comp_alternador_32);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setTipoId(0);
    setTipoNombre('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setTipoId(0);
    setTipoNombre('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedTipos.map(t => ({
      ID: t.id_tipo_comp_alternador_32,
      'Tipo Componente': t.tipo_comp_alternador_32
    }));
    exportToExcel(dataToExport, 'tipos-comp-alternador', 'Tipos de Componente Alternador');
    await showSuccess('¡Éxito!', 'Datos exportados exitosamente');
  };

  return (
    <div className="tipo-comp-alternador-container fade-in">
      <div className="tipo-comp-alternador-header">
        <h2>🔧 Gestión de Tipos de Componente Alternador</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={showCreateForm}>
                ➕ Nuevo Tipo
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar por ID o nombre..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            Mostrando {currentTipos.length} de {filteredAndSortedTipos.length} registros
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
          <h3>{editingId ? '✏️ Editar Tipo de Componente' : '➕ Nuevo Tipo de Componente'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            {!editingId && (
              <div className="form-group">
                <label htmlFor="tipoId">ID del Tipo:</label>
                <input
                  type="number"
                  id="tipoId"
                  className="form-input"
                  value={tipoId || ''}
                  onChange={(e) => setTipoId(parseInt(e.target.value) || 0)}
                  placeholder="Ej: 1, 2, 3..."
                  min="1"
                  required
                  autoFocus
                />
                <small className="form-hint">
                  💡 El ID debe ser único y no puede ser modificado después de crear
                </small>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="tipoNombre">Nombre del Tipo:</label>
              <input
                type="text"
                id="tipoNombre"
                className="form-input"
                value={tipoNombre}
                onChange={(e) => setTipoNombre(e.target.value)}
                placeholder="Ej: Original, Reconstruido, Reparado..."
                required
                autoFocus={!!editingId}
                maxLength={50}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ Cargando tipos de componente...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="tipo-comp-alternador-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('id_tipo_comp_alternador_32')} 
                    className={`sortable ${sortConfig.key === 'id_tipo_comp_alternador_32' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ID {getSortIcon('id_tipo_comp_alternador_32')}
                  </th>
                  <th 
                    onClick={() => handleSort('tipo_comp_alternador_32')} 
                    className={`sortable ${sortConfig.key === 'tipo_comp_alternador_32' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    TIPO COMPONENTE {getSortIcon('tipo_comp_alternador_32')}
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentTipos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron tipos con "${searchTerm}"`
                        : '📋 No hay tipos de componente registrados'
                      }
                    </td>
                  </tr>
                ) : (
                  currentTipos.map((tipo) => (
                    <tr key={tipo.id_tipo_comp_alternador_32} className="fade-in">
                      <td>{tipo.id_tipo_comp_alternador_32}</td>
                      <td className="tipo-name">{tipo.tipo_comp_alternador_32}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(tipo)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(tipo.id_tipo_comp_alternador_32)}
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

          {filteredAndSortedTipos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedTipos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TipoCompAlternadorView;

