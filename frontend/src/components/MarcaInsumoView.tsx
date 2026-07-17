import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './MarcaInsumoView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface MarcaInsumo {
  id_marca_insumo_37: number;
  marca_insumo_37: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof MarcaInsumo;

const MarcaInsumoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [marcas, setMarcas] = useState<MarcaInsumo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [marcaName, setMarcaName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'id_marca_insumo_37',
    direction: 'asc'
  });

  const API_URL = apiUrl('/marcas-insumo');

  useEffect(() => {
    fetchMarcas();
  }, []);

  const fetchMarcas = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<MarcaInsumo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data);
      } else {
        setError('Error al cargar las marcas de insumo');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const list = marcas.filter((m) =>
      m.marca_insumo_37.toLowerCase().includes(searchTerm.toLowerCase())
    );
    list.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [marcas, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
    if (!marcaName.trim()) {
      await showError('Campo requerido', 'El nombre de la marca es requerido');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_insumo_37: marcaName.trim().toUpperCase() })
      });
      const data: ApiResponse<MarcaInsumo> = await res.json();
      if (data.success) {
        await fetchMarcas();
        resetForm();
        await showSuccess('¡Marca creada!', 'La marca de insumo ha sido registrada correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear la marca de insumo');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear la marca de insumo');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaName.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre de la marca es requerido');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_insumo_37: marcaName.trim().toUpperCase() })
      });
      const data: ApiResponse<MarcaInsumo> = await res.json();
      if (data.success) {
        await fetchMarcas();
        resetForm();
        await showSuccess('¡Marca actualizada!', 'La marca de insumo ha sido actualizada correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar la marca de insumo');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar la marca de insumo');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta marca de insumo');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchMarcas();
        await showSuccess('¡Marca eliminada!', 'La marca de insumo ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar la marca de insumo');
      }
    } catch {
      await showError('Error', 'Error al eliminar la marca de insumo');
    }
  };

  const startEdit = (m: MarcaInsumo) => {
    setEditingId(m.id_marca_insumo_37);
    setMarcaName(m.marca_insumo_37);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setMarcaName('');
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
    const dataToExport = filteredAndSorted.map((m) => ({
      ID: m.id_marca_insumo_37,
      Marca: m.marca_insumo_37
    }));
    exportToExcel(dataToExport, 'marcas-insumo', 'MarcasInsumo');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🏷️ Gestión de Marcas de Insumo</h2>
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
          <h3>{editingId ? '✏️ Editar Marca de Insumo' : '➕ Nueva Marca de Insumo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="marca">Nombre de la marca: *</label>
              <input
                type="text"
                id="marca"
                className="form-input"
                value={marcaName}
                onChange={(e) => setMarcaName(e.target.value.toUpperCase())}
                placeholder="Ej: GENERICA/O, BOSCH..."
                style={{ textTransform: 'uppercase' }}
                maxLength={100}
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

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentItems.length} de {filteredAndSorted.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar marca..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value.toUpperCase());
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase' }}
          aria-label="Buscar marca de insumo"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_marca_insumo_37')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_marca_insumo_37')}
              </th>
              <th onClick={() => handleSort('marca_insumo_37')} className="sortable" style={{ cursor: 'pointer' }}>
                MARCA {getSortIndicator('marca_insumo_37')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && marcas.length === 0 ? (
              <tr><td colSpan={3}>Cargando...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron marcas con "${searchTerm}"`
                    : '📋 No hay marcas de insumo registradas'}
                </td>
              </tr>
            ) : (
              currentItems.map((m) => (
                <tr key={m.id_marca_insumo_37}>
                  <td>{m.id_marca_insumo_37}</td>
                  <td className="marca-insumo-name">{m.marca_insumo_37}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(m)} title="Editar" aria-label="Editar marca de insumo">
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(m.id_marca_insumo_37)}
                      title="Eliminar"
                      aria-label="Eliminar marca de insumo"
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

export default MarcaInsumoView;
