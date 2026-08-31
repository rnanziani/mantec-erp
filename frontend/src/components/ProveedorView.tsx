import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Proveedor {
  idproveedor_58: number;
  rut_58?: string | null;
  nombre_58: string;
  contacto_58?: string | null;
  telefono_58?: string | null;
  email_58?: string | null;
  activo_58: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  rut_58: '',
  nombre_58: '',
  contacto_58: '',
  telefono_58: '',
  email_58: '',
  activo_58: true,
};

const ProveedorView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/proveedores');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<Proveedor[]> = await res.json();
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
      return (
        t.nombre_58.toLowerCase().includes(q) ||
        (t.rut_58 || '').toLowerCase().includes(q) ||
        (t.contacto_58 || '').toLowerCase().includes(q)
      );
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

  const startEdit = (t: Proveedor) => {
    setEditingId(t.idproveedor_58);
    setForm({
      rut_58: t.rut_58 || '',
      nombre_58: t.nombre_58,
      contacto_58: t.contacto_58 || '',
      telefono_58: t.telefono_58 || '',
      email_58: t.email_58 || '',
      activo_58: t.activo_58,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_58.trim()) {
      await showError('Validación', 'El nombre es requerido');
      return;
    }
    const payload = {
      rut_58: form.rut_58.trim().toUpperCase() || null,
      nombre_58: form.nombre_58.trim().toUpperCase(),
      contacto_58: form.contacto_58.trim().toUpperCase() || null,
      telefono_58: form.telefono_58.trim() || null,
      email_58: form.email_58.trim().toLowerCase() || null,
      activo_58: form.activo_58,
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
    const ok = await showDeleteConfirm('este proveedor');
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

  if (loading) return <div className="loading">Cargando proveedores...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Proveedores (Reparación)</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Nuevo</button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>Guardar</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>Salir</button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="rut_58">RUT</label>
                <input id="rut_58" className="form-input" value={form.rut_58} onChange={(e) => setForm((p) => ({ ...p, rut_58: e.target.value.toUpperCase() }))} />
              </div>
              <div className="form-group">
                <label htmlFor="nombre_58">Nombre *</label>
                <input id="nombre_58" className="form-input" required value={form.nombre_58} onChange={(e) => setForm((p) => ({ ...p, nombre_58: e.target.value.toUpperCase() }))} />
              </div>
              <div className="form-group">
                <label htmlFor="activo_58">Activo</label>
                <select id="activo_58" className="form-input" value={form.activo_58 ? '1' : '0'} onChange={(e) => setForm((p) => ({ ...p, activo_58: e.target.value === '1' }))}>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="contacto_58">Contacto</label>
                <input id="contacto_58" className="form-input" value={form.contacto_58} onChange={(e) => setForm((p) => ({ ...p, contacto_58: e.target.value.toUpperCase() }))} />
              </div>
              <div className="form-group">
                <label htmlFor="telefono_58">Teléfono</label>
                <input id="telefono_58" className="form-input" value={form.telefono_58} onChange={(e) => setForm((p) => ({ ...p, telefono_58: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="email_58">Email</label>
                <input id="email_58" type="email" className="form-input" value={form.email_58} onChange={(e) => setForm((p) => ({ ...p, email_58: e.target.value.toLowerCase() }))} />
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
        <input type="search" className="form-input" placeholder="🔍 BUSCAR..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} aria-label="Buscar proveedores" />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={7}>No hay registros</td></tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.idproveedor_58}>
                  <td>{t.idproveedor_58}</td>
                  <td>{t.rut_58 || '-'}</td>
                  <td><strong>{t.nombre_58}</strong></td>
                  <td>{t.contacto_58 || '-'}</td>
                  <td>{t.telefono_58 || '-'}</td>
                  <td>{t.activo_58 ? 'Sí' : 'No'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(t)} aria-label="Editar">✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(t.idproveedor_58)} aria-label="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default ProveedorView;
