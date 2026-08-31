import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Semaforo {
  idsemaforo_62: number;
  nombre_62: string;
  dias_desde_62: number;
  dias_hasta_62?: number | null;
  color_62: string;
  activo_62: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  nombre_62: '',
  dias_desde_62: '0',
  dias_hasta_62: '',
  color_62: '#22c55e',
  activo_62: true,
};

const SemaforoEntregaView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Semaforo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/semaforo-entrega');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<Semaforo[]> = await res.json();
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
      return t.nombre_62.toLowerCase().includes(q) || t.color_62.toLowerCase().includes(q);
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

  const startEdit = (t: Semaforo) => {
    setEditingId(t.idsemaforo_62);
    setForm({
      nombre_62: t.nombre_62,
      dias_desde_62: String(t.dias_desde_62),
      dias_hasta_62: t.dias_hasta_62 == null ? '' : String(t.dias_hasta_62),
      color_62: t.color_62,
      activo_62: t.activo_62,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desde = Number(form.dias_desde_62);
    const hasta = form.dias_hasta_62.trim() === '' ? null : Number(form.dias_hasta_62);
    if (!form.nombre_62.trim() || !form.color_62.trim()) {
      await showError('Validación', 'Nombre y color son requeridos');
      return;
    }
    if (Number.isNaN(desde) || desde < 0) {
      await showError('Validación', 'Días desde inválido');
      return;
    }
    if (hasta !== null && (Number.isNaN(hasta) || hasta < desde)) {
      await showError('Validación', 'Días hasta debe ser >= días desde (o vacío = infinito)');
      return;
    }
    const payload = {
      nombre_62: form.nombre_62.trim(),
      dias_desde_62: desde,
      dias_hasta_62: hasta,
      color_62: form.color_62.trim(),
      activo_62: form.activo_62,
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
    const ok = await showDeleteConfirm('este rango de semáforo');
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

  if (loading) return <div className="loading">Cargando semáforo...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Semáforo de entrega</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Nuevo</button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>Guardar</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>Salir</button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar rango' : 'Nuevo rango'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="nombre_62">Nombre *</label>
                <input
                  id="nombre_62"
                  className="form-input"
                  required
                  value={form.nombre_62}
                  onChange={(e) => setForm((p) => ({ ...p, nombre_62: e.target.value }))}
                  placeholder="Verde"
                />
              </div>
              <div className="form-group">
                <label htmlFor="dias_desde_62">Días desde *</label>
                <input
                  id="dias_desde_62"
                  type="number"
                  min={0}
                  className="form-input"
                  required
                  value={form.dias_desde_62}
                  onChange={(e) => setForm((p) => ({ ...p, dias_desde_62: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="dias_hasta_62">Días hasta (vacío = ∞)</label>
                <input
                  id="dias_hasta_62"
                  type="number"
                  min={0}
                  className="form-input"
                  value={form.dias_hasta_62}
                  onChange={(e) => setForm((p) => ({ ...p, dias_hasta_62: e.target.value }))}
                  placeholder="Sin límite"
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="color_62">Color *</label>
                <input
                  id="color_62"
                  type="color"
                  className="form-input"
                  required
                  value={form.color_62}
                  onChange={(e) => setForm((p) => ({ ...p, color_62: e.target.value }))}
                  aria-label="Color del semáforo"
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_62">Activo</label>
                <select
                  id="activo_62"
                  className="form-input"
                  value={form.activo_62 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_62: e.target.value === '1' }))}
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

      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          placeholder="🔍 BUSCAR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar semáforo"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Color</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={6}>No hay registros</td></tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.idsemaforo_62} style={{ backgroundColor: `${t.color_62}33` }}>
                  <td><strong>{t.nombre_62}</strong></td>
                  <td>{t.dias_desde_62}</td>
                  <td>{t.dias_hasta_62 == null ? '∞' : t.dias_hasta_62}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: t.color_62,
                        verticalAlign: 'middle',
                        marginRight: 8,
                      }}
                      aria-hidden
                    />
                    {t.color_62}
                  </td>
                  <td>{t.activo_62 ? 'Sí' : 'No'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(t)} aria-label="Editar">✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(t.idsemaforo_62)} aria-label="Eliminar">🗑️</button>
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

export default SemaforoEntregaView;
