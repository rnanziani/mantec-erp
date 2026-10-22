import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface Vehiculo {
  id_vehiculo_95: number;
  patente_95: string;
  marca_95: string;
  modelo_95: string;
  anio_95?: number | null;
  color_95?: string | null;
  kilometraje_actual_95: number;
  estado_vehiculo_95: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  patente_95: '',
  marca_95: '',
  modelo_95: '',
  anio_95: '',
  color_95: '',
  kilometraje_actual_95: '0',
  estado_vehiculo_95: 'Activo',
};

const VehiculoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/vehiculos');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<Vehiculo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar vehículos');
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
    return items.filter((v) => {
      if (filtroEstado && v.estado_vehiculo_95 !== filtroEstado) return false;
      if (!q) return true;
      return `${v.patente_95} ${v.marca_95} ${v.modelo_95} ${v.color_95 || ''}`.toLowerCase().includes(q);
    });
  }, [items, searchTerm, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (v: Vehiculo) => {
    setEditingId(v.id_vehiculo_95);
    setForm({
      patente_95: v.patente_95,
      marca_95: v.marca_95,
      modelo_95: v.modelo_95,
      anio_95: v.anio_95 != null ? String(v.anio_95) : '',
      color_95: v.color_95 || '',
      kilometraje_actual_95: String(v.kilometraje_actual_95 ?? 0),
      estado_vehiculo_95: v.estado_vehiculo_95 || 'Activo',
    });
    setShowForm(true);
  };

  const setUpper = (key: 'patente_95' | 'marca_95' | 'modelo_95' | 'color_95') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      changeKeepingCaret(e, (val) => setForm((p) => ({ ...p, [key]: val })));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patente_95.trim() || !form.marca_95.trim() || !form.modelo_95.trim()) {
      await showError('Validación', 'Patente, marca y modelo son requeridos');
      return;
    }
    const payload = {
      patente_95: form.patente_95.trim(),
      marca_95: form.marca_95.trim(),
      modelo_95: form.modelo_95.trim(),
      anio_95: form.anio_95 ? Number(form.anio_95) : null,
      color_95: form.color_95.trim() || null,
      kilometraje_actual_95: Number(form.kilometraje_actual_95 || 0),
      estado_vehiculo_95: form.estado_vehiculo_95,
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
    const ok = await showDeleteConfirm('este vehículo');
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

  if (loading) return <div className="loading">Cargando vehículos...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Flota — Vehículos</h2>
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
                filtered.map((v) => ({
                  ID: v.id_vehiculo_95,
                  Patente: v.patente_95,
                  Marca: v.marca_95,
                  Modelo: v.modelo_95,
                  Año: v.anio_95 || '',
                  Color: v.color_95 || '',
                  Km: v.kilometraje_actual_95,
                  Estado: v.estado_vehiculo_95,
                })),
                'vehiculos'
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
          <h3>{editingId ? 'Editar vehículo' : 'Nuevo vehículo'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="patente_95">Patente *</label>
                <input id="patente_95" className="form-input" required maxLength={10} value={form.patente_95} style={{ textTransform: 'uppercase' }} onChange={setUpper('patente_95')} />
              </div>
              <div className="form-group">
                <label htmlFor="marca_95">Marca *</label>
                <input id="marca_95" className="form-input" required maxLength={50} value={form.marca_95} style={{ textTransform: 'uppercase' }} onChange={setUpper('marca_95')} />
              </div>
              <div className="form-group">
                <label htmlFor="modelo_95">Modelo *</label>
                <input id="modelo_95" className="form-input" required maxLength={50} value={form.modelo_95} style={{ textTransform: 'uppercase' }} onChange={setUpper('modelo_95')} />
              </div>
              <div className="form-group">
                <label htmlFor="anio_95">Año</label>
                <input id="anio_95" type="number" className="form-input" min={1980} max={2100} value={form.anio_95} onChange={(e) => setForm((p) => ({ ...p, anio_95: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="color_95">Color</label>
                <input id="color_95" className="form-input" maxLength={30} value={form.color_95} style={{ textTransform: 'uppercase' }} onChange={setUpper('color_95')} />
              </div>
              <div className="form-group">
                <label htmlFor="kilometraje_actual_95">Km actual</label>
                <input id="kilometraje_actual_95" type="number" min={0} step="0.01" className="form-input" value={form.kilometraje_actual_95} onChange={(e) => setForm((p) => ({ ...p, kilometraje_actual_95: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="estado_vehiculo_95">Estado</label>
                <select id="estado_vehiculo_95" className="form-input" value={form.estado_vehiculo_95} onChange={(e) => setForm((p) => ({ ...p, estado_vehiculo_95: e.target.value }))}>
                  <option value="Activo">Activo</option>
                  <option value="En Mantenimiento">En Mantenimiento</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          style={{ flex: 1, minWidth: 220, textTransform: 'uppercase' }}
          placeholder="Buscar patente, marca o modelo..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar vehículos"
        />
        <select className="form-input" style={{ width: 180 }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos</option>
          <option value="Activo">Activo</option>
          <option value="En Mantenimiento">En Mantenimiento</option>
          <option value="Baja">Baja</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patente</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Año</th>
              <th>Km</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center' }}>
                  Sin registros. El vehículo se da de alta aquí y después sale en la bitácora.
                </td>
              </tr>
            ) : (
              pageItems.map((v) => (
                <tr key={v.id_vehiculo_95}>
                  <td>{v.id_vehiculo_95}</td>
                  <td>{v.patente_95}</td>
                  <td>{v.marca_95}</td>
                  <td>{v.modelo_95}</td>
                  <td>{v.anio_95 || '-'}</td>
                  <td>{v.kilometraje_actual_95}</td>
                  <td>{v.estado_vehiculo_95}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => startEdit(v)} title="Editar">✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(v.id_vehiculo_95)} title="Eliminar / dar de baja">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
    </div>
  );
};

export default VehiculoView;
