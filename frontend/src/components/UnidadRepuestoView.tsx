import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Unidad {
  idunidad_81: number;
  codigo_81: string;
  idrepuesto_81: number;
  observacion_81?: string | null;
  activo_81: boolean;
  codigo_tipo_57?: string;
  nombre_tipo_57?: string;
  ubicacion_actual?: string | null;
  maquina_actual?: string | null;
  proveedor_actual?: string | null;
}

interface TipoCatalogo {
  idrepuestodanado_57: number;
  codigo_57?: string | null;
  nombre_57: string;
  activo_57: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const UnidadRepuestoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Unidad[]>([]);
  const [tipos, setTipos] = useState<TipoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [idTipo, setIdTipo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/unidades-repuesto');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [uRes, tRes] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(apiUrl('/repuestos-danados')),
      ]);
      const uData: ApiResponse<Unidad[]> = await uRes.json();
      const tData: ApiResponse<TipoCatalogo[]> = await tRes.json();
      if (uData.success && Array.isArray(uData.data)) setItems(uData.data);
      else setError(uData.error || 'Error al cargar unidades');
      if (tData.success && Array.isArray(tData.data)) setTipos(tData.data.filter((t) => t.activo_57));
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const tipoOptions = useMemo(
    () =>
      tipos.map((t) => ({
        value: String(t.idrepuestodanado_57),
        label: `${t.codigo_57 || ''} — ${t.nombre_57}`,
      })),
    [tipos]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) =>
      [u.codigo_81, u.codigo_tipo_57, u.nombre_tipo_57, u.observacion_81, u.ubicacion_actual, u.maquina_actual]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setIdTipo('');
    setObservacion('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (u: Unidad) => {
    setEditingId(u.idunidad_81);
    setIdTipo(String(u.idrepuesto_81));
    setObservacion(u.observacion_81 || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idTipo) {
      await showError('Validación', 'Seleccione el tipo (caliper, barra, secador…)');
      return;
    }
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          idrepuesto_81: Number(idTipo),
          observacion_81: observacion.trim() || null,
        }),
      });
      const data: ApiResponse<Unidad> = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess(editingId ? 'Actualizado' : 'Creado', data.message || 'OK');
      } else {
        await showError('Error', [data.error, data.message].filter(Boolean).join(': ') || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('esta unidad');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Listo', data.message || 'Eliminado');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const dondeEsta = (u: Unidad) => {
    if (!u.ubicacion_actual) return 'Sin movimiento';
    if (u.maquina_actual) return `${u.ubicacion_actual} ${u.maquina_actual}`;
    if (u.proveedor_actual) return `${u.ubicacion_actual} ${u.proveedor_actual}`;
    return u.ubicacion_actual;
  };

  if (loading) return <div className="loading">Cargando unidades...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Unidades de repuesto</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Nueva unidad
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
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
          <h3>{editingId ? 'Editar unidad' : 'Nueva unidad (una pieza)'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="unidad-form-campos">
              <div className="form-group">
                <label htmlFor="unidad-tipo">Tipo *</label>
                <SearchableSelect
                  id="unidad-tipo"
                  value={idTipo}
                  onChange={setIdTipo}
                  options={tipoOptions}
                  placeholder="Caliper, barra, secador…"
                  required
                  emptyMessage="Cargue el catálogo de tipos primero"
                />
                <small className="form-help-text">El código RD-000001 se asigna al guardar, como el 0131 del alternador.</small>
              </div>
              <div className="form-group">
                <label htmlFor="unidad-obs">Observación</label>
                <textarea
                  id="unidad-obs"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value.toUpperCase())}
                  maxLength={250}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ced4da', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="form-container" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Buscar código, tipo, ubicación…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar unidades"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ced4da' }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Dónde está</th>
              <th>Observación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay unidades. Cree una por cada pieza física.</td>
              </tr>
            ) : (
              pageItems.map((u) => (
                <tr key={u.idunidad_81}>
                  <td>
                    <strong>{u.codigo_81}</strong>
                  </td>
                  <td>
                    {u.codigo_tipo_57} — {u.nombre_tipo_57}
                  </td>
                  <td>{dondeEsta(u)}</td>
                  <td title={u.observacion_81 || ''}>{u.observacion_81 || '—'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(u)} aria-label={`Editar ${u.codigo_81}`}>
                      ✏️
                    </button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(u.idunidad_81)} aria-label={`Eliminar ${u.codigo_81}`}>
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
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default UnidadRepuestoView;
