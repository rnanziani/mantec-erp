import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof Empresa;

const EmpresaView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'idempresa_15',
    direction: 'asc'
  });

  const API_URL = apiUrl('/empresas');

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<Empresa[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmpresas(data.data);
      } else {
        setError(data.error || 'Error al cargar empresas');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const list = empresas.filter((e) =>
      e.nombreempresa_15.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.idempresa_15).includes(searchTerm)
    );
    list.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [empresas, searchTerm, sortConfig]);

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
    setNombre('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      await showError('Campo requerido', 'El nombre de la empresa es requerido');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreempresa_15: nombre.trim().toUpperCase() })
      });
      const data: ApiResponse<Empresa> = await res.json();
      if (data.success) {
        await fetchEmpresas();
        resetForm();
        await showSuccess('¡Empresa creada!', 'La empresa ha sido registrada correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear empresa');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear empresa');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre de la empresa es requerido');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreempresa_15: nombre.trim().toUpperCase() })
      });
      const data: ApiResponse<Empresa> = await res.json();
      if (data.success) {
        await fetchEmpresas();
        resetForm();
        await showSuccess('¡Empresa actualizada!', 'La empresa ha sido actualizada correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar empresa');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar empresa');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta empresa');
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchEmpresas();
        await showSuccess('¡Empresa eliminada!', 'La empresa ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar empresa');
      }
    } catch {
      await showError('Error', 'Error al eliminar empresa');
    }
  };

  const startEdit = (empresa: Empresa) => {
    setEditingId(empresa.idempresa_15);
    setNombre(empresa.nombreempresa_15.toUpperCase());
    setShowForm(true);
    setError('');
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map((e) => ({
      ID: e.idempresa_15,
      Empresa: e.nombreempresa_15
    }));
    exportToExcel(dataToExport, 'empresas', 'Empresas');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🏢 Gestión de Empresas</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ backgroundColor: '#007bff' }}
            type="button"
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
            type="button"
          >
            📊 Exportar
          </button>
          <button className="btn-secondary" onClick={resetForm} type="button">
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
          <h3>{editingId ? '✏️ Editar Empresa' : '➕ Nueva Empresa'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="nombreempresa">Nombre: *</label>
              <input
                type="text"
                id="nombreempresa"
                className="form-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                placeholder="Ej: TRANSANTIN S.A."
                maxLength={100}
                style={{ textTransform: 'uppercase' }}
                required
                autoFocus
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

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '10px' }}>
          Mostrando {currentItems.length} de {filteredAndSorted.length} registros
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase' }}
          aria-label="Buscar empresa"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('idempresa_15')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('idempresa_15')}
              </th>
              <th onClick={() => handleSort('nombreempresa_15')} className="sortable" style={{ cursor: 'pointer' }}>
                EMPRESA {getSortIndicator('nombreempresa_15')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && empresas.length === 0 ? (
              <tr><td colSpan={3}>Cargando...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron empresas con "${searchTerm}"`
                    : '📋 No hay empresas registradas'}
                </td>
              </tr>
            ) : (
              currentItems.map((empresa) => (
                <tr key={empresa.idempresa_15}>
                  <td>{empresa.idempresa_15}</td>
                  <td>{empresa.nombreempresa_15}</td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => startEdit(empresa)}
                      title="Editar"
                      aria-label={`Editar empresa ${empresa.nombreempresa_15}`}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(empresa.idempresa_15)}
                      title="Eliminar"
                      aria-label={`Eliminar empresa ${empresa.nombreempresa_15}`}
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
          borderRadius: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            type="button"
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          <span style={{ color: '#6c757d' }}>Página {currentPage} de {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
            type="button"
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
};

export default EmpresaView;
