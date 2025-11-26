import React, { useState, useEffect, useMemo } from 'react';
import './MarcasAlternador.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface MarcaAlternador {
  id_marca_18: number;
  marca_18: string;
}

interface ApiResponse {
  success: boolean;
  data?: MarcaAlternador[] | MarcaAlternador;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof MarcaAlternador;
  direction: 'asc' | 'desc';
};

const MarcasAlternador: React.FC = () => {
  const [marcas, setMarcas] = useState<MarcaAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [marcaName, setMarcaName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_marca_18', direction: 'asc' });

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/marcas';

  useEffect(() => {
    fetchMarcas();
  }, []);

  const fetchMarcas = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data);
      } else {
        setError('Error al cargar las marcas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedMarcas = useMemo(() => {
    let filtered = marcas.filter(marca =>
      marca.marca_18.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [marcas, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMarcas = filteredAndSortedMarcas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedMarcas.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof MarcaAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof MarcaAlternador) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaName.trim()) {
      showToast('El nombre de la marca es requerido', 'error');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_18: marcaName.trim() })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMarcas();
        setMarcaName('');
        setShowForm(false);
        showToast('Marca creada exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear la marca', 'error');
      }
    } catch (err) {
      showToast('Error al crear la marca', 'error');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaName.trim() || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_18: marcaName.trim() })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMarcas();
        setMarcaName('');
        setEditingId(null);
        setShowForm(false);
        showToast('Marca actualizada exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al actualizar la marca', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar la marca', 'error');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta marca?')) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMarcas();
        showToast('Marca eliminada exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar la marca', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar la marca', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (marca: MarcaAlternador) => {
    setEditingId(marca.id_marca_18);
    setMarcaName(marca.marca_18);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setMarcaName('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setMarcaName('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedMarcas.map(m => ({
      ID: m.id_marca_18,
      Marca: m.marca_18
    }));
    exportToExcel(dataToExport, 'marcas-alternadores', 'Marcas');
    showToast('Datos exportados exitosamente', 'success');
  };

  return (
    <div className="marcas-container fade-in">
      <div className="marcas-header">
        <h2>🔧 Gestión de Marcas de Alternadores</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={showCreateForm}>
                ➕ Nueva Marca
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar marca..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            {filteredAndSortedMarcas.length} resultado{filteredAndSortedMarcas.length !== 1 ? 's' : ''}
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
          <h3>{editingId ? '✏️ Editar Marca' : '➕ Nueva Marca'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="marca">Nombre de la Marca:</label>
              <input
                type="text"
                id="marca"
                className="form-input"
                value={marcaName}
                onChange={(e) => setMarcaName(e.target.value)}
                placeholder="Ej: Scania, Volvo, M Benz..."
                required
                autoFocus
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
        <div className="loading">⏳ Cargando marcas...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="marcas-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id_marca_18')} className="sortable">
                    ID {getSortIcon('id_marca_18')}
                  </th>
                  <th onClick={() => handleSort('marca_18')} className="sortable">
                    Marca {getSortIcon('marca_18')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentMarcas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron marcas con "${searchTerm}"`
                        : '📋 No hay marcas registradas'
                      }
                    </td>
                  </tr>
                ) : (
                  currentMarcas.map((marca) => (
                    <tr key={marca.id_marca_18} className="fade-in">
                      <td>{marca.id_marca_18}</td>
                      <td className="marca-name">{marca.marca_18}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(marca)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(marca.id_marca_18)}
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

          {filteredAndSortedMarcas.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedMarcas.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MarcasAlternador;
