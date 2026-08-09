import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './HerramientaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Herramienta {
  idherramienta_48: number;
  codigo_48: string;
  nombre_48: string;
  idmarca_insumo_48?: number | null;
  marca_48?: string | null;
  modelo_48?: string | null;
  serie_48?: string | null;
  ubicacion_48?: string | null;
  valor_48: number;
  stock_48: number;
  stock_disponible_48: number;
  estado_48: string;
  activo_48: boolean;
  marca_insumo_nombre?: string;
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

const ESTADOS = ['DISPONIBLE', 'PRESTADA', 'EN_MANTENCION', 'PERDIDA', 'DANADA', 'DE_BAJA'] as const;

const emptyForm = {
  codigo_48: '',
  nombre_48: '',
  idmarca_insumo_48: '',
  marca_48: '',
  modelo_48: '',
  serie_48: '',
  ubicacion_48: '',
  valor_48: '0',
  stock_48: '1',
  stock_disponible_48: '1',
  estado_48: 'DISPONIBLE',
  activo_48: true,
};

const HerramientaView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Herramienta[]>([]);
  const [marcas, setMarcas] = useState<MarcaInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Herramienta;
    direction: 'asc' | 'desc';
  }>({ key: 'idherramienta_48', direction: 'desc' });

  const API_URL = apiUrl('/herramientas');
  const MARCAS_URL = apiUrl('/marcas-insumo');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [hRes, mRes] = await Promise.all([apiFetch(API_URL), apiFetch(MARCAS_URL)]);
      const hData: ApiResponse<Herramienta[]> = await hRes.json();
      const mData: ApiResponse<MarcaInsumo[]> = await mRes.json();
      if (hData.success && Array.isArray(hData.data)) setItems(hData.data);
      else setError(hData.error || 'Error al cargar herramientas');
      if (mData.success && Array.isArray(mData.data)) {
        setMarcas(
          [...mData.data].sort((a, b) =>
            a.marca_insumo_37.localeCompare(b.marca_insumo_37, 'es', { sensitivity: 'base' })
          )
        );
      }
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
      marcas.map((m) => ({
        value: String(m.id_marca_insumo_37),
        label: m.marca_insumo_37,
      })),
    [marcas]
  );

  const handleMarcaChange = (value: string) => {
    const selected = marcas.find((m) => String(m.id_marca_insumo_37) === value);
    setForm((prev) => ({
      ...prev,
      idmarca_insumo_48: value,
      marca_48: selected?.marca_insumo_37 || '',
    }));
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = items.filter((h) => {
      const matchText =
        !q ||
        h.codigo_48.toLowerCase().includes(q) ||
        h.nombre_48.toLowerCase().includes(q) ||
        (h.marca_48 || '').toLowerCase().includes(q) ||
        (h.marca_insumo_nombre || '').toLowerCase().includes(q) ||
        (h.ubicacion_48 || '').toLowerCase().includes(q) ||
        h.estado_48.toLowerCase().includes(q);
      const matchEstado = !filtroEstado || h.estado_48 === filtroEstado;
      return matchText && matchEstado;
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
      const cmp = String(aValue).localeCompare(String(bValue), 'es', {
        sensitivity: 'base',
        numeric: true,
      });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [items, searchTerm, filtroEstado, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado]);

  const handleSort = (key: keyof Herramienta) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof Herramienta) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const formatValor = (valor: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (h: Herramienta) => {
    setEditingId(h.idherramienta_48);
    setForm({
      codigo_48: h.codigo_48,
      nombre_48: h.nombre_48,
      idmarca_insumo_48: h.idmarca_insumo_48 ? String(h.idmarca_insumo_48) : '',
      marca_48: h.marca_48 || '',
      modelo_48: h.modelo_48 || '',
      serie_48: h.serie_48 || '',
      ubicacion_48: h.ubicacion_48 || '',
      valor_48: String(h.valor_48 ?? 0),
      stock_48: String(h.stock_48 ?? 1),
      stock_disponible_48: String(h.stock_disponible_48 ?? 1),
      estado_48: h.estado_48,
      activo_48: h.activo_48,
    });
    setShowForm(true);
  };

  const buildPayload = () => ({
    codigo_48: form.codigo_48.trim().toUpperCase(),
    nombre_48: form.nombre_48.trim().toUpperCase(),
    idmarca_insumo_48: form.idmarca_insumo_48 ? Number(form.idmarca_insumo_48) : null,
    marca_48: form.marca_48.trim().toUpperCase() || null,
    modelo_48: form.modelo_48.trim().toUpperCase() || null,
    serie_48: form.serie_48.trim().toUpperCase() || null,
    ubicacion_48: form.ubicacion_48.trim().toUpperCase() || null,
    valor_48: Number(form.valor_48) || 0,
    stock_48: Number(form.stock_48) || 0,
    stock_disponible_48: Number(form.stock_disponible_48) || 0,
    estado_48: form.estado_48,
    activo_48: form.activo_48,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_48.trim()) {
      await showError('Validación', 'El nombre es requerido');
      return;
    }
    if (editingId && !form.codigo_48.trim()) {
      await showError('Validación', 'El código es requerido al editar');
      return;
    }
    const payload = buildPayload();
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse<Herramienta> = await res.json();
      if (data.success) {
        await fetchData();
        resetForm();
        const codigoCreado = data.data?.codigo_48;
        await showSuccess(
          editingId ? 'Herramienta actualizada' : 'Herramienta creada',
          editingId
            ? data.message || 'Operación exitosa'
            : `Código asignado: ${codigoCreado || 'automático'}`
        );
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('esta herramienta');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Eliminada', data.message || 'Herramienta eliminada');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = async () => {
    await exportToExcel(
      filteredAndSorted.map((h) => ({
        ID: h.idherramienta_48,
        Código: h.codigo_48,
        Nombre: h.nombre_48,
        Marca: h.marca_48 || h.marca_insumo_nombre || '',
        Modelo: h.modelo_48 || '',
        Serie: h.serie_48 || '',
        Ubicación: h.ubicacion_48 || '',
        Valor: h.valor_48,
        Stock: h.stock_48,
        Disponible: h.stock_disponible_48,
        Estado: h.estado_48,
        Activo: h.activo_48 ? 'Sí' : 'No',
      })),
      'herramientas-panol'
    );
  };

  const setUpper = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }));
  };

  if (loading) return <div className="loading">Cargando herramientas...</div>;

  return (
    <div className="bodega-view herramienta-view">
      <div className="view-header">
        <h2>Herramientas (Pañol)</h2>
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
          <h3>{editingId ? 'Editar herramienta' : 'Nueva herramienta'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="codigo_48">Código {editingId ? '*' : '(opcional)'}</label>
                <input
                  id="codigo_48"
                  className="form-input"
                  value={form.codigo_48}
                  onChange={setUpper('codigo_48')}
                  required={Boolean(editingId)}
                  maxLength={40}
                  placeholder={editingId ? '' : 'Se genera solo: HER-0001'}
                  aria-describedby="codigo-herramienta-hint"
                />
                {!editingId && (
                  <small id="codigo-herramienta-hint" className="form-hint">
                    Si lo dejas vacío, se crea automáticamente (HER-0001, HER-0002…).
                  </small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="nombre_48">Nombre *</label>
                <input id="nombre_48" className="form-input" value={form.nombre_48} onChange={setUpper('nombre_48')} required maxLength={120} />
              </div>
              <div className="form-group">
                <label htmlFor="idmarca_insumo_48">Marca</label>
                <SearchableSelect
                  id="idmarca_insumo_48"
                  value={form.idmarca_insumo_48}
                  onChange={handleMarcaChange}
                  options={marcaOptions}
                  placeholder="Buscar o seleccionar marca..."
                  aria-label="Seleccionar marca"
                  emptyMessage="No se encontraron marcas con ese criterio"
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="modelo_48">Modelo</label>
                <input id="modelo_48" className="form-input" value={form.modelo_48} onChange={setUpper('modelo_48')} maxLength={80} />
              </div>
              <div className="form-group">
                <label htmlFor="serie_48">Serie</label>
                <input id="serie_48" className="form-input" value={form.serie_48} onChange={setUpper('serie_48')} maxLength={80} />
              </div>
              <div className="form-group">
                <label htmlFor="ubicacion_48">Ubicación</label>
                <input id="ubicacion_48" className="form-input" value={form.ubicacion_48} onChange={setUpper('ubicacion_48')} maxLength={100} />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="valor_48">Valor</label>
                <input id="valor_48" type="number" min="0" step="0.01" className="form-input" value={form.valor_48} onChange={(e) => setForm((p) => ({ ...p, valor_48: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="estado_48">Estado</label>
                <select id="estado_48" className="form-input" value={form.estado_48} onChange={(e) => setForm((p) => ({ ...p, estado_48: e.target.value }))}>
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="activo_48">Activo</label>
                <select id="activo_48" className="form-input" value={form.activo_48 ? '1' : '0'} onChange={(e) => setForm((p) => ({ ...p, activo_48: e.target.value === '1' }))}>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="stock_48">Stock</label>
                <input id="stock_48" type="number" min="0" className="form-input" value={form.stock_48} onChange={(e) => setForm((p) => ({ ...p, stock_48: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="stock_disponible_48">Stock disponible</label>
                <input id="stock_disponible_48" type="number" min="0" className="form-input" value={form.stock_disponible_48} onChange={(e) => setForm((p) => ({ ...p, stock_disponible_48: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Crear'}</button>
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="herramienta-toolbar">
        <p className="herramienta-total">
          Total: <strong>{filteredAndSorted.length}</strong> herramientas
        </p>
        <div className="herramienta-filters">
          <input
            type="search"
            className="form-input herramienta-search"
            placeholder="🔍 BUSCAR HERRAMIENTA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            aria-label="Buscar herramientas"
          />
          <select
            className="form-input herramienta-estado-filter"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table herramienta-data-table">
          <thead>
            <tr>
              <th className={sortClass('idherramienta_48')} onClick={() => handleSort('idherramienta_48')}>ID</th>
              <th className={sortClass('codigo_48')} onClick={() => handleSort('codigo_48')}>Código</th>
              <th className={sortClass('nombre_48')} onClick={() => handleSort('nombre_48')}>Nombre</th>
              <th className={sortClass('marca_48')} onClick={() => handleSort('marca_48')}>Marca</th>
              <th className={sortClass('ubicacion_48')} onClick={() => handleSort('ubicacion_48')}>Ubicación</th>
              <th className={sortClass('valor_48')} onClick={() => handleSort('valor_48')}>Valor</th>
              <th className={sortClass('stock_48')} onClick={() => handleSort('stock_48')}>Stock</th>
              <th className={sortClass('stock_disponible_48')} onClick={() => handleSort('stock_disponible_48')}>Disp.</th>
              <th className={sortClass('estado_48')} onClick={() => handleSort('estado_48')}>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="herramienta-empty">
                  No hay herramientas registradas
                </td>
              </tr>
            ) : (
              pageItems.map((h) => (
                <tr key={h.idherramienta_48}>
                  <td>{h.idherramienta_48}</td>
                  <td><strong>{h.codigo_48}</strong></td>
                  <td>{h.nombre_48}</td>
                  <td>{h.marca_48 || h.marca_insumo_nombre || '-'}</td>
                  <td>{h.ubicacion_48 || '-'}</td>
                  <td className="herramienta-valor">{formatValor(h.valor_48)}</td>
                  <td className="text-center">{h.stock_48}</td>
                  <td className="text-center">{h.stock_disponible_48}</td>
                  <td>
                    <span className={`badge-estado badge-${h.estado_48.toLowerCase()}`}>
                      {h.estado_48}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(h)}
                      title="Editar"
                      aria-label={`Editar ${h.nombre_48}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(h.idherramienta_48)}
                      title="Eliminar"
                      aria-label={`Eliminar ${h.nombre_48}`}
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
        totalItems={filteredAndSorted.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default HerramientaView;
