import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './TipoCompAlternadorView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface TipoCompAlternador {
  id_tipo_comp_alternador_30: number;
  tipo_comp_alternador_30: string;
}

interface ApiResponse {
  success: boolean;
  data?: TipoCompAlternador[] | TipoCompAlternador;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof TipoCompAlternador;
  direction: 'asc' | 'desc';
};

const TipoCompAlternadorView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [tipos, setTipos] = useState<TipoCompAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tipoId, setTipoId] = useState<number>(0);
  const [tipoNombre, setTipoNombre] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_tipo_comp_alternador_30', direction: 'asc' });

  const API_URL = apiUrl('/tipos-comp-alternador');

  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTipos(data.data);
      } else {
        setError('Error al cargar los tipos de componente');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTipos = useMemo(() => {
    let filtered = tipos.filter(tipo =>
      tipo.tipo_comp_alternador_30.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.id_tipo_comp_alternador_30.toString().includes(searchTerm)
    );

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tipos, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTipos = filteredAndSortedTipos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedTipos.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof TipoCompAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof TipoCompAlternador) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId || tipoId === 0) {
      await showError('Campo requerido', 'El ID del tipo de componente es requerido');
      return;
    }
    if (!tipoNombre.trim()) {
      await showError('Campo requerido', 'El nombre del tipo de componente es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tipo_comp_alternador_30: tipoId,
          tipo_comp_alternador_30: tipoNombre.trim()
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTipos();
        resetForm();
        await showSuccess('¡Tipo creado!', 'El tipo de componente ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear el tipo de componente');
        setError(data.error || '');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el tipo de componente');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoNombre.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre del tipo es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_comp_alternador_30: tipoNombre.trim() })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTipos();
        resetForm();
        await showSuccess('¡Tipo actualizado!', 'El tipo de componente ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar el tipo de componente');
        setError(data.error || '');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el tipo de componente');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este tipo de componente');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTipos();
        await showSuccess('¡Tipo eliminado!', 'El tipo de componente ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el tipo de componente');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el tipo de componente');
      console.error('Error:', err);
    }
  };

  const startEdit = (tipo: TipoCompAlternador) => {
    setEditingId(tipo.id_tipo_comp_alternador_30);
    setTipoId(tipo.id_tipo_comp_alternador_30);
    setTipoNombre(tipo.tipo_comp_alternador_30);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setTipoId(0);
    setTipoNombre('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setTipoId(0);
    setTipoNombre('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    resetForm();
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedTipos.map(t => ({
      ID: t.id_tipo_comp_alternador_30,
      'Tipo Componente': t.tipo_comp_alternador_30
    }));
    exportToExcel(dataToExport, 'tipos-comp-alternador', 'Tipos de Componente Alternador');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🔧 Gestión de Tipos de Componente Alternador</h2>
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
          <h3>{editingId ? '✏️ Editar Tipo de Componente' : '➕ Nuevo Tipo de Componente'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            {!editingId && (
              <div className="form-group">
                <label htmlFor="tipoId">ID del Tipo: *</label>
                <input
                  type="number"
                  id="tipoId"
                  className="form-input"
                  value={tipoId || ''}
                  onChange={(e) => setTipoId(parseInt(e.target.value) || 0)}
                  placeholder="Ej: 1, 2, 3..."
                  min={1}
                  required
                  autoFocus
                />
                <small style={{ display: 'block', marginTop: '4px', color: '#6c757d', fontSize: '0.85rem' }}>
                  💡 El ID debe ser único y no puede ser modificado después de crear
                </small>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="tipoNombre">Nombre del Tipo: *</label>
              <input
                type="text"
                id="tipoNombre"
                className="form-input"
                value={tipoNombre}
                onChange={(e) => setTipoNombre(e.target.value)}
                placeholder="Ej: Original, Reconstruido, Reparado..."
                required
                autoFocus={!!editingId}
                maxLength={50}
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
            Mostrando {currentTipos.length} de {filteredAndSortedTipos.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por ID o nombre..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar tipo de componente"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_tipo_comp_alternador_30')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_tipo_comp_alternador_30')}
              </th>
              <th onClick={() => handleSort('tipo_comp_alternador_30')} className="sortable" style={{ cursor: 'pointer' }}>
                TIPO COMPONENTE {getSortIndicator('tipo_comp_alternador_30')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && tipos.length === 0 ? (
              <tr><td colSpan={3}>Cargando...</td></tr>
            ) : currentTipos.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron tipos con "${searchTerm}"`
                    : '📋 No hay tipos de componente registrados'}
                </td>
              </tr>
            ) : (
              currentTipos.map((tipo) => (
                <tr key={tipo.id_tipo_comp_alternador_30}>
                  <td>{tipo.id_tipo_comp_alternador_30}</td>
                  <td className="tipo-name">{tipo.tipo_comp_alternador_30}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(tipo)} title="Editar" aria-label="Editar tipo">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(tipo.id_tipo_comp_alternador_30)} title="Eliminar" aria-label="Eliminar tipo">
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

export default TipoCompAlternadorView;
