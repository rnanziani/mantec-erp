import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface ProveedorPedido {
  id_proveedor_90: number;
  razon_social_90: string;
  ruc_90?: string | null;
  tipo_despacho_90: string;
  contacto_90?: string | null;
  telefono_90?: string | null;
  activo_90: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  razon_social_90: '',
  ruc_90: '',
  tipo_despacho_90: 'Despacha',
  contacto_90: '',
  telefono_90: '',
  activo_90: true,
};

const ProveedorPedidoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<ProveedorPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/proveedores-pedido');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<ProveedorPedido[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar proveedores');
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
    return items.filter((p) => {
      if (filtroActivo === '1' && !p.activo_90) return false;
      if (filtroActivo === '0' && p.activo_90) return false;
      if (!q) return true;
      return (
        p.razon_social_90.toLowerCase().includes(q) ||
        (p.ruc_90 || '').toLowerCase().includes(q) ||
        (p.contacto_90 || '').toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm, filtroActivo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroActivo]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: ProveedorPedido) => {
    setEditingId(p.id_proveedor_90);
    setForm({
      razon_social_90: p.razon_social_90,
      ruc_90: p.ruc_90 || '',
      tipo_despacho_90: p.tipo_despacho_90 || 'Despacha',
      contacto_90: p.contacto_90 || '',
      telefono_90: p.telefono_90 || '',
      activo_90: p.activo_90 !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razon_social_90.trim()) {
      await showError('Validación', 'La razón social es requerida');
      return;
    }
    const payload = {
      ...form,
      razon_social_90: form.razon_social_90.trim().toUpperCase(),
      ruc_90: form.ruc_90.trim() || null,
      contacto_90: form.contacto_90.trim() || null,
      telefono_90: form.telefono_90.trim() || null,
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

  if (loading) return <div className="loading">Cargando proveedores de pedido...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Pedidos — Proveedores</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Nuevo
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
          </button>
          <button
            type="button"
            className="btn-info"
            onClick={() =>
              exportToExcel(
                filtered.map((p) => ({
                  ID: p.id_proveedor_90,
                  'Razón social': p.razon_social_90,
                  RUC: p.ruc_90 || '',
                  Despacho: p.tipo_despacho_90,
                  Contacto: p.contacto_90 || '',
                  Teléfono: p.telefono_90 || '',
                  Activo: p.activo_90 ? 'Sí' : 'No',
                })),
                'proveedores-pedido'
              )
            }
          >
            Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="razon_social_90">Razón social *</label>
                <input
                  id="razon_social_90"
                  className="form-input"
                  required
                  maxLength={150}
                  value={form.razon_social_90}
                  onChange={(e) => changeKeepingCaret(e, (v) => setForm((p) => ({ ...p, razon_social_90: v })))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="ruc_90">RUC</label>
                <input
                  id="ruc_90"
                  className="form-input"
                  maxLength={20}
                  value={form.ruc_90}
                  onChange={(e) => setForm((p) => ({ ...p, ruc_90: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="tipo_despacho_90">Despacho</label>
                <select
                  id="tipo_despacho_90"
                  className="form-input"
                  value={form.tipo_despacho_90}
                  onChange={(e) => setForm((p) => ({ ...p, tipo_despacho_90: e.target.value }))}
                >
                  <option value="Despacha">Despacha</option>
                  <option value="No despacha">No despacha</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="contacto_90">Contacto</label>
                <input
                  id="contacto_90"
                  className="form-input"
                  maxLength={100}
                  value={form.contacto_90}
                  onChange={(e) => setForm((p) => ({ ...p, contacto_90: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="telefono_90">Teléfono</label>
                <input
                  id="telefono_90"
                  className="form-input"
                  maxLength={20}
                  value={form.telefono_90}
                  onChange={(e) => setForm((p) => ({ ...p, telefono_90: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_90">
                  <input
                    id="activo_90"
                    type="checkbox"
                    checked={form.activo_90}
                    onChange={(e) => setForm((p) => ({ ...p, activo_90: e.target.checked }))}
                  />{' '}
                  Activo
                </label>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Buscar razón social, RUC o contacto..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar proveedores"
        />
        <select
          className="form-input"
          style={{ width: 160 }}
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos</option>
          <option value="1">Solo activos</option>
          <option value="0">Solo inactivos</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Razón social</th>
              <th>RUC</th>
              <th>Despacho</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center' }}>
                  Sin registros
                </td>
              </tr>
            ) : (
              pageItems.map((p) => (
                <tr key={p.id_proveedor_90}>
                  <td>{p.id_proveedor_90}</td>
                  <td>{p.razon_social_90}</td>
                  <td>{p.ruc_90 || '-'}</td>
                  <td>{p.tipo_despacho_90}</td>
                  <td>{p.contacto_90 || '-'}</td>
                  <td>{p.telefono_90 || '-'}</td>
                  <td>{p.activo_90 ? 'Sí' : 'No'}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => startEdit(p)} title="Editar">
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(p.id_proveedor_90)}
                      title="Eliminar / inactivar"
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
};

export default ProveedorPedidoView;
