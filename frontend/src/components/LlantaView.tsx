import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';

interface Llanta {
  id_llanta_36: number;
  descripcion_llanta_36: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

type SortKey = keyof Llanta;

const LlantaView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [llantas, setLlantas] = useState<Llanta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'descripcion_llanta_36',
    direction: 'asc'
  });

  const API_URL = 'http://localhost:3001/api/llantas';

  useEffect(() => {
    fetchLlantas();
  }, []);

  const fetchLlantas = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<Llanta[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLlantas(data.data);
      } else {
        setError('Error al cargar las llantas');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = llantas.filter((l) => l.descripcion_llanta_36.toLowerCase().includes(q));
    list.sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      const aVal = av === null || av === undefined ? '' : String(av);
      const bVal = bv === null || bv === undefined ? '' : String(bv);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [llantas, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage((p) => {
      const tp = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
      return p > tp ? tp : p;
    });
  }, [filteredAndSorted.length, itemsPerPage]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      await showError('Campo requerido', 'La descripción es requerida');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion_llanta_36: descripcion.trim() })
      });
      const data: ApiResponse<Llanta> = await res.json();
      if (data.success) {
        await fetchLlantas();
        resetForm();
        await showSuccess('¡Llanta creada!', 'El registro ha sido guardado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear la llanta');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear la llanta');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || editingId === null) {
      await showError('Campo requerido', 'La descripción es requerida');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion_llanta_36: descripcion.trim() })
      });
      const data: ApiResponse<Llanta> = await res.json();
      if (data.success) {
        await fetchLlantas();
        resetForm();
        await showSuccess('¡Llanta actualizada!', 'El registro ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar la llanta');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar la llanta');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta llanta');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchLlantas();
        await showSuccess('¡Eliminado!', 'La llanta ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar la llanta');
      }
    } catch {
      await showError('Error', 'Error al eliminar la llanta');
    }
  };

  const startEdit = (row: Llanta) => {
    setEditingId(row.id_llanta_36);
    setDescripcion(row.descripcion_llanta_36);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setDescripcion('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map((l) => ({
      ID: l.id_llanta_36,
      Descripción: l.descripcion_llanta_36
    }));
    exportToExcel(dataToExport, 'llantas', 'Llantas');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🛞 Gestión de Llantas</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={showCreateForm}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
          >
            💾 Guardar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleExport}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📊 Exportar
          </button>
          <button type="button" className="btn-secondary" onClick={cancelForm}>
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
          <h3>{editingId ? '✏️ Editar Llanta' : '➕ Nueva Llanta'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="llanta-descripcion">Descripción *</label>
              <textarea
                id="llanta-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción de la llanta..."
                rows={3}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '72px'
                }}
                aria-required="true"
              />
            </div>
            <div className="form-actions" style={{ marginTop: '12px' }}>
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
        <input
          type="search"
          placeholder="🔍 Buscar por descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar llanta"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('id_llanta_36')}
                className={`sortable ${sortConfig.key === 'id_llanta_36' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                ID {getSortIndicator('id_llanta_36')}
              </th>
              <th
                onClick={() => handleSort('descripcion_llanta_36')}
                className={`sortable ${sortConfig.key === 'descripcion_llanta_36' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                DESCRIPCIÓN {getSortIndicator('descripcion_llanta_36')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && llantas.length === 0 ? (
              <tr>
                <td colSpan={3}>Cargando...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron registros con "${searchTerm}"`
                    : '📋 No hay llantas registradas'}
                </td>
              </tr>
            ) : (
              currentItems.map((l) => (
                <tr key={l.id_llanta_36}>
                  <td>{l.id_llanta_36}</td>
                  <td className="categoria-name" style={{ whiteSpace: 'pre-wrap' }}>
                    {l.descripcion_llanta_36}
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(l)}
                      title="Editar"
                      aria-label="Editar llanta"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(l.id_llanta_36)}
                      title="Eliminar"
                      aria-label="Eliminar llanta"
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

      {filteredAndSorted.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSorted.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default LlantaView;
