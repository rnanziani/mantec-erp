import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './ElementoEppView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface TipoElementoEpp {
  idtipo_elemento_51: number;
  idclase_51?: number | null;
  tipo_elemento_51: string;
  activo_51: boolean;
  clase_nombre?: string;
}

interface CategoriaElementoEpp {
  idcategoria_elemento_52: number;
  idtipo_elemento_52: number;
  categoria_52: string;
  activo_52: boolean;
}

interface MarcaInsumo {
  id_marca_insumo_37: number;
  marca_insumo_37: string;
}

interface ElementoEpp {
  idelemento_53: number;
  codigo_53: string;
  nombre_53: string;
  idcategoria_53: number;
  idtipo_elemento_53: number;
  idmarca_53?: number | null;
  descripcion_53?: string | null;
  unidad_medida_53: string;
  stock_actual_53: number;
  stock_minimo_53: number;
  valor_unitario_53?: number | null;
  activo_53: boolean;
  idclase_51?: number | null;
  clase_nombre?: string;
  tipo_elemento_nombre?: string;
  categoria_nombre?: string;
  marca_nombre?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = {
  codigo_53: '',
  nombre_53: '',
  idtipo_elemento_53: '',
  idcategoria_53: '',
  idmarca_53: '',
  descripcion_53: '',
  unidad_medida_53: 'UNIDAD',
  stock_actual_53: '0',
  stock_minimo_53: '5',
  valor_unitario_53: '0',
  activo_53: true,
};

const ElementoEppView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<ElementoEpp[]>([]);
  const [tipos, setTipos] = useState<TipoElementoEpp[]>([]);
  const [categorias, setCategorias] = useState<CategoriaElementoEpp[]>([]);
  const [marcas, setMarcas] = useState<MarcaInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroClase, setFiltroClase] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ElementoEpp;
    direction: 'asc' | 'desc';
  }>({ key: 'idelemento_53', direction: 'desc' });

  const API_URL = apiUrl('/epp-elementos');
  const TIPOS_URL = apiUrl('/epp-tipos');
  const CATEGORIAS_URL = apiUrl('/epp-categorias');
  const MARCAS_URL = apiUrl('/marcas-insumo');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [eRes, tRes, cRes, mRes] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(TIPOS_URL),
        apiFetch(CATEGORIAS_URL),
        apiFetch(MARCAS_URL),
      ]);
      const eData: ApiResponse<ElementoEpp[]> = await eRes.json();
      const tData: ApiResponse<TipoElementoEpp[]> = await tRes.json();
      const cData: ApiResponse<CategoriaElementoEpp[]> = await cRes.json();
      const mData: ApiResponse<MarcaInsumo[]> = await mRes.json();
      if (eData.success && Array.isArray(eData.data)) setItems(eData.data);
      else setError(eData.error || 'Error al cargar elementos EPP');
      if (tData.success && Array.isArray(tData.data)) setTipos(tData.data);
      if (cData.success && Array.isArray(cData.data)) setCategorias(cData.data);
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

  const categoriasFiltradas = useMemo(() => {
    if (!form.idtipo_elemento_53) return [];
    return categorias.filter(
      (c) =>
        String(c.idtipo_elemento_52) === form.idtipo_elemento_53 &&
        (c.activo_52 || String(c.idcategoria_elemento_52) === form.idcategoria_53)
    );
  }, [categorias, form.idtipo_elemento_53, form.idcategoria_53]);

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

  const tipoOptions = useMemo(
    () =>
      [...tipos]
        .filter((t) => t.activo_51 || String(t.idtipo_elemento_51) === form.idtipo_elemento_53)
        .sort((a, b) =>
          a.tipo_elemento_51.localeCompare(b.tipo_elemento_51, 'es', { sensitivity: 'base' })
        )
        .map((t) => ({
          value: String(t.idtipo_elemento_51),
          label: t.tipo_elemento_51,
        })),
    [tipos, form.idtipo_elemento_53]
  );

  const categoriaOptions = useMemo(
    () =>
      [...categoriasFiltradas]
        .sort((a, b) =>
          a.categoria_52.localeCompare(b.categoria_52, 'es', { sensitivity: 'base' })
        )
        .map((c) => ({
          value: String(c.idcategoria_elemento_52),
          label: c.categoria_52,
        })),
    [categoriasFiltradas]
  );

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const nombreQ = filtroNombre.trim().toLowerCase();
    let list = items.filter((el) => {
      const matchText =
        !q ||
        el.codigo_53.toLowerCase().includes(q) ||
        el.nombre_53.toLowerCase().includes(q) ||
        (el.clase_nombre || '').toLowerCase().includes(q) ||
        (el.tipo_elemento_nombre || '').toLowerCase().includes(q) ||
        (el.categoria_nombre || '').toLowerCase().includes(q) ||
        (el.marca_nombre || '').toLowerCase().includes(q);
      const matchNombre = !nombreQ || el.nombre_53.toLowerCase().includes(nombreQ);
      const matchTipo = !filtroTipo || String(el.idtipo_elemento_53) === filtroTipo;
      const matchClase = !filtroClase || String(el.idclase_51) === filtroClase;
      const matchCategoria =
        !filtroCategoria || String(el.idcategoria_53) === filtroCategoria;
      return matchText && matchNombre && matchTipo && matchClase && matchCategoria;
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
  }, [
    items,
    searchTerm,
    filtroNombre,
    filtroTipo,
    filtroClase,
    filtroCategoria,
    sortConfig,
  ]);

  const claseFiltroOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const el of items) {
      if (el.idclase_51 != null && el.clase_nombre) {
        map.set(String(el.idclase_51), el.clase_nombre);
      }
    }
    for (const t of tipos) {
      if (t.idclase_51 != null && t.clase_nombre) {
        map.set(String(t.idclase_51), t.clase_nombre);
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [items, tipos]);

  const tipoFiltroOptions = useMemo(
    () =>
      [...tipos]
        .filter((t) => !filtroClase || String(t.idclase_51 ?? '') === filtroClase)
        .sort((a, b) =>
          a.tipo_elemento_51.localeCompare(b.tipo_elemento_51, 'es', { sensitivity: 'base' })
        )
        .map((t) => ({
          value: String(t.idtipo_elemento_51),
          label: t.tipo_elemento_51,
        })),
    [tipos, filtroClase]
  );

  const categoriaFiltroOptions = useMemo(
    () =>
      [...categorias]
        .filter((c) => {
          if (filtroTipo) return String(c.idtipo_elemento_52) === filtroTipo;
          if (filtroClase) {
            const tipoIds = new Set(
              tipos
                .filter((t) => String(t.idclase_51 ?? '') === filtroClase)
                .map((t) => String(t.idtipo_elemento_51))
            );
            return tipoIds.has(String(c.idtipo_elemento_52));
          }
          return true;
        })
        .sort((a, b) =>
          a.categoria_52.localeCompare(b.categoria_52, 'es', { sensitivity: 'base' })
        )
        .map((c) => ({
          value: String(c.idcategoria_elemento_52),
          label: c.categoria_52,
        })),
    [categorias, tipos, filtroTipo, filtroClase]
  );

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroNombre, filtroTipo, filtroClase, filtroCategoria]);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroNombre('');
    setFiltroClase('');
    setFiltroTipo('');
    setFiltroCategoria('');
  };

  const hayFiltrosActivos = Boolean(
    searchTerm.trim() ||
      filtroNombre.trim() ||
      filtroClase ||
      filtroTipo ||
      filtroCategoria
  );

  const handleClaseFiltroChange = (value: string) => {
    setFiltroClase(value);
    if (value) {
      const tipoOk = tipos.some(
        (t) =>
          String(t.idtipo_elemento_51) === filtroTipo &&
          String(t.idclase_51 ?? '') === value
      );
      if (!tipoOk) {
        setFiltroTipo('');
        setFiltroCategoria('');
      } else {
        const catOk = categorias.some(
          (c) =>
            String(c.idcategoria_elemento_52) === filtroCategoria &&
            String(c.idtipo_elemento_52) === filtroTipo
        );
        if (!catOk) setFiltroCategoria('');
      }
    }
  };

  const handleTipoFiltroChange = (value: string) => {
    setFiltroTipo(value);
    if (value) {
      const catOk = categorias.some(
        (c) =>
          String(c.idcategoria_elemento_52) === filtroCategoria &&
          String(c.idtipo_elemento_52) === value
      );
      if (!catOk) setFiltroCategoria('');
    } else {
      setFiltroCategoria('');
    }
  };

  const handleSort = (key: keyof ElementoEpp) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: keyof ElementoEpp) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const formatValor = (valor: number | null | undefined) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const stockClass = (el: ElementoEpp) => {
    if (Number(el.stock_actual_53) <= 0) return 'stock-cero';
    if (Number(el.stock_actual_53) <= Number(el.stock_minimo_53)) return 'stock-bajo';
    return 'stock-ok';
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (el: ElementoEpp) => {
    setEditingId(el.idelemento_53);
    setForm({
      codigo_53: el.codigo_53,
      nombre_53: el.nombre_53,
      idtipo_elemento_53: String(el.idtipo_elemento_53),
      idcategoria_53: String(el.idcategoria_53),
      idmarca_53: el.idmarca_53 ? String(el.idmarca_53) : '',
      descripcion_53: el.descripcion_53 || '',
      unidad_medida_53: el.unidad_medida_53 || 'UNIDAD',
      stock_actual_53: String(el.stock_actual_53 ?? 0),
      stock_minimo_53: String(el.stock_minimo_53 ?? 5),
      valor_unitario_53: String(el.valor_unitario_53 ?? 0),
      activo_53: el.activo_53,
    });
    setShowForm(true);
  };

  const handleTipoChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      idtipo_elemento_53: value,
      idcategoria_53: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_53.trim()) {
      await showError('Validación', 'El nombre es requerido');
      return;
    }
    if (!form.idtipo_elemento_53) {
      await showError('Validación', 'Seleccione un tipo');
      return;
    }
    if (!form.idcategoria_53) {
      await showError('Validación', 'Seleccione una categoría');
      return;
    }
    if (editingId && !form.codigo_53.trim()) {
      await showError('Validación', 'El código es requerido al editar');
      return;
    }
    const stock = Number(form.stock_actual_53);
    const stockMin = Number(form.stock_minimo_53);
    if (Number.isNaN(stock) || stock < 0 || Number.isNaN(stockMin) || stockMin < 0) {
      await showError('Validación', 'El stock no puede ser negativo');
      return;
    }

    const payload = {
      codigo_53: form.codigo_53.trim().toUpperCase() || undefined,
      nombre_53: form.nombre_53.trim().toUpperCase(),
      idtipo_elemento_53: Number(form.idtipo_elemento_53),
      idcategoria_53: Number(form.idcategoria_53),
      idmarca_53: form.idmarca_53 ? Number(form.idmarca_53) : null,
      descripcion_53: form.descripcion_53.trim().toUpperCase() || null,
      unidad_medida_53: form.unidad_medida_53.trim().toUpperCase() || 'UNIDAD',
      stock_actual_53: stock,
      stock_minimo_53: stockMin,
      valor_unitario_53: Number(form.valor_unitario_53) || 0,
      activo_53: form.activo_53,
    };

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse<ElementoEpp> = await res.json();
      if (data.success) {
        await fetchData();
        resetForm();
        await showSuccess(
          editingId ? 'Actualizado' : 'Creado',
          editingId
            ? data.message || 'OK'
            : `Código asignado: ${data.data?.codigo_53 || 'automático'}`
        );
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('este elemento EPP');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Eliminado', data.message || 'Elemento eliminado');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = async () => {
    await exportToExcel(
      filteredAndSorted.map((el) => ({
        ID: el.idelemento_53,
        Código: el.codigo_53,
        Nombre: el.nombre_53,
        Clase: el.clase_nombre || '',
        Tipo: el.tipo_elemento_nombre || '',
        Categoría: el.categoria_nombre || '',
        Marca: el.marca_nombre || '',
        Stock: el.stock_actual_53,
        'Stock mínimo': el.stock_minimo_53,
        Valor: el.valor_unitario_53,
        Unidad: el.unidad_medida_53,
        Activo: el.activo_53 ? 'Sí' : 'No',
      })),
      'elementos-epp'
    );
  };

  if (loading) return <div className="loading">Cargando elementos EPP...</div>;

  return (
    <div className="bodega-view elemento-epp-view">
      <div className="view-header">
        <h2>Elementos EPP</h2>
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
          <h3>{editingId ? 'Editar elemento' : 'Nuevo elemento'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="codigo_53">Código {editingId ? '*' : '(opcional)'}</label>
                <input
                  id="codigo_53"
                  className="form-input"
                  value={form.codigo_53}
                  onChange={(e) => setForm((p) => ({ ...p, codigo_53: e.target.value.toUpperCase() }))}
                  required={Boolean(editingId)}
                  maxLength={50}
                  placeholder={editingId ? '' : 'Se genera solo: EPP-0001'}
                  aria-describedby="codigo-elemento-hint"
                />
                {!editingId && (
                  <small id="codigo-elemento-hint" className="form-hint">
                    Si lo dejas vacío, se crea automáticamente (EPP-0001, EPP-0002…).
                  </small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="nombre_53">Nombre *</label>
                <input
                  id="nombre_53"
                  className="form-input"
                  value={form.nombre_53}
                  onChange={(e) => setForm((p) => ({ ...p, nombre_53: e.target.value.toUpperCase() }))}
                  required
                  maxLength={150}
                />
              </div>
              <div className="form-group">
                <label htmlFor="idmarca_53">Marca</label>
                <SearchableSelect
                  id="idmarca_53"
                  value={form.idmarca_53}
                  onChange={(value) => setForm((p) => ({ ...p, idmarca_53: value }))}
                  options={marcaOptions}
                  placeholder="Buscar o seleccionar marca..."
                  aria-label="Seleccionar marca"
                  emptyMessage="No se encontraron marcas"
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idtipo_elemento_53">Tipo *</label>
                <SearchableSelect
                  id="idtipo_elemento_53"
                  value={form.idtipo_elemento_53}
                  onChange={handleTipoChange}
                  options={tipoOptions}
                  placeholder="Buscar tipo..."
                  required
                  aria-label="Buscar o seleccionar tipo de elemento"
                  emptyMessage="No se encontraron tipos"
                />
              </div>
              <div className="form-group">
                <label htmlFor="idcategoria_53">Categoría *</label>
                <SearchableSelect
                  id="idcategoria_53"
                  value={form.idcategoria_53}
                  onChange={(value) => setForm((p) => ({ ...p, idcategoria_53: value }))}
                  options={categoriaOptions}
                  placeholder={
                    form.idtipo_elemento_53
                      ? 'Buscar categoría...'
                      : 'Primero elija tipo'
                  }
                  required
                  disabled={!form.idtipo_elemento_53}
                  aria-label="Buscar o seleccionar categoría"
                  emptyMessage="No se encontraron categorías para este tipo"
                />
              </div>
              <div className="form-group">
                <label htmlFor="unidad_medida_53">Unidad</label>
                <input
                  id="unidad_medida_53"
                  className="form-input"
                  value={form.unidad_medida_53}
                  onChange={(e) => setForm((p) => ({ ...p, unidad_medida_53: e.target.value.toUpperCase() }))}
                  maxLength={20}
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="stock_actual_53">Stock</label>
                <input
                  id="stock_actual_53"
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.stock_actual_53}
                  onChange={(e) => setForm((p) => ({ ...p, stock_actual_53: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="stock_minimo_53">Stock mínimo</label>
                <input
                  id="stock_minimo_53"
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.stock_minimo_53}
                  onChange={(e) => setForm((p) => ({ ...p, stock_minimo_53: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="valor_unitario_53">Valor unitario</label>
                <input
                  id="valor_unitario_53"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.valor_unitario_53}
                  onChange={(e) => setForm((p) => ({ ...p, valor_unitario_53: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="descripcion_53">Descripción</label>
                <input
                  id="descripcion_53"
                  className="form-input"
                  value={form.descripcion_53}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion_53: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activo_53">Activo</label>
                <select
                  id="activo_53"
                  className="form-input"
                  value={form.activo_53 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_53: e.target.value === '1' }))}
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

      <div className="epp-toolbar">
        <p className="epp-total">
          Total: <strong>{filteredAndSorted.length}</strong> elementos
        </p>
        <div className="epp-filters">
          <input
            type="search"
            className="form-input epp-filter-nombre"
            placeholder="Filtrar por nombre..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value.toUpperCase())}
            aria-label="Filtrar por nombre"
          />
          <div className="epp-filter-select">
            <SearchableSelect
              id="filtro-clase-elemento"
              value={filtroClase}
              onChange={handleClaseFiltroChange}
              options={claseFiltroOptions}
              placeholder="Filtrar clase..."
              uppercase={false}
              aria-label="Filtrar por clase"
              emptyMessage="Sin clases"
            />
          </div>
          <div className="epp-filter-select">
            <SearchableSelect
              id="filtro-tipo-elemento"
              value={filtroTipo}
              onChange={handleTipoFiltroChange}
              options={tipoFiltroOptions}
              placeholder="Filtrar tipo..."
              uppercase={false}
              aria-label="Filtrar por tipo"
              emptyMessage="Sin tipos para esta clase"
            />
          </div>
          <div className="epp-filter-select">
            <SearchableSelect
              id="filtro-categoria-elemento"
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              options={categoriaFiltroOptions}
              placeholder="Filtrar categoría..."
              uppercase={false}
              aria-label="Filtrar por categoría"
              emptyMessage="Sin categorías"
            />
          </div>
          <input
            type="search"
            className="form-input epp-search"
            placeholder="🔍 BUSCAR (código, marca...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            aria-label="Búsqueda general de elementos EPP"
          />
          {hayFiltrosActivos && (
            <button
              type="button"
              className="btn-secondary epp-clear-filters"
              onClick={limpiarFiltros}
              aria-label="Limpiar todos los filtros"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className={sortClass('codigo_53')} onClick={() => handleSort('codigo_53')}>Código</th>
              <th className={sortClass('nombre_53')} onClick={() => handleSort('nombre_53')}>Nombre</th>
              <th className={sortClass('clase_nombre')} onClick={() => handleSort('clase_nombre')}>Clase</th>
              <th className={sortClass('tipo_elemento_nombre')} onClick={() => handleSort('tipo_elemento_nombre')}>Tipo</th>
              <th className={sortClass('categoria_nombre')} onClick={() => handleSort('categoria_nombre')}>Categoría</th>
              <th className={sortClass('marca_nombre')} onClick={() => handleSort('marca_nombre')}>Marca</th>
              <th className={sortClass('stock_actual_53')} onClick={() => handleSort('stock_actual_53')}>Stock</th>
              <th className={sortClass('valor_unitario_53')} onClick={() => handleSort('valor_unitario_53')}>Valor</th>
              <th className={sortClass('activo_53')} onClick={() => handleSort('activo_53')}>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="epp-empty">No hay elementos registrados</td>
              </tr>
            ) : (
              pageItems.map((el) => (
                <tr key={el.idelemento_53}>
                  <td><strong>{el.codigo_53}</strong></td>
                  <td>{el.nombre_53}</td>
                  <td>{el.clase_nombre || '-'}</td>
                  <td>{el.tipo_elemento_nombre || '-'}</td>
                  <td>{el.categoria_nombre || '-'}</td>
                  <td>{el.marca_nombre || '-'}</td>
                  <td className={`text-center ${stockClass(el)}`}>{el.stock_actual_53}</td>
                  <td className="epp-valor">{formatValor(el.valor_unitario_53)}</td>
                  <td>
                    <span className={el.activo_53 ? 'badge-activo' : 'badge-inactivo'}>
                      {el.activo_53 ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(el)} title="Editar" aria-label={`Editar ${el.nombre_53}`}>✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(el.idelemento_53)} title="Eliminar" aria-label={`Eliminar ${el.nombre_53}`}>🗑️</button>
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

export default ElementoEppView;
