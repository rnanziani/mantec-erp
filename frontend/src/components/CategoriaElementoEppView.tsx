import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './CategoriaElementoEppView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface TipoElementoEpp {
  idtipo_elemento_51: number;
  tipo_elemento_51: string;
  activo_51: boolean;
}

interface CategoriaElementoEpp {
  idcategoria_elemento_52: number;
  idtipo_elemento_52: number;
  categoria_52: string;
  descripcion_52?: string | null;
  activo_52: boolean;
  tipo_elemento_nombre?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  idtipo_elemento_52: '',
  categoria_52: '',
  descripcion_52: '',
  activo_52: true,
};

const CategoriaElementoEppView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<CategoriaElementoEpp[]>([]);
  const [tipos, setTipos] = useState<TipoElementoEpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CategoriaElementoEpp;
    direction: 'asc' | 'desc';
  }>({ key: 'idcategoria_elemento_52', direction: 'desc' });

  const API_URL = apiUrl('/epp-categorias');
  const TIPOS_URL = apiUrl('/epp-tipos');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [cRes, tRes] = await Promise.all([apiFetch(API_URL), apiFetch(TIPOS_URL)]);
      const cData: ApiResponse<CategoriaElementoEpp[]> = await cRes.json();
      const tData: ApiResponse<TipoElementoEpp[]> = await tRes.json();
      if (cData.success && Array.isArray(cData.data)) setItems(cData.data);
      else setError(cData.error || 'Error al cargar categorías EPP');
      if (tData.success && Array.isArray(tData.data)) setTipos(tData.data);
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
    let list = items.filter((c) => {
      const matchText =
        !q ||
        c.categoria_52.toLowerCase().includes(q) ||
        (c.descripcion_52 || '').toLowerCase().includes(q) ||
        (c.tipo_elemento_nombre || '').toLowerCase().includes(q);
      const matchTipo = !filtroTipo || String(c.idtipo_elemento_52) === filtroTipo;
      return matchText && matchTipo;
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
  }, [items, searchTerm, filtroTipo, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroTipo]);

  const handleSort = (key: keyof CategoriaElementoEpp) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof CategoriaElementoEpp) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (c: CategoriaElementoEpp) => {
    setEditingId(c.idcategoria_elemento_52);
    setForm({
      idtipo_elemento_52: String(c.idtipo_elemento_52),
      categoria_52: c.categoria_52,
      descripcion_52: c.descripcion_52 || '',
      activo_52: c.activo_52,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idtipo_elemento_52) {
      await showError('Validación', 'Seleccione un tipo');
      return;
    }
    if (!form.categoria_52.trim()) {
      await showError('Validación', 'La categoría es requerida');
      return;
    }
    const payload = {
      idtipo_elemento_52: Number(form.idtipo_elemento_52),
      categoria_52: form.categoria_52.trim().toUpperCase(),
      descripcion_52: form.descripcion_52.trim().toUpperCase() || null,
      activo_52: form.activo_52,
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
        await showSuccess(editingId ? 'Actualizada' : 'Creada', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('esta categoría EPP');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Eliminada', data.message || 'Categoría eliminada');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = async () => {
    await exportToExcel(
      filteredAndSorted.map((c) => ({
        ID: c.idcategoria_elemento_52,
        Tipo: c.tipo_elemento_nombre || '',
        Categoría: c.categoria_52,
        Descripción: c.descripcion_52 || '',
        Activo: c.activo_52 ? 'Sí' : 'No',
      })),
      'categorias-elemento-epp'
    );
  };

  if (loading) return <div className="loading">Cargando categorías EPP...</div>;

  return (
    <div className="bodega-view categoria-elemento-epp-view">
      <div className="view-header">
        <h2>Categorías de Elemento EPP</h2>
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
          <h3>{editingId ? 'Editar categoría' : 'Nueva categoría'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idtipo_elemento_52">Tipo *</label>
                <select
                  id="idtipo_elemento_52"
                  className="form-input"
                  value={form.idtipo_elemento_52}
                  onChange={(e) => setForm((p) => ({ ...p, idtipo_elemento_52: e.target.value }))}
                  required
                >
                  <option value="">Seleccione tipo...</option>
                  {tipos.filter((t) => t.activo_51 || String(t.idtipo_elemento_51) === form.idtipo_elemento_52).map((t) => (
                    <option key={t.idtipo_elemento_51} value={t.idtipo_elemento_51}>
                      {t.tipo_elemento_51}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="categoria_52">Categoría *</label>
                <input
                  id="categoria_52"
                  className="form-input"
                  value={form.categoria_52}
                  onChange={(e) => setForm((p) => ({ ...p, categoria_52: e.target.value.toUpperCase() }))}
                  required
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_52">Activo</label>
                <select
                  id="activo_52"
                  className="form-input"
                  value={form.activo_52 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_52: e.target.value === '1' }))}
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="descripcion_52">Descripción</label>
              <input
                id="descripcion_52"
                className="form-input"
                value={form.descripcion_52}
                onChange={(e) => setForm((p) => ({ ...p, descripcion_52: e.target.value.toUpperCase() }))}
              />
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
          Total: <strong>{filteredAndSorted.length}</strong> categorías
        </p>
        <div className="epp-filters">
          <input
            type="search"
            className="form-input epp-search"
            placeholder="🔍 BUSCAR CATEGORÍA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            aria-label="Buscar categorías EPP"
          />
          <select
            className="form-input"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.idtipo_elemento_51} value={t.idtipo_elemento_51}>
                {t.tipo_elemento_51}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className={sortClass('idcategoria_elemento_52')} onClick={() => handleSort('idcategoria_elemento_52')}>ID</th>
              <th className={sortClass('tipo_elemento_nombre')} onClick={() => handleSort('tipo_elemento_nombre')}>Tipo</th>
              <th className={sortClass('categoria_52')} onClick={() => handleSort('categoria_52')}>Categoría</th>
              <th className={sortClass('descripcion_52')} onClick={() => handleSort('descripcion_52')}>Descripción</th>
              <th className={sortClass('activo_52')} onClick={() => handleSort('activo_52')}>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="epp-empty">No hay categorías registradas</td>
              </tr>
            ) : (
              pageItems.map((c) => (
                <tr key={c.idcategoria_elemento_52}>
                  <td>{c.idcategoria_elemento_52}</td>
                  <td>{c.tipo_elemento_nombre || '-'}</td>
                  <td><strong>{c.categoria_52}</strong></td>
                  <td>{c.descripcion_52 || '-'}</td>
                  <td>
                    <span className={c.activo_52 ? 'badge-activo' : 'badge-inactivo'}>
                      {c.activo_52 ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(c)} title="Editar" aria-label={`Editar ${c.categoria_52}`}>✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(c.idcategoria_elemento_52)} title="Eliminar" aria-label={`Eliminar ${c.categoria_52}`}>🗑️</button>
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

export default CategoriaElementoEppView;
