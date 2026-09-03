import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Lubricante {
  idlubricante_70: number;
  cob_lubricante_70: string;
  descripcion_70: string;
  idmarca_insumo_70?: number | null;
  orden_aparicion_70: number;
  activo_70: boolean;
  marca_insumo_nombre?: string | null;
}

interface MarcaInsumo {
  id_marca_insumo_37: number;
  marca_insumo_37: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  cob_lubricante_70: '',
  descripcion_70: '',
  idmarca_insumo_70: '',
  orden_aparicion_70: '100',
  activo_70: true,
};

const LubricanteView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Lubricante[]>([]);
  const [marcas, setMarcas] = useState<MarcaInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const API_URL = apiUrl('/lubricantes');
  const MARCAS_URL = apiUrl('/marcas-insumo');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [lRes, mRes] = await Promise.all([apiFetch(API_URL), apiFetch(MARCAS_URL)]);
      const data: ApiResponse<Lubricante[]> = await lRes.json();
      const mData: ApiResponse<MarcaInsumo[]> = await mRes.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar lubricantes');
      if (mData.success && Array.isArray(mData.data)) setMarcas(mData.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const marcaOptions = useMemo(
    () =>
      [...marcas]
        .sort((a, b) =>
          a.marca_insumo_37.localeCompare(b.marca_insumo_37, 'es', { sensitivity: 'base' })
        )
        .map((m) => ({
          value: String(m.id_marca_insumo_37),
          label: m.marca_insumo_37,
        })),
    [marcas]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((l) => {
      if (filtroActivo === '1' && !l.activo_70) return false;
      if (filtroActivo === '0' && l.activo_70) return false;
      if (!q) return true;
      return (
        l.cob_lubricante_70.toLowerCase().includes(q) ||
        l.descripcion_70.toLowerCase().includes(q) ||
        (l.marca_insumo_nombre || '').toLowerCase().includes(q)
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

  const startEdit = (l: Lubricante) => {
    setEditingId(l.idlubricante_70);
    setForm({
      cob_lubricante_70: l.cob_lubricante_70,
      descripcion_70: l.descripcion_70,
      idmarca_insumo_70: l.idmarca_insumo_70 ? String(l.idmarca_insumo_70) : '',
      orden_aparicion_70: String(l.orden_aparicion_70 ?? 100),
      activo_70: l.activo_70,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cob_lubricante_70.trim() || !form.descripcion_70.trim()) {
      await showError('Validación', 'Código y descripción son requeridos');
      return;
    }
    if (!form.idmarca_insumo_70) {
      await showError('Validación', 'Seleccione una marca');
      return;
    }
    const orden = Number(form.orden_aparicion_70);
    if (Number.isNaN(orden)) {
      await showError('Validación', 'Orden de aparición inválido');
      return;
    }
    const payload = {
      cob_lubricante_70: form.cob_lubricante_70.trim().toUpperCase(),
      descripcion_70: form.descripcion_70.trim().toUpperCase(),
      idmarca_insumo_70: Number(form.idmarca_insumo_70),
      orden_aparicion_70: orden,
      activo_70: form.activo_70,
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
    const ok = await showDeleteConfirm('este lubricante');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Listo', data.message || 'Eliminado / desactivado');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((l) => ({
        ID: l.idlubricante_70,
        Código: l.cob_lubricante_70,
        Descripción: l.descripcion_70,
        Marca: l.marca_insumo_nombre || '',
        Orden: l.orden_aparicion_70,
        Activo: l.activo_70 ? 'Sí' : 'No',
      })),
      'catalogo-lubricantes'
    );
  };

  const setUpper = (key: 'cob_lubricante_70' | 'descripcion_70') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }));
    };

  if (loading) return <div className="loading">Cargando catálogo de lubricantes...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Lubricantes — Catálogo</h2>
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
          <button
            type="button"
            className="btn-success"
            disabled={!showForm}
            onClick={() => formRef.current?.requestSubmit()}
          >
            Guardar
          </button>
          <button type="button" className="btn-info" onClick={handleExport}>
            Excel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              window.location.hash = 'dashboard';
            }}
          >
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
          <h3>{editingId ? 'Editar lubricante' : 'Nuevo lubricante'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="cob_lubricante_70">Código *</label>
                <input
                  id="cob_lubricante_70"
                  className="form-input"
                  required
                  maxLength={40}
                  value={form.cob_lubricante_70}
                  onChange={setUpper('cob_lubricante_70')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="descripcion_70">Descripción *</label>
                <input
                  id="descripcion_70"
                  className="form-input"
                  required
                  maxLength={120}
                  value={form.descripcion_70}
                  onChange={setUpper('descripcion_70')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="idmarca_insumo_70">Marca *</label>
                <SearchableSelect
                  id="idmarca_insumo_70"
                  value={form.idmarca_insumo_70}
                  onChange={(v) => setForm((p) => ({ ...p, idmarca_insumo_70: v }))}
                  options={marcaOptions}
                  placeholder="Buscar marca..."
                  aria-label="Buscar o seleccionar marca"
                  emptyMessage="No se encontraron marcas"
                />
              </div>
              <div className="form-group">
                <label htmlFor="orden_aparicion_70">Orden en pantalla</label>
                <input
                  id="orden_aparicion_70"
                  type="number"
                  className="form-input"
                  value={form.orden_aparicion_70}
                  onChange={(e) => setForm((p) => ({ ...p, orden_aparicion_70: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="activo_70">
                  <input
                    id="activo_70"
                    type="checkbox"
                    checked={form.activo_70}
                    onChange={(e) => setForm((p) => ({ ...p, activo_70: e.target.checked }))}
                  />{' '}
                  Activo (si se desactiva, no aparece en consumos nuevos)
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
          placeholder="Buscar código, descripción o marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar lubricantes"
        />
        <select
          className="form-input"
          style={{ width: 160 }}
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          aria-label="Filtrar por estado activo"
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
              <th>Código</th>
              <th>Descripción</th>
              <th>Marca</th>
              <th>Orden</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>
                  Sin registros
                </td>
              </tr>
            ) : (
              pageItems.map((l) => (
                <tr key={l.idlubricante_70}>
                  <td>{l.idlubricante_70}</td>
                  <td>{l.cob_lubricante_70}</td>
                  <td>{l.descripcion_70}</td>
                  <td>{l.marca_insumo_nombre || '-'}</td>
                  <td>{l.orden_aparicion_70}</td>
                  <td>{l.activo_70 ? 'Sí' : 'No'}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => startEdit(l)} title="Editar">
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(l.idlubricante_70)}
                      title="Eliminar / desactivar"
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

export default LubricanteView;
