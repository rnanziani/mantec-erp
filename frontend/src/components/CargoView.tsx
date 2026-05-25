import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './CargoView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

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
  const formRef = React.useRef<HTMLFormElement>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [cargoName, setCargoName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'idcargo_14', direction: 'asc' });

  const API_URL = apiUrl('/cargos');

  useEffect(() => {
    fetchCargos();
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
        const normalizedData = data.data.map((cargo: { idcargo_14: number; cargo_14?: string; nombrecargo_14?: string }) => ({
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

  const filteredAndSortedCargos = useMemo(() => {
    let filtered = cargos.filter(cargo =>
      cargo.cargo_14.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [cargos, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCargos = filteredAndSortedCargos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedCargos.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof Cargo) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof Cargo) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoName.trim()) {
      await showError('Campo requerido', 'El nombre del cargo es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo_14: cargoName.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Error HTTP: ${response.status}`;
        await showError('Error al crear', errorMessage);
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchCargos();
        setCargoName('');
        setShowForm(false);
        await showSuccess('¡Cargo creado!', 'El cargo ha sido registrado correctamente.');
      } else {
        const errorMessage = data.error || data.message || 'Error al crear el cargo';
        await showError('Error al crear', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al crear el cargo';
      await showError('Error', errorMessage);
      setError(errorMessage);
      console.error('Error al crear cargo:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoName.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre del cargo es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo_14: cargoName.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Error HTTP: ${response.status}`;
        await showError('Error al actualizar', errorMessage);
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchCargos();
        setCargoName('');
        setEditingId(null);
        setShowForm(false);
        await showSuccess('¡Cargo actualizado!', 'El cargo ha sido actualizado correctamente.');
      } else {
        const errorMessage = data.error || data.message || 'Error al actualizar el cargo';
        await showError('Error al actualizar', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al actualizar el cargo';
      await showError('Error', errorMessage);
      setError(errorMessage);
      console.error('Error al actualizar cargo:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este cargo');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchCargos();
        await showSuccess('¡Cargo eliminado!', 'El cargo ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el cargo');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el cargo');
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

  const handleExport = async () => {
    const dataToExport = filteredAndSortedCargos.map(c => ({
      ID: c.idcargo_14,
      Cargo: c.cargo_14
    }));
    exportToExcel(dataToExport, 'cargos', 'Cargos');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>👔 Gestión de Cargos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={showCreateForm}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
            type="button"
          >
            💾 Guardar
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📊 Exportar
          </button>
          <button className="btn-secondary" onClick={cancelForm}>
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Editar Cargo' : '➕ Nuevo Cargo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="cargo">Nombre del Cargo: *</label>
              <input
                type="text"
                id="cargo"
                className="form-input"
                value={cargoName}
                onChange={(e) => setCargoName(e.target.value.toUpperCase())}
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

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentCargos.length} de {filteredAndSortedCargos.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar cargo..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value.toUpperCase());
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar cargo"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('idcargo_14')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('idcargo_14')}
              </th>
              <th onClick={() => handleSort('cargo_14')} className="sortable" style={{ cursor: 'pointer' }}>
                CARGO {getSortIndicator('cargo_14')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && cargos.length === 0 ? (
              <tr><td colSpan={3}>Cargando...</td></tr>
            ) : currentCargos.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron cargos con "${searchTerm}"`
                    : '📋 No hay cargos registrados'}
                </td>
              </tr>
            ) : (
              currentCargos.map((cargo) => (
                <tr key={cargo.idcargo_14}>
                  <td>{cargo.idcargo_14}</td>
                  <td className="cargo-name">{cargo.cargo_14}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(cargo)} title="Editar" aria-label="Editar cargo">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(cargo.idcargo_14)} title="Eliminar" aria-label="Eliminar cargo">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
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
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{ padding: '8px 15px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((numPagina) => (
              <button
                key={numPagina}
                onClick={() => setCurrentPage(numPagina)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: currentPage === numPagina ? '#007bff' : 'white',
                  color: currentPage === numPagina ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontWeight: currentPage === numPagina ? 'bold' : 'normal'
                }}
                aria-label={`Ir a página ${numPagina}`}
                aria-current={currentPage === numPagina ? 'page' : undefined}
              >
                {numPagina}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
            style={{ padding: '8px 15px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
          <div style={{ marginLeft: '15px', color: '#6c757d' }}>
            Página {currentPage} de {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

export default CargoView;
