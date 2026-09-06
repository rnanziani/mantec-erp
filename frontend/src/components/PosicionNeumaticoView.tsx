import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Posicion {
  idposicion_73: number;
  codigo_73: string;
  descripcion_73: string;
  numero_73?: number | null;
  orden_73: number;
  activo_73: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const empty = { codigo_73: '', descripcion_73: '', numero_73: '', orden_73: '', activo_73: true };

const PosicionNeumaticoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Posicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/posiciones-neumatico');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<Posicion[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar posiciones');
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
    return items.filter(
      (p) =>
        p.codigo_73.toLowerCase().includes(q) ||
        p.descripcion_73.toLowerCase().includes(q) ||
        String(p.numero_73 ?? '').includes(q)
    );
  }, [items, searchTerm]);

  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setForm(empty);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const payload = () => ({
    codigo_73: form.codigo_73.trim(),
    descripcion_73: form.descripcion_73.trim(),
    numero_73: form.numero_73 === '' ? null : Number(form.numero_73),
    orden_73: form.orden_73 === '' ? undefined : Number(form.orden_73),
    activo_73: form.activo_73,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_73.trim() || !form.descripcion_73.trim()) {
      await showError('Validación', 'Código y descripción son requeridos');
      return;
    }
    try {
      const res = await apiFetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      const data: ApiResponse<Posicion> = await res.json();
      if (data.success) {
        await fetchData();
        resetForm();
        await showSuccess('Listo', editingId ? 'Posición actualizada' : 'Posición creada');
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await showDeleteConfirm('esta posición'))) return;
    const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const data: ApiResponse = await res.json();
    if (data.success) {
      await fetchData();
      await showSuccess('Listo', 'Posición eliminada');
    } else {
      await showError('Error', data.error || 'No se pudo eliminar');
    }
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📍 Posiciones de neumático</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            Nuevo
          </button>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#28a745' }} onClick={() => formRef.current?.requestSubmit()} disabled={!showForm}>
            Guardar
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ backgroundColor: '#17a2b8' }}
            onClick={() => {
              exportToExcel(
                filtered.map((p) => ({
                  N: p.numero_73 ?? '',
                  Código: p.codigo_73,
                  Descripción: p.descripcion_73,
                  Activo: p.activo_73 ? 'Sí' : 'No',
                })),
                'posiciones_neumatico',
                'Posiciones'
              );
            }}
          >
            Exportar
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>Salir</button>
        </div>
      </div>

      {error && <div role="alert" style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 8 }}>{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar posición' : 'Nueva posición'}</h3>
          <form ref={formRef} onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="pos-codigo">Código *</label>
              <input id="pos-codigo" className="form-input" value={form.codigo_73} onChange={(e) => setForm({ ...form, codigo_73: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="pos-desc">Descripción *</label>
              <input id="pos-desc" className="form-input" value={form.descripcion_73} onChange={(e) => setForm({ ...form, descripcion_73: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="pos-num">Número del plano (1-8)</label>
              <input id="pos-num" type="number" min={1} className="form-input" value={form.numero_73} onChange={(e) => setForm({ ...form, numero_73: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="pos-orden">Orden</label>
              <input id="pos-orden" type="number" className="form-input" value={form.orden_73} onChange={(e) => setForm({ ...form, orden_73: e.target.value })} />
            </div>
            <label>
              <input type="checkbox" checked={form.activo_73} onChange={(e) => setForm({ ...form, activo_73: e.target.checked })} />
              {' '}Activo
            </label>
          </form>
        </div>
      )}

      <div className="form-container">
        <input className="form-input" placeholder="Buscar código, descripción o número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Buscar posiciones" />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Código</th>
                <th>Descripción</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={5} className="no-data">Sin registros</td></tr>
              ) : (
                pageItems.map((p) => (
                  <tr key={p.idposicion_73}>
                    <td>{p.numero_73 ?? '-'}</td>
                    <td><strong>{p.codigo_73}</strong></td>
                    <td>{p.descripcion_73}</td>
                    <td>{p.activo_73 ? 'Sí' : 'No'}</td>
                    <td className="actions">
                      <button type="button" className="btn-edit" onClick={() => {
                        setEditingId(p.idposicion_73);
                        setForm({
                          codigo_73: p.codigo_73,
                          descripcion_73: p.descripcion_73,
                          numero_73: p.numero_73 != null ? String(p.numero_73) : '',
                          orden_73: String(p.orden_73 ?? ''),
                          activo_73: p.activo_73,
                        });
                        setShowForm(true);
                      }} aria-label={`Editar ${p.codigo_73}`}>✏️</button>
                      <button type="button" className="btn-delete" onClick={() => handleDelete(p.idposicion_73)} aria-label={`Eliminar ${p.codigo_73}`}>🚫</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default PosicionNeumaticoView;
