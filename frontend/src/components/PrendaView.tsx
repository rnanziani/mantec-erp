import React, { useEffect, useMemo, useRef, useState } from 'react';
import './BodegaView.css';
import './CategoriaView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';

interface Prenda {
  idprenda_07: number;
  prenda_07: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof Prenda;

const PrendaView: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [prendaNombre, setPrendaNombre] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'prenda_07',
    direction: 'asc'
  });

  const API_URL = 'http://localhost:3001/api/prendas';

  useEffect(() => {
    fetchPrendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrendas = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<Prenda[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setPrendas(data.data);
      else setError('Error al cargar las prendas');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = prendas.filter((p) => p.prenda_07.toLowerCase().includes(q));

    list.sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [prendas, searchTerm, sortConfig]);

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

  const resetForm = () => {
    setPrendaNombre('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (p: Prenda) => {
    setEditingId(p.idprenda_07);
    setPrendaNombre(p.prenda_07);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => resetForm();

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = prendaNombre.trim().toUpperCase();
    if (!nombre) {
      await showError('Campo requerido', 'El nombre de la prenda es requerido');
      return;
    }

    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenda_07: nombre })
      });
      const data: ApiResponse<Prenda> = await res.json();
      if (data.success) {
        await fetchPrendas();
        resetForm();
        await showSuccess('¡Prenda creada!', 'La prenda ha sido registrada correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear la prenda');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear la prenda');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = prendaNombre.trim().toUpperCase();
    if (!nombre || editingId === null) {
      await showError('Campo requerido', 'El nombre de la prenda es requerido');
      return;
    }

    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenda_07: nombre })
      });
      const data: ApiResponse<Prenda> = await res.json();
      if (data.success) {
        await fetchPrendas();
        resetForm();
        await showSuccess('¡Prenda actualizada!', 'La prenda ha sido actualizada correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar la prenda');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar la prenda');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta prenda');
    if (!confirmed) return;

    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchPrendas();
        await showSuccess('¡Prenda eliminada!', 'La prenda ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar la prenda');
      }
    } catch {
      await showError('Error', 'Error al eliminar la prenda');
    }
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map((p) => ({
      ID: p.idprenda_07,
      Prenda: p.prenda_07
    }));

    exportToExcel(dataToExport, 'prendas', 'Prendas');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>👕 Gestión de Prendas</h2>
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
          <h3>{editingId ? '✏️ Editar Prenda' : '➕ Nueva Prenda'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="prenda-nombre">Prenda *</label>
                <input
                  type="text"
                  id="prenda-nombre"
                  className="form-input"
                  value={prendaNombre}
                  onChange={(e) => setPrendaNombre(e.target.value.toUpperCase())}
                  placeholder="Ej: CAMISA, PANTALÓN..."
                  maxLength={100}
                  required
                  autoFocus
                  aria-required="true"
                />
              </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentItems.length} de {filteredAndSorted.length} registros
          </div>
        </div>

        <input
          type="search"
          placeholder="🔍 Buscar prenda..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar prenda"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('idprenda_07')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('idprenda_07')}
              </th>
              <th onClick={() => handleSort('prenda_07')} className="sortable" style={{ cursor: 'pointer' }}>
                PRENDA {getSortIndicator('prenda_07')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>

          <tbody>
            {loading && prendas.length === 0 ? (
              <tr>
                <td colSpan={3}>Cargando...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm ? `📋 No se encontraron prendas con "${searchTerm}"` : '📋 No hay prendas registradas'}
                </td>
              </tr>
            ) : (
              currentItems.map((p) => (
                <tr key={p.idprenda_07}>
                  <td>{p.idprenda_07}</td>
                  <td className="categoria-name">{p.prenda_07}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(p)}
                      title="Editar"
                      aria-label="Editar prenda"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(p.idprenda_07)}
                      title="Eliminar"
                      aria-label="Eliminar prenda"
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{
              padding: '8px 15px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
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
            style={{
              padding: '8px 15px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
};

export default PrendaView;

