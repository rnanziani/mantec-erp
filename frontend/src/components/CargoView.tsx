import React, { useState, useEffect, useMemo } from 'react';
import './CargoView.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface Cargo {
  idcargo_14: number;
  cargo_14: string;
}

interface ApiResponse {
  success: boolean;
  data?: Cargo[] | Cargo;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Cargo;
  direction: 'asc' | 'desc';
};

const CargoView: React.FC = () => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [cargoName, setCargoName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'idcargo_14', direction: 'asc' });

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/cargos';

  // Verificar que el componente se monte correctamente
  useEffect(() => {
    console.log('CargoView montado');
    fetchCargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCargos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // Normalizar los datos por si vienen con nombrecargo_14 como alias
        const normalizedData = data.data.map((cargo: any) => ({
          idcargo_14: cargo.idcargo_14,
          cargo_14: cargo.cargo_14 || cargo.nombrecargo_14 || ''
        }));
        setCargos(normalizedData);
      } else {
        setError(data.error || 'Error al cargar los cargos');
        setCargos([]);
      }
    } catch (err) {
      setError('Error de conexión con el servidor. Verifique que el backend esté ejecutándose.');
      console.error('Error al cargar cargos:', err);
      setCargos([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedCargos = useMemo(() => {
    let filtered = cargos.filter(cargo =>
      cargo.cargo_14.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [cargos, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCargos = filteredAndSortedCargos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedCargos.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof Cargo) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof Cargo) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoName.trim()) {
      showToast('El nombre del cargo es requerido', 'error');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo_14: cargoName.trim() })
      });

      // Verificar si la respuesta es exitosa antes de parsear JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Error HTTP: ${response.status}`;
        showToast(errorMessage, 'error');
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchCargos();
        setCargoName('');
        setShowForm(false);
        showToast('Cargo creado exitosamente', 'success');
      } else {
        const errorMessage = data.error || data.message || 'Error al crear el cargo';
        showToast(errorMessage, 'error');
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al crear el cargo';
      showToast(errorMessage, 'error');
      setError(errorMessage);
      console.error('Error al crear cargo:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoName.trim() || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo_14: cargoName.trim() })
      });

      // Verificar si la respuesta es exitosa antes de parsear JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Error HTTP: ${response.status}`;
        showToast(errorMessage, 'error');
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchCargos();
        setCargoName('');
        setEditingId(null);
        setShowForm(false);
        showToast('Cargo actualizado exitosamente', 'success');
      } else {
        const errorMessage = data.error || data.message || 'Error al actualizar el cargo';
        showToast(errorMessage, 'error');
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al actualizar el cargo';
      showToast(errorMessage, 'error');
      setError(errorMessage);
      console.error('Error al actualizar cargo:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este cargo?')) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchCargos();
        showToast('Cargo eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar el cargo', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar el cargo', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (cargo: Cargo) => {
    setEditingId(cargo.idcargo_14);
    setCargoName(cargo.cargo_14);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setCargoName('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setCargoName('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedCargos.map(c => ({
      ID: c.idcargo_14,
      Cargo: c.cargo_14
    }));
    exportToExcel(dataToExport, 'cargos', 'Cargos');
    showToast('Datos exportados exitosamente', 'success');
  };

  return (
    <div className="cargo-container fade-in">
      <div className="cargo-header">
        <h2>👔 Gestión de Cargos</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={showCreateForm}>
                ➕ Nuevo Cargo
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar cargo..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            {filteredAndSortedCargos.length} resultado{filteredAndSortedCargos.length !== 1 ? 's' : ''}
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
          <h3>{editingId ? '✏️ Editar Cargo' : '➕ Nuevo Cargo'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="cargo">Nombre del Cargo:</label>
              <input
                type="text"
                id="cargo"
                className="form-input"
                value={cargoName}
                onChange={(e) => setCargoName(e.target.value)}
                placeholder="Ej: Mecánico, Supervisor, Jefe de Taller..."
                required
                autoFocus
                maxLength={100}
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
        <div className="loading">⏳ Cargando cargos...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="cargo-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('idcargo_14')} className="sortable">
                    ID {getSortIcon('idcargo_14')}
                  </th>
                  <th onClick={() => handleSort('cargo_14')} className="sortable">
                    Cargo {getSortIcon('cargo_14')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentCargos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron cargos con "${searchTerm}"`
                        : '📋 No hay cargos registrados'
                      }
                    </td>
                  </tr>
                ) : (
                  currentCargos.map((cargo) => (
                    <tr key={cargo.idcargo_14} className="fade-in">
                      <td>{cargo.idcargo_14}</td>
                      <td className="cargo-name">{cargo.cargo_14}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(cargo)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(cargo.idcargo_14)}
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

          {filteredAndSortedCargos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedCargos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CargoView;

