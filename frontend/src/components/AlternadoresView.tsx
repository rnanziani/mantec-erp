import React, { useState, useEffect, useMemo } from 'react';
import './AlternadoresView.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface Alternador {
  id_alternador_19: number;
  cod_alternador_19: string;
  id_marca_19: number;
  marca_18?: string;
}

interface Marca {
  id_marca_18: number;
  marca_18: string;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedMarca, setSelectedMarca] = useState<number>(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_alternador_19', direction: 'asc' });

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/alternadores';
  const MARCAS_URL = 'http://localhost:3001/api/marcas';

  useEffect(() => {
    fetchAlternadores();
    fetchMarcas();
  }, []);

  const fetchAlternadores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setAlternadores(data.data);
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
        setMarcas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar marcas:', err);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedAlternadores = useMemo(() => {
    let filtered = alternadores.filter(alt =>
      alt.cod_alternador_19.includes(searchTerm) ||
      alt.marca_18?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
  }, [alternadores, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlternadores = filteredAndSortedAlternadores.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedAlternadores.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      showToast('Debe seleccionar una marca', 'error');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_marca_19: selectedMarca })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchAlternadores();
        setSelectedMarca(0);
        setShowForm(false);
        showToast('Alternador creado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear el alternador', 'error');
      }
    } catch (err) {
      showToast('Error al crear el alternador', 'error');
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
        body: JSON.stringify({ id_marca_19: selectedMarca })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchAlternadores();
        setSelectedMarca(0);
        setEditingId(null);
        setShowForm(false);
        showToast('Alternador actualizado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al actualizar el alternador', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar el alternador', 'error');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este alternador?')) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchAlternadores();
        showToast('Alternador eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar el alternador', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar el alternador', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (alternador: Alternador) => {
    setEditingId(alternador.id_alternador_19);
    setSelectedMarca(alternador.id_marca_19);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setSelectedMarca(0);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setSelectedMarca(0);
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedAlternadores.map(a => ({
      ID: a.id_alternador_19,
      Código: a.cod_alternador_19,
      Marca: a.marca_18 || ''
    }));
    exportToExcel(dataToExport, 'alternadores', 'Alternadores');
    showToast('Datos exportados exitosamente', 'success');
  };

  return (
    <div className="alternadores-container fade-in">
      <div className="alternadores-header">
        <h2>⚡ Gestión de Alternadores</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={showCreateForm}>
                ➕ Nuevo Alternador
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar por código o marca..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            Mostrando {currentAlternadores.length} de {filteredAndSortedAlternadores.length} registros
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
        <div className="loading">⏳ Cargando alternadores...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="alternadores-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id_alternador_19')} className="sortable">
                    ID {getSortIcon('id_alternador_19')}
                  </th>
                  <th onClick={() => handleSort('cod_alternador_19')} className="sortable">
                    Código {getSortIcon('cod_alternador_19')}
                  </th>
                  <th onClick={() => handleSort('marca_18')} className="sortable">
                    Marca {getSortIcon('marca_18')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentAlternadores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-data">
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
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(alternador)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(alternador.id_alternador_19)}
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
