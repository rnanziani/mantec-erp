import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './EstadoAlternadorView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface EstadoAlternador {
  id_estado_20: number;
  estado_20: string;
  descripcion_20?: string;
}

interface ApiResponse {
  success: boolean;
  data?: EstadoAlternador[] | EstadoAlternador;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof EstadoAlternador;
  direction: 'asc' | 'desc';
};

const EstadoAlternadorView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [estados, setEstados] = useState<EstadoAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [estadoName, setEstadoName] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_estado_20', direction: 'asc' });

  const API_URL = apiUrl('/estados');

  useEffect(() => {
    fetchEstados();
  }, []);

  const fetchEstados = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setEstados(data.data);
      } else {
        setError('Error al cargar los estados');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedEstados = useMemo(() => {
    let filtered = estados.filter(estado =>
      estado.estado_20.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (estado.descripcion_20 && estado.descripcion_20.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [estados, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEstados = filteredAndSortedEstados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedEstados.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof EstadoAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof EstadoAlternador) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoName.trim()) {
      await showError('Campo requerido', 'El nombre del estado es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_20: estadoName.trim(),
          descripcion_20: descripcion.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        setEstadoName('');
        setDescripcion('');
        setShowForm(false);
        await showSuccess('¡Estado creado!', 'El estado ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear el estado');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el estado');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoName.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre del estado es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_20: estadoName.trim(),
          descripcion_20: descripcion.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        setEstadoName('');
        setDescripcion('');
        setEditingId(null);
        setShowForm(false);
        await showSuccess('¡Estado actualizado!', 'El estado ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar el estado');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el estado');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este estado');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        await showSuccess('¡Estado eliminado!', 'El estado ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el estado');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el estado');
      console.error('Error:', err);
    }
  };

  const startEdit = (estado: EstadoAlternador) => {
    setEditingId(estado.id_estado_20);
    setEstadoName(estado.estado_20);
    setDescripcion(estado.descripcion_20 || '');
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setEstadoName('');
    setDescripcion('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setEstadoName('');
    setDescripcion('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedEstados.map((e) => ({
      ID: e.id_estado_20,
      Estado: e.estado_20,
      Descripción: e.descripcion_20 || ''
    }));
    exportToExcel(dataToExport, 'estados-alternador', 'Estados');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🔄 Gestión de Estados de Alternador</h2>
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
          <h3>{editingId ? '✏️ Editar Estado' : '➕ Nuevo Estado'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="estado">Nombre del Estado: *</label>
              <input
                type="text"
                id="estado"
                className="form-input"
                value={estadoName}
                onChange={(e) => setEstadoName(e.target.value)}
                placeholder="Ej: Operativo, En Reparación, Fuera de Servicio..."
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="descripcion">Descripción:</label>
              <textarea
                id="descripcion"
                className="form-input"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional del estado..."
                rows={3}
                style={{ resize: 'vertical' }}
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
            Mostrando {currentEstados.length} de {filteredAndSortedEstados.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar estado o descripción..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_estado_20')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_estado_20')}
              </th>
              <th onClick={() => handleSort('estado_20')} className="sortable" style={{ cursor: 'pointer' }}>
                ESTADO {getSortIndicator('estado_20')}
              </th>
              <th onClick={() => handleSort('descripcion_20')} className="sortable" style={{ cursor: 'pointer' }}>
                DESCRIPCIÓN {getSortIndicator('descripcion_20')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && estados.length === 0 ? (
              <tr><td colSpan={4}>Cargando...</td></tr>
            ) : currentEstados.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron estados con "${searchTerm}"`
                    : '📋 No hay estados registrados'}
                </td>
              </tr>
            ) : (
              currentEstados.map((estado) => (
                <tr key={estado.id_estado_20}>
                  <td>{estado.id_estado_20}</td>
                  <td className="estado-name">{estado.estado_20}</td>
                  <td className="estado-descripcion">{estado.descripcion_20 || '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(estado)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(estado.id_estado_20)} title="Eliminar">
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

export default EstadoAlternadorView;
