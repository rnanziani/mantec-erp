import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './CcostoView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface Ccosto {
  id_ccosto_45: number;
  ccosto_45: string;
  activo_45: boolean;
  fecha_estado_45?: string;
  usuario_estado_45?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof Ccosto;

const CcostoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Ccosto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [activo, setActivo] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'id_ccosto_45',
    direction: 'asc'
  });

  const API_URL = apiUrl('/ccostos');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<Ccosto[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        setError('Error al cargar centros de costo');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const list = items.filter((i) => i.ccosto_45.toLowerCase().includes(searchTerm.toLowerCase()));
    list.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
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
    if (!name.trim()) {
      await showError('Campo requerido', 'El nombre del centro de costo es requerido');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccosto_45: name.trim().toUpperCase(), activo_45: activo })
      });
      const data: ApiResponse<Ccosto> = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('¡Centro de costo creado!', 'El centro de costo ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear centro de costo');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear centro de costo');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre del centro de costo es requerido');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccosto_45: name.trim().toUpperCase(), activo_45: activo })
      });
      const data: ApiResponse<Ccosto> = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('¡Centro de costo actualizado!', 'El centro de costo ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar centro de costo');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar centro de costo');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este centro de costo');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('¡Centro de costo eliminado!', 'El centro de costo ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar centro de costo');
      }
    } catch {
      await showError('Error', 'Error al eliminar centro de costo');
    }
  };

  const startEdit = (c: Ccosto) => {
    setEditingId(c.id_ccosto_45);
    setName(c.ccosto_45);
    setActivo(c.activo_45 !== false);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setName('');
    setActivo(true);
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
    const dataToExport = filteredAndSorted.map((c) => ({
      ID: c.id_ccosto_45,
      CentroCosto: c.ccosto_45,
      Estado: c.activo_45 !== false ? 'Activo' : 'Inactivo',
      FechaEstado: c.fecha_estado_45 ? new Date(c.fecha_estado_45).toLocaleString('es-CL') : '-',
      UsuarioEstado: c.usuario_estado_45 || '-'
    }));
    exportToExcel(dataToExport, 'ccostos', 'CentrosCosto');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🏷️ Gestión de Centros de Costo</h2>
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
          <h3>{editingId ? '✏️ Editar Centro de Costo' : '➕ Nuevo Centro de Costo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="ccosto">Nombre: *</label>
              <input
                type="text"
                id="ccosto"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="Ej: MANTENCIÓN, OPERACIONES..."
                style={{ textTransform: 'uppercase' }}
                required
                autoFocus
              />
            </div>
            <div className="form-group checkbox-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  aria-label="Centro de costo activo"
                />
                Activo
              </label>
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
          placeholder="🔍 Buscar centro de costo..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar centro de costo"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_ccosto_45')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_ccosto_45')}
              </th>
              <th onClick={() => handleSort('ccosto_45')} className="sortable" style={{ cursor: 'pointer' }}>
                CENTRO DE COSTO {getSortIndicator('ccosto_45')}
              </th>
              <th onClick={() => handleSort('activo_45')} className="sortable" style={{ cursor: 'pointer' }}>
                ESTADO {getSortIndicator('activo_45')}
              </th>
              <th>FECHA ESTADO</th>
              <th>USUARIO ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr><td colSpan={6}>Cargando...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron centros de costo con "${searchTerm}"`
                    : '📋 No hay centros de costo registrados'}
                </td>
              </tr>
            ) : (
              currentItems.map((c) => (
                <tr key={c.id_ccosto_45}>
                  <td>{c.id_ccosto_45}</td>
                  <td className="ccosto-name">{c.ccosto_45}</td>
                  <td>
                    <span className={`badge ${c.activo_45 !== false ? 'badge-success' : 'badge-danger'}`}>
                      {c.activo_45 !== false ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td>{c.fecha_estado_45 ? new Date(c.fecha_estado_45).toLocaleString('es-CL') : '-'}</td>
                  <td>{c.usuario_estado_45 || '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(c)} title="Editar" aria-label="Editar centro de costo">
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(c.id_ccosto_45)}
                      title="Eliminar"
                      aria-label="Eliminar centro de costo"
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

export default CcostoView;
