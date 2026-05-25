import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './CategoriaView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface Talla {
  id_16: number;
  talla_16: string;
  tipo_16?: string | null;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof Talla;

const tipoLabel = (t: string | null | undefined): string => {
  if (t === 'alfabetica') return 'Alfabética';
  if (t === 'numerica') return 'Numérica';
  return '—';
};

const TallaView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tallaNombre, setTallaNombre] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'id_16',
    direction: 'asc'
  });

  const API_URL = apiUrl('/tallas');

  useEffect(() => {
    fetchTallas();
  }, []);

  const fetchTallas = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<Talla[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTallas(data.data);
      } else {
        setError('Error al cargar las tallas');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = tallas.filter((t) => {
      const tallaOk = t.talla_16.toLowerCase().includes(q);
      const tipoOk = (t.tipo_16 || '').toLowerCase().includes(q);
      return tallaOk || tipoOk;
    });
    list.sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      const aVal = av === null || av === undefined ? '' : av;
      const bVal = bv === null || bv === undefined ? '' : bv;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [tallas, searchTerm, sortConfig]);

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
    if (!tallaNombre.trim()) {
      await showError('Campo requerido', 'La talla es requerida');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talla_16: tallaNombre.trim(),
          tipo_16: tipo || null
        })
      });
      const data: ApiResponse<Talla> = await res.json();
      if (data.success) {
        await fetchTallas();
        resetForm();
        await showSuccess('¡Talla creada!', 'La talla ha sido registrada correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear la talla');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear la talla');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tallaNombre.trim() || editingId === null) {
      await showError('Campo requerido', 'La talla es requerida');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talla_16: tallaNombre.trim(),
          tipo_16: tipo || null
        })
      });
      const data: ApiResponse<Talla> = await res.json();
      if (data.success) {
        await fetchTallas();
        resetForm();
        await showSuccess('¡Talla actualizada!', 'La talla ha sido actualizada correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar la talla');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar la talla');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta talla');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchTallas();
        await showSuccess('¡Talla eliminada!', 'La talla ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar la talla');
      }
    } catch {
      await showError('Error', 'Error al eliminar la talla');
    }
  };

  const startEdit = (t: Talla) => {
    setEditingId(t.id_16);
    setTallaNombre(t.talla_16);
    setTipo(t.tipo_16 || '');
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setTallaNombre('');
    setTipo('');
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
    const dataToExport = filteredAndSorted.map((t) => ({
      ID: t.id_16,
      Talla: t.talla_16,
      Tipo: tipoLabel(t.tipo_16)
    }));
    exportToExcel(dataToExport, 'tallas', 'Tallas');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📏 Gestión de Tallas</h2>
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
          <h3>{editingId ? '✏️ Editar Talla' : '➕ Nueva Talla'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="talla-nombre">Talla *</label>
                <input
                  type="text"
                  id="talla-nombre"
                  className="form-input"
                  value={tallaNombre}
                  onChange={(e) => setTallaNombre(e.target.value)}
                  placeholder="Ej: M, 42, XL..."
                  maxLength={10}
                  required
                  autoFocus
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="talla-tipo">Tipo</label>
                <select
                  id="talla-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  title="Opcional: alfabetica o numerica según restricción CHECK en base de datos"
                  aria-label="Tipo de talla"
                >
                  <option value="">Sin clasificar</option>
                  <option value="alfabetica">alfabetica</option>
                  <option value="numerica">numerica</option>
                </select>
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
          placeholder="🔍 Buscar por talla o tipo..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar talla"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_16')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_16')}
              </th>
              <th onClick={() => handleSort('talla_16')} className="sortable" style={{ cursor: 'pointer' }}>
                TALLA {getSortIndicator('talla_16')}
              </th>
              <th onClick={() => handleSort('tipo_16')} className="sortable" style={{ cursor: 'pointer' }}>
                TIPO {getSortIndicator('tipo_16')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && tallas.length === 0 ? (
              <tr>
                <td colSpan={4}>Cargando...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron tallas con "${searchTerm}"`
                    : '📋 No hay tallas registradas'}
                </td>
              </tr>
            ) : (
              currentItems.map((t) => (
                <tr key={t.id_16}>
                  <td>{t.id_16}</td>
                  <td className="categoria-name">{t.talla_16}</td>
                  <td>{tipoLabel(t.tipo_16)}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(t)}
                      title="Editar"
                      aria-label="Editar talla"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(t.id_16)}
                      title="Eliminar"
                      aria-label="Eliminar talla"
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
            type="button"
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
                type="button"
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
            type="button"
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
          <div style={{ marginLeft: '15px', color: '#6c757d' }}>
            Página {currentPage} de {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

export default TallaView;
