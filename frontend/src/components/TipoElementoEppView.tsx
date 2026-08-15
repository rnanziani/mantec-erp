import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './TipoElementoEppView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface TipoElementoEpp {
  idtipo_elemento_51: number;
  tipo_elemento_51: string;
  descripcion_51?: string | null;
  activo_51: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  tipo_elemento_51: '',
  descripcion_51: '',
  activo_51: true,
};

const TipoElementoEppView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<TipoElementoEpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TipoElementoEpp;
    direction: 'asc' | 'desc';
  }>({ key: 'idtipo_elemento_51', direction: 'desc' });

  const API_URL = apiUrl('/epp-tipos');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<TipoElementoEpp[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar tipos EPP');
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
        t.tipo_elemento_51.toLowerCase().includes(q) ||
        (t.descripcion_51 || '').toLowerCase().includes(q)
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

  const handleSort = (key: keyof TipoElementoEpp) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof TipoElementoEpp) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (t: TipoElementoEpp) => {
    setEditingId(t.idtipo_elemento_51);
    setForm({
      tipo_elemento_51: t.tipo_elemento_51,
      descripcion_51: t.descripcion_51 || '',
      activo_51: t.activo_51,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo_elemento_51.trim()) {
      await showError('Validación', 'El tipo es requerido');
      return;
    }
    const payload = {
      tipo_elemento_51: form.tipo_elemento_51.trim().toUpperCase(),
      descripcion_51: form.descripcion_51.trim().toUpperCase() || null,
      activo_51: form.activo_51,
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
    const ok = await showDeleteConfirm('este tipo de elemento EPP');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Eliminado', data.message || 'Tipo eliminado');
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
        ID: t.idtipo_elemento_51,
        Tipo: t.tipo_elemento_51,
        Descripción: t.descripcion_51 || '',
        Activo: t.activo_51 ? 'Sí' : 'No',
      })),
      'tipos-elemento-epp'
    );
  };

  if (loading) return <div className="loading">Cargando tipos EPP...</div>;

  return (
    <div className="bodega-view tipo-elemento-epp-view">
      <div className="view-header">
        <h2>Tipos de Elemento EPP</h2>
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
          <h3>{editingId ? 'Editar tipo' : 'Nuevo tipo'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="tipo_elemento_51">Tipo *</label>
                <input
                  id="tipo_elemento_51"
                  className="form-input"
                  value={form.tipo_elemento_51}
                  onChange={(e) => setForm((p) => ({ ...p, tipo_elemento_51: e.target.value.toUpperCase() }))}
                  required
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="descripcion_51">Descripción</label>
                <input
                  id="descripcion_51"
                  className="form-input"
                  value={form.descripcion_51}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion_51: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_51">Activo</label>
                <select
                  id="activo_51"
                  className="form-input"
                  value={form.activo_51 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_51: e.target.value === '1' }))}
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
          Total: <strong>{filteredAndSorted.length}</strong> tipos
        </p>
        <input
          type="search"
          className="form-input epp-search"
          placeholder="🔍 BUSCAR TIPO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar tipos EPP"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className={sortClass('idtipo_elemento_51')} onClick={() => handleSort('idtipo_elemento_51')}>ID</th>
              <th className={sortClass('tipo_elemento_51')} onClick={() => handleSort('tipo_elemento_51')}>Tipo</th>
              <th className={sortClass('descripcion_51')} onClick={() => handleSort('descripcion_51')}>Descripción</th>
              <th className={sortClass('activo_51')} onClick={() => handleSort('activo_51')}>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="epp-empty">No hay tipos registrados</td>
              </tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.idtipo_elemento_51}>
                  <td>{t.idtipo_elemento_51}</td>
                  <td><strong>{t.tipo_elemento_51}</strong></td>
                  <td>{t.descripcion_51 || '-'}</td>
                  <td>
                    <span className={t.activo_51 ? 'badge-activo' : 'badge-inactivo'}>
                      {t.activo_51 ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(t)} title="Editar" aria-label={`Editar ${t.tipo_elemento_51}`}>✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(t.idtipo_elemento_51)} title="Eliminar" aria-label={`Eliminar ${t.tipo_elemento_51}`}>🗑️</button>
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

export default TipoElementoEppView;
