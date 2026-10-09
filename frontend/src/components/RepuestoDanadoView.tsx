import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';

interface RepuestoDanado {
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

const emptyForm = { codigo_57: '', nombre_57: '', activo_57: true };

/** Primeras 3 letras A-Z. CALIPER SCANIA → CAL. */
function prefijoDesdeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

function sugerirCodigo(nombre: string, existentes: RepuestoDanado[]): string {
  const prefijo = prefijoDesdeNombre(nombre);
  if (prefijo.length < 3) return '';
  const re = new RegExp(`^${prefijo}-(\\d+)$`);
  let max = 0;
  for (const row of existentes) {
    const m = re.exec((row.codigo_57 || '').toUpperCase());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefijo}-${String(max + 1).padStart(3, '0')}`;
}

const RepuestoDanadoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<RepuestoDanado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/repuestos-danados');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<RepuestoDanado[]> = await res.json();
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
        t.nombre_57.toLowerCase().includes(q) ||
        (t.codigo_57 || '').toLowerCase().includes(q)
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

  const startEdit = (t: RepuestoDanado) => {
    setEditingId(t.idrepuestodanado_57);
    setForm({
      codigo_57: t.codigo_57 || '',
      nombre_57: t.nombre_57,
      activo_57: t.activo_57,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_57.trim()) {
      await showError('Validación', 'El nombre es requerido');
      return;
    }
    if (!editingId && prefijoDesdeNombre(form.nombre_57).length < 3) {
      await showError(
        'Validación',
        'El nombre debe tener al menos 3 letras para armar el código (ej. CALIPER → CAL-001)'
      );
      return;
    }
    const payload = {
      codigo_57: editingId ? form.codigo_57.trim().toUpperCase() : sugerirCodigo(form.nombre_57, items),
      nombre_57: form.nombre_57.trim().toUpperCase(),
      descripcion_57: null,
      activo_57: form.activo_57,
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
    const ok = await showDeleteConfirm('este repuesto dañado');
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

  if (loading) return <div className="loading">Cargando repuestos dañados...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Repuestos Dañados</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Nuevo</button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>Guardar</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>Salir</button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar repuesto' : 'Nuevo repuesto dañado'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="nombre_57">Nombre *</label>
                <input
                  id="nombre_57"
                  className="form-input"
                  required
                  value={form.nombre_57}
                  onChange={(e) =>
                    changeKeepingCaret(e, (v) => {
                      setForm((p) => ({
                        ...p,
                        nombre_57: v,
                        codigo_57: editingId ? p.codigo_57 : sugerirCodigo(v, items),
                      }));
                    })
                  }
                  aria-describedby="nombre-57-help"
                />
                <small id="nombre-57-help" style={{ display: 'block', marginTop: 4, color: '#6b7280' }}>
                  Escriba el nombre; el código se arma solo (3 letras + correlativo)
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="codigo_57">Código</label>
                <input
                  id="codigo_57"
                  className="form-input"
                  value={form.codigo_57}
                  readOnly
                  aria-readonly="true"
                  placeholder="CAL-001"
                  title="Se genera con las 3 primeras letras del nombre"
                  aria-describedby="codigo-57-help"
                />
                <small id="codigo-57-help" style={{ display: 'block', marginTop: 4, color: '#6b7280' }}>
                  {editingId
                    ? 'El código no se cambia al editar (ya está en expedientes)'
                    : 'Automático y único. CALIPER → CAL-001, el siguiente CAL-002'}
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="estado_57">Estado *</label>
                <select
                  id="estado_57"
                  className="form-input"
                  value={form.activo_57 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_57: e.target.value === '1' }))}
                  aria-label="Estado del repuesto"
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
          placeholder="🔍 BUSCAR POR CÓDIGO O NOMBRE..."
          value={searchTerm}
          onChange={(e) => changeKeepingCaret(e, setSearchTerm)}
          aria-label="Buscar repuestos"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={4}>No hay registros</td></tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.idrepuestodanado_57}>
                  <td><strong>{t.codigo_57 || '-'}</strong></td>
                  <td>{t.nombre_57}</td>
                  <td>{t.activo_57 ? 'Activo' : 'Inactivo'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(t)} aria-label="Editar">✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(t.idrepuestodanado_57)} aria-label="Eliminar">🗑️</button>
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

export default RepuestoDanadoView;
