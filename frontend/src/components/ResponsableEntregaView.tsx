import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './CargoView.css';
import { useToast } from '../context/ToastContext';
import { showDeleteConfirm } from '../utils/swal';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface ResponsableEntrega {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  nombre_completo?: string;
}

interface ApiResponse {
  success: boolean;
  data?: ResponsableEntrega[] | ResponsableEntrega;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof ResponsableEntrega;
  direction: 'asc' | 'desc';
};

const ResponsableEntregaView: React.FC = () => {
  const [responsables, setResponsables] = useState<ResponsableEntrega[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [apaterno, setAPaterno] = useState<string>('');
  const [amaterno, setAMaterno] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'idresponsableentrega_08', direction: 'asc' });

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/responsables-entrega';

  useEffect(() => {
    fetchResponsables();
  }, []);

  const fetchResponsables = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setResponsables(data.data);
      } else {
        setError(data.error || 'Error al cargar los responsables');
        setResponsables([]);
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
      console.error('Error al cargar responsables:', err);
      setResponsables([]);
    } finally {
      setLoading(false);
    }
  };

  const getNombreCompleto = useCallback((r: ResponsableEntrega): string => {
    return r.nombre_completo || [r.nombreresponsableentrega_08, r.apaternoresponsableentrega_08, r.amaternoresponsableentrega_08]
      .filter(Boolean)
      .join(' ')
      .trim() || r.nombreresponsableentrega_08;
  }, []);

  const filteredAndSorted = useMemo(() => {
    let filtered = responsables.filter(r => {
      const fullName = getNombreCompleto(r).toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });

    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [responsables, searchTerm, sortConfig, getNombreCompleto]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof ResponsableEntrega) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreresponsableentrega_08: nombre.trim(),
          apaternoresponsableentrega_08: apaterno.trim() || undefined,
          amaternoresponsableentrega_08: amaterno.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Error al crear', 'error');
        setError(data.error || '');
        return;
      }

      if (data.success) {
        await fetchResponsables();
        resetForm();
        showToast('Responsable creado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al crear', 'error');
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || editingId === null) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreresponsableentrega_08: nombre.trim(),
          apaternoresponsableentrega_08: apaterno.trim() || undefined,
          amaternoresponsableentrega_08: amaterno.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Error al actualizar', 'error');
        setError(data.error || '');
        return;
      }

      if (data.success) {
        await fetchResponsables();
        resetForm();
        showToast('Responsable actualizado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al actualizar', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al actualizar', 'error');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este responsable de entrega');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchResponsables();
        showToast('Responsable eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar', 'error');
      console.error(err);
    }
  };

  const resetForm = () => {
    setNombre('');
    setAPaterno('');
    setAMaterno('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (r: ResponsableEntrega) => {
    setEditingId(r.idresponsableentrega_08);
    setNombre(r.nombreresponsableentrega_08 || '');
    setAPaterno(r.apaternoresponsableentrega_08 || '');
    setAMaterno(r.amaternoresponsableentrega_08 || '');
    setShowForm(true);
    setError('');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSorted.map(r => ({
      ID: r.idresponsableentrega_08,
      Nombre: r.nombreresponsableentrega_08,
      'Apellido Paterno': r.apaternoresponsableentrega_08 || '',
      'Apellido Materno': r.amaternoresponsableentrega_08 || '',
      'Nombre Completo': getNombreCompleto(r)
    }));
    exportToExcel(dataToExport, 'responsables-entrega', 'Responsables de Entrega');
    showToast('Datos exportados exitosamente', 'success');
  };

  return (
    <div className="cargo-container fade-in">
      <div className="cargo-header">
        <h2>📋 Responsables de Entrega</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                📊 Exportar
              </button>
              <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                ➕ Nuevo Responsable
              </button>
            </>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="search-section">
          <SearchBar
            placeholder="Buscar por nombre o apellidos..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="results-info">
            {filteredAndSorted.length} resultado{filteredAndSorted.length !== 1 ? 's' : ''}
            {searchTerm && ` para "${searchTerm}"`}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error fade-in">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="form-card fade-in">
          <h3>{editingId ? '✏️ Editar Responsable' : '➕ Nuevo Responsable'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="nombre">Nombre *</label>
              <input
                type="text"
                id="nombre"
                className="form-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                required
                autoFocus
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="apaterno">Apellido Paterno</label>
              <input
                type="text"
                id="apaterno"
                className="form-input"
                value={apaterno}
                onChange={(e) => setAPaterno(e.target.value)}
                placeholder="Ej: González"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="amaterno">Apellido Materno</label>
              <input
                type="text"
                id="amaterno"
                className="form-input"
                value={amaterno}
                onChange={(e) => setAMaterno(e.target.value)}
                placeholder="Ej: Pérez"
                maxLength={100}
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
        <div className="loading">⏳ Cargando responsables...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="cargo-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('idresponsableentrega_08')}
                    className={`sortable ${sortConfig.key === 'idresponsableentrega_08' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ID
                  </th>
                  <th
                    onClick={() => handleSort('nombreresponsableentrega_08')}
                    className={`sortable ${sortConfig.key === 'nombreresponsableentrega_08' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    NOMBRE
                  </th>
                  <th>APELLIDO PATERNO</th>
                  <th>APELLIDO MATERNO</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron responsables con "${searchTerm}"`
                        : '📋 No hay responsables registrados'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((r) => (
                    <tr key={r.idresponsableentrega_08} className="fade-in">
                      <td>{r.idresponsableentrega_08}</td>
                      <td className="cargo-name">{r.nombreresponsableentrega_08}</td>
                      <td>{r.apaternoresponsableentrega_08 || '-'}</td>
                      <td>{r.amaternoresponsableentrega_08 || '-'}</td>
                      <td className="actions">
                        <button className="btn-edit" onClick={() => startEdit(r)} title="Editar">✏️</button>
                        <button className="btn-delete" onClick={() => handleDelete(r.idresponsableentrega_08)} title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredAndSorted.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSorted.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ResponsableEntregaView;
