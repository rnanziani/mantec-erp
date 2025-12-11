import React, { useState, useEffect, useMemo } from 'react';
import './EstadoAlternadorView.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface EstadoAlternador {
  id_estado_20: number;
  estado_20: string;
  descripcion_20?: string;
}

interface ApiResponse {
  success: boolean;
  data?: EstadoAlternador[] | EstadoAlternador;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof EstadoAlternador;
  direction: 'asc' | 'desc';
};

const EstadoAlternadorView: React.FC = () => {
  const [estados, setEstados] = useState<EstadoAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [estadoName, setEstadoName] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_estado_20', direction: 'asc' });

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/estados';

  useEffect(() => {
    fetchEstados();
  }, []);

  const fetchEstados = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setEstados(data.data);
      } else {
        setError('Error al cargar los estados');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedEstados = useMemo(() => {
    let filtered = estados.filter(estado =>
      estado.estado_20.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (estado.descripcion_20 && estado.descripcion_20.toLowerCase().includes(searchTerm.toLowerCase()))
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
  }, [estados, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEstados = filteredAndSortedEstados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedEstados.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof EstadoAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof EstadoAlternador) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoName.trim()) {
      showToast('El nombre del estado es requerido', 'error');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_20: estadoName.trim(),
          descripcion_20: descripcion.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        setEstadoName('');
        setDescripcion('');
        setShowForm(false);
        showToast('Estado creado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear el estado', 'error');
      }
    } catch (err) {
      showToast('Error al crear el estado', 'error');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoName.trim() || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_20: estadoName.trim(),
          descripcion_20: descripcion.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        setEstadoName('');
        setDescripcion('');
        setEditingId(null);
        setShowForm(false);
        showToast('Estado actualizado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al actualizar el estado', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar el estado', 'error');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este estado?')) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        showToast('Estado eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar el estado', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar el estado', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (estado: EstadoAlternador) => {
    setEditingId(estado.id_estado_20);
    setEstadoName(estado.estado_20);
    setDescripcion(estado.descripcion_20 || '');
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setEstadoName('');
    setDescripcion('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setEstadoName('');
    setDescripcion('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedEstados.map(e => ({
      ID: e.id_estado_20,
      Estado: e.estado_20,
      Descripción: e.descripcion_20 || ''
    }));
    exportToExcel(dataToExport, 'estados-alternador', 'Estados');
    showToast('Datos exportados exitosamente', 'success');
  };

  return (
    <div className="estados-container fade-in">
      <div className="estados-header">
        <h2>🔄 Gestión de Estados de Alternador</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={showCreateForm}>
                ➕ Nuevo Estado
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar estado o descripción..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            {filteredAndSortedEstados.length} resultado{filteredAndSortedEstados.length !== 1 ? 's' : ''}
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
          <h3>{editingId ? '✏️ Editar Estado' : '➕ Nuevo Estado'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="estado">Nombre del Estado: *</label>
              <input
                type="text"
                id="estado"
                className="form-input"
                value={estadoName}
                onChange={(e) => setEstadoName(e.target.value)}
                placeholder="Ej: Operativo, En Reparación, Fuera de Servicio..."
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="descripcion">Descripción:</label>
              <textarea
                id="descripcion"
                className="form-textarea"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional del estado..."
                rows={3}
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
        <div className="loading">⏳ Cargando estados...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="estados-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('id_estado_20')} 
                    className={`sortable ${sortConfig.key === 'id_estado_20' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ID
                  </th>
                  <th 
                    onClick={() => handleSort('estado_20')} 
                    className={`sortable ${sortConfig.key === 'estado_20' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ESTADO
                  </th>
                  <th 
                    onClick={() => handleSort('descripcion_20')} 
                    className={`sortable ${sortConfig.key === 'descripcion_20' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    DESCRIPCIÓN
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentEstados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron estados con "${searchTerm}"`
                        : '📋 No hay estados registrados'
                      }
                    </td>
                  </tr>
                ) : (
                  currentEstados.map((estado) => (
                    <tr key={estado.id_estado_20} className="fade-in">
                      <td>{estado.id_estado_20}</td>
                      <td className="estado-name">{estado.estado_20}</td>
                      <td className="estado-descripcion">{estado.descripcion_20 || '-'}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(estado)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(estado.id_estado_20)}
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

          {filteredAndSortedEstados.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedEstados.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default EstadoAlternadorView;
