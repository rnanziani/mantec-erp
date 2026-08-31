import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface EstadoReparacion {
  idestado_61: number;
  codigo_61: string;
  nombre_61: string;
  activo_61: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = { codigo_61: '', nombre_61: '', activo_61: true };

const EstadoReparacionView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<EstadoReparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/estados-reparacion');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<EstadoReparacion[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((t) => {
      if (!q) return true;
      return t.codigo_61.toLowerCase().includes(q) || t.nombre_61.toLowerCase().includes(q);
    });
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (t: EstadoReparacion) => {
    setEditingId(t.idestado_61);
    setForm({ codigo_61: t.codigo_61, nombre_61: t.nombre_61, activo_61: t.activo_61 });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_61.trim() || !form.nombre_61.trim()) {
      await showError('Validación', 'Código y nombre son requeridos');
      return;
    }
    const payload = {
      codigo_61: form.codigo_61.trim().toUpperCase(),
      nombre_61: form.nombre_61.trim(),
      activo_61: form.activo_61,
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
    const ok = await showDeleteConfirm('este estado de reparación');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Listo', data.message || 'Eliminado');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  if (loading) return <div className="loading">Cargando estados...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Estados de reparación</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Nuevo</button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>Guardar</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>Salir</button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar estado' : 'Nuevo estado'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="codigo_61">Código *</label>
                <input
                  id="codigo_61"
                  className="form-input"
                  required
                  value={form.codigo_61}
                  onChange={(e) => setForm((p) => ({ ...p, codigo_61: e.target.value.toUpperCase() }))}
                  placeholder="EN_REPARACION"
                />
              </div>
              <div className="form-group">
                <label htmlFor="nombre_61">Nombre *</label>
                <input
                  id="nombre_61"
                  className="form-input"
                  required
                  value={form.nombre_61}
                  onChange={(e) => setForm((p) => ({ ...p, nombre_61: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_61">Estado</label>
                <select
                  id="activo_61"
                  className="form-input"
                  value={form.activo_61 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_61: e.target.value === '1' }))}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
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

      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          placeholder="🔍 BUSCAR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar estados"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={4}>No hay registros</td></tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.idestado_61}>
                  <td><strong>{t.codigo_61}</strong></td>
                  <td>{t.nombre_61}</td>
                  <td>{t.activo_61 ? 'Sí' : 'No'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(t)} aria-label="Editar">✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(t.idestado_61)} aria-label="Eliminar">🗑️</button>
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
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default EstadoReparacionView;
