import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './BodegaView.css';
import './ResponsableEntregaView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';

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
  const formRef = React.useRef<HTMLFormElement>(null);
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

  const getSortIndicator = (key: keyof ResponsableEntrega) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      await showError('Campo requerido', 'El nombre es requerido');
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
        await showError('Error al crear', data.error || 'Error al crear');
        setError(data.error || '');
        return;
      }

      if (data.success) {
        await fetchResponsables();
        resetForm();
        await showSuccess('¡Responsable creado!', 'El responsable ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear');
        setError(data.error || '');
      }
    } catch (err) {
      await showError('Error', 'Error de conexión al crear');
      setError('Error de conexión');
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre es requerido');
      return;
    }

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
        await showError('Error al actualizar', data.error || 'Error al actualizar');
        setError(data.error || '');
        return;
      }

      if (data.success) {
        await fetchResponsables();
        resetForm();
        await showSuccess('¡Responsable actualizado!', 'El responsable ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar');
        setError(data.error || '');
      }
    } catch (err) {
      await showError('Error', 'Error de conexión al actualizar');
      setError('Error de conexión');
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
        await showSuccess('¡Responsable eliminado!', 'El responsable ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar');
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

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
  };

  const startEdit = (r: ResponsableEntrega) => {
    setEditingId(r.idresponsableentrega_08);
    setNombre(r.nombreresponsableentrega_08 || '');
    setAPaterno(r.apaternoresponsableentrega_08 || '');
    setAMaterno(r.amaternoresponsableentrega_08 || '');
    setShowForm(true);
    setError('');
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map(r => ({
      ID: r.idresponsableentrega_08,
      Nombre: r.nombreresponsableentrega_08,
      'Apellido Paterno': r.apaternoresponsableentrega_08 || '',
      'Apellido Materno': r.amaternoresponsableentrega_08 || '',
      'Nombre Completo': getNombreCompleto(r)
    }));
    exportToExcel(dataToExport, 'responsables-entrega', 'Responsables de Entrega');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📋 Responsables de Entrega</h2>
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
          <h3>{editingId ? '✏️ Editar Responsable' : '➕ Nuevo Responsable'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="nombre">Nombre: *</label>
                <input
                  type="text"
                  id="nombre"
                  className="form-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  placeholder="Ej: Juan"
                  required
                  autoFocus
                  maxLength={100}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="apaterno">Apellido Paterno:</label>
                <input
                  type="text"
                  id="apaterno"
                  className="form-input"
                  value={apaterno}
                  onChange={(e) => setAPaterno(e.target.value.toUpperCase())}
                  placeholder="Ej: González"
                  maxLength={100}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="amaterno">Apellido Materno:</label>
                <input
                  type="text"
                  id="amaterno"
                  className="form-input"
                  value={amaterno}
                  onChange={(e) => setAMaterno(e.target.value.toUpperCase())}
                  placeholder="Ej: Pérez"
                  maxLength={100}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
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
          placeholder="🔍 Buscar por nombre o apellidos..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar responsable"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('idresponsableentrega_08')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('idresponsableentrega_08')}
              </th>
              <th onClick={() => handleSort('nombreresponsableentrega_08')} className="sortable" style={{ cursor: 'pointer' }}>
                NOMBRE {getSortIndicator('nombreresponsableentrega_08')}
              </th>
              <th onClick={() => handleSort('apaternoresponsableentrega_08')} className="sortable" style={{ cursor: 'pointer' }}>
                APELLIDO PATERNO {getSortIndicator('apaternoresponsableentrega_08')}
              </th>
              <th onClick={() => handleSort('amaternoresponsableentrega_08')} className="sortable" style={{ cursor: 'pointer' }}>
                APELLIDO MATERNO {getSortIndicator('amaternoresponsableentrega_08')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && responsables.length === 0 ? (
              <tr><td colSpan={5}>Cargando...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron responsables con "${searchTerm}"`
                    : '📋 No hay responsables registrados'}
                </td>
              </tr>
            ) : (
              currentItems.map((r) => (
                <tr key={r.idresponsableentrega_08}>
                  <td>{r.idresponsableentrega_08}</td>
                  <td className="responsable-nombre">{r.nombreresponsableentrega_08}</td>
                  <td>{r.apaternoresponsableentrega_08 || '-'}</td>
                  <td>{r.amaternoresponsableentrega_08 || '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(r)} title="Editar" aria-label="Editar responsable">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(r.idresponsableentrega_08)} title="Eliminar" aria-label="Eliminar responsable">
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

export default ResponsableEntregaView;
