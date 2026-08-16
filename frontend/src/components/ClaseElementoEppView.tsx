import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './ClaseElementoEppView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface ClaseElementoEpp {
  idclase_56: number;
  clase_56: string;
  descripcion_56?: string | null;
  activo_56: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  clase_56: '',
  descripcion_56: '',
  activo_56: true,
};

const ClaseElementoEppView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<ClaseElementoEpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClaseElementoEpp;
    direction: 'asc' | 'desc';
  }>({ key: 'idclase_56', direction: 'desc' });

  const API_URL = apiUrl('/epp-clases');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<ClaseElementoEpp[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar clases');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = items.filter((t) => {
      if (!q) return true;
      return (
        t.clase_56.toLowerCase().includes(q) ||
        (t.descripcion_56 || '').toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortConfig.direction === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      const cmp = String(aValue).localeCompare(String(bValue), 'es', {
        sensitivity: 'base',
        numeric: true,
      });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [items, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof ClaseElementoEpp) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof ClaseElementoEpp) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (t: ClaseElementoEpp) => {
    setEditingId(t.idclase_56);
    setForm({
      clase_56: t.clase_56,
      descripcion_56: t.descripcion_56 || '',
      activo_56: t.activo_56,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clase_56.trim()) {
      await showError('Validación', 'La clase es requerida');
      return;
    }
    const payload = {
      clase_56: form.clase_56.trim().toUpperCase(),
      descripcion_56: form.descripcion_56.trim().toUpperCase() || null,
      activo_56: form.activo_56,
    };
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        resetForm();
        await showSuccess(editingId ? 'Actualizado' : 'Creado', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('esta clase de elemento');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Eliminado', data.message || 'Clase eliminada');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = async () => {
    await exportToExcel(
      filteredAndSorted.map((t) => ({
        ID: t.idclase_56,
        Clase: t.clase_56,
        Descripción: t.descripcion_56 || '',
        Activo: t.activo_56 ? 'Sí' : 'No',
      })),
      'clases-elemento-epp'
    );
  };

  if (loading) return <div className="loading">Cargando clases...</div>;

  return (
    <div className="bodega-view clase-elemento-epp-view">
      <div className="view-header">
        <h2>Clases de Elemento (EPP / Ropa de Trabajo)</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + Nuevo
          </button>
          <button type="button" className="btn-success" onClick={() => formRef.current?.requestSubmit()} disabled={!showForm}>
            Guardar
          </button>
          <button type="button" className="btn-info" onClick={handleExport}>Exportar</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar clase' : 'Nueva clase'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="clase_56">Clase *</label>
                <input
                  id="clase_56"
                  className="form-input"
                  value={form.clase_56}
                  onChange={(e) => setForm((p) => ({ ...p, clase_56: e.target.value.toUpperCase() }))}
                  required
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label htmlFor="descripcion_56">Descripción</label>
                <input
                  id="descripcion_56"
                  className="form-input"
                  value={form.descripcion_56}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion_56: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_56">Activo</label>
                <select
                  id="activo_56"
                  className="form-input"
                  value={form.activo_56 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_56: e.target.value === '1' }))}
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Crear'}</button>
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="epp-toolbar">
        <p className="epp-total">
          Total: <strong>{filteredAndSorted.length}</strong> clases
        </p>
        <input
          type="search"
          className="form-input epp-search"
          placeholder="🔍 BUSCAR CLASE..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar clases de elemento"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className={sortClass('idclase_56')} onClick={() => handleSort('idclase_56')}>ID</th>
              <th className={sortClass('clase_56')} onClick={() => handleSort('clase_56')}>Clase</th>
              <th className={sortClass('descripcion_56')} onClick={() => handleSort('descripcion_56')}>Descripción</th>
              <th className={sortClass('activo_56')} onClick={() => handleSort('activo_56')}>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="epp-empty">No hay clases registradas</td>
              </tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.idclase_56}>
                  <td>{t.idclase_56}</td>
                  <td><strong>{t.clase_56}</strong></td>
                  <td>{t.descripcion_56 || '-'}</td>
                  <td>
                    <span className={t.activo_56 ? 'badge-activo' : 'badge-inactivo'}>
                      {t.activo_56 ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(t)} title="Editar" aria-label={`Editar ${t.clase_56}`}>✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(t.idclase_56)} title="Eliminar" aria-label={`Eliminar ${t.clase_56}`}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredAndSorted.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default ClaseElementoEppView;
