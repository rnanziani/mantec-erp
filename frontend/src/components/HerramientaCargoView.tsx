import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface HerramientaCargo {
  idherramienta_66: number;
  codigo_66: string;
  nombre_66: string;
  idmarca_insumo_66?: number | null;
  modelo_66?: string | null;
  serie_66?: string | null;
  ubicacion_66?: string | null;
  valor_66: number;
  stock_66: number;
  stock_disponible_66: number;
  estado_66: string;
  activo_66: boolean;
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

const ESTADOS = ['DISPONIBLE', 'A_CARGO', 'EN_MANTENCION', 'PERDIDA', 'DANADA', 'DE_BAJA'] as const;

const emptyForm = {
  codigo_66: '',
  nombre_66: '',
  idmarca_insumo_66: '',
  modelo_66: '',
  serie_66: '',
  ubicacion_66: '',
  valor_66: '0',
  stock_66: '1',
  stock_disponible_66: '1',
  estado_66: 'DISPONIBLE',
  activo_66: true,
};

const HerramientaCargoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<HerramientaCargo[]>([]);
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

  const API_URL = apiUrl('/herramientas-cargo');
  const MARCAS_URL = apiUrl('/marcas-insumo');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [hRes, mRes] = await Promise.all([apiFetch(API_URL), apiFetch(MARCAS_URL)]);
      const hData: ApiResponse<HerramientaCargo[]> = await hRes.json();
      const mData: ApiResponse<MarcaInsumo[]> = await mRes.json();
      if (hData.success && Array.isArray(hData.data)) setItems(hData.data);
      else setError(hData.error || 'Error al cargar herramientas');
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
      marcas.map((m) => ({
        value: String(m.id_marca_insumo_37),
        label: m.marca_insumo_37,
      })),
    [marcas]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((h) => {
      if (filtroEstado && h.estado_66 !== filtroEstado) return false;
      if (!q) return true;
      return (
        h.codigo_66.toLowerCase().includes(q) ||
        h.nombre_66.toLowerCase().includes(q) ||
        (h.serie_66 || '').toLowerCase().includes(q) ||
        (h.marca_insumo_nombre || '').toLowerCase().includes(q)
      );
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

  const startEdit = (h: HerramientaCargo) => {
    setEditingId(h.idherramienta_66);
    setForm({
      codigo_66: h.codigo_66,
      nombre_66: h.nombre_66,
      idmarca_insumo_66: h.idmarca_insumo_66 ? String(h.idmarca_insumo_66) : '',
      modelo_66: h.modelo_66 || '',
      serie_66: h.serie_66 || '',
      ubicacion_66: h.ubicacion_66 || '',
      valor_66: String(h.valor_66 ?? 0),
      stock_66: String(h.stock_66 ?? 1),
      stock_disponible_66: String(h.stock_disponible_66 ?? 1),
      estado_66: h.estado_66 || 'DISPONIBLE',
      activo_66: h.activo_66,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_66.trim() || !form.nombre_66.trim()) {
      await showError('Validación', 'Código y nombre son requeridos');
      return;
    }
    const stock = Number(form.stock_66);
    const disp = Number(form.stock_disponible_66);
    if (Number.isNaN(stock) || Number.isNaN(disp) || stock < 0 || disp < 0 || disp > stock) {
      await showError('Validación', 'Stock inválido (disponible ≤ stock)');
      return;
    }
    if (form.serie_66.trim() && stock !== 1) {
      await showError('Validación', 'Si tiene serie, el stock debe ser 1');
      return;
    }
    const payload = {
      codigo_66: form.codigo_66.trim().toUpperCase(),
      nombre_66: form.nombre_66.trim().toUpperCase(),
      idmarca_insumo_66: form.idmarca_insumo_66 ? Number(form.idmarca_insumo_66) : null,
      modelo_66: form.modelo_66.trim().toUpperCase() || null,
      serie_66: form.serie_66.trim().toUpperCase() || null,
      ubicacion_66: form.ubicacion_66.trim().toUpperCase() || null,
      valor_66: Number(form.valor_66) || 0,
      stock_66: stock,
      stock_disponible_66: disp,
      estado_66: form.estado_66,
      activo_66: form.activo_66,
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
    const ok = await showDeleteConfirm('esta herramienta a cargo');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchData();
        await showSuccess('Listo', data.message || 'Eliminada');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((h) => ({
        ID: h.idherramienta_66,
        Código: h.codigo_66,
        Nombre: h.nombre_66,
        Marca: h.marca_insumo_nombre || '',
        Modelo: h.modelo_66 || '',
        Serie: h.serie_66 || '',
        Ubicación: h.ubicacion_66 || '',
        Valor: h.valor_66,
        Stock: h.stock_66,
        Disponible: h.stock_disponible_66,
        Estado: h.estado_66,
        Activo: h.activo_66 ? 'Sí' : 'No',
      })),
      'herramientas-a-cargo'
    );
  };

  const setUpper = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }));
  };

  if (loading) return <div className="loading">Cargando catálogo...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Herramientas a cargo — Catálogo</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + Nuevo
          </button>
          <button type="button" className="btn-success" disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
          </button>
          <button type="button" className="btn-info" onClick={handleExport}>Excel</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar herramienta' : 'Nueva herramienta a cargo'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="codigo_66">Código *</label>
                <input id="codigo_66" className="form-input" required maxLength={40} value={form.codigo_66} onChange={setUpper('codigo_66')} />
              </div>
              <div className="form-group">
                <label htmlFor="nombre_66">Nombre *</label>
                <input id="nombre_66" className="form-input" required maxLength={120} value={form.nombre_66} onChange={setUpper('nombre_66')} />
              </div>
              <div className="form-group">
                <label htmlFor="idmarca_insumo_66">Marca</label>
                <SearchableSelect
                  id="idmarca_insumo_66"
                  value={form.idmarca_insumo_66}
                  onChange={(v) => setForm((p) => ({ ...p, idmarca_insumo_66: v }))}
                  options={marcaOptions}
                  placeholder="Buscar marca..."
                  aria-label="Marca"
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="modelo_66">Modelo</label>
                <input id="modelo_66" className="form-input" maxLength={80} value={form.modelo_66} onChange={setUpper('modelo_66')} />
              </div>
              <div className="form-group">
                <label htmlFor="serie_66">Serie</label>
                <input id="serie_66" className="form-input" maxLength={80} value={form.serie_66} onChange={setUpper('serie_66')} />
              </div>
              <div className="form-group">
                <label htmlFor="ubicacion_66">Ubicación</label>
                <input id="ubicacion_66" className="form-input" maxLength={100} value={form.ubicacion_66} onChange={setUpper('ubicacion_66')} />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="valor_66">Valor</label>
                <input id="valor_66" type="number" min={0} step="0.01" className="form-input" value={form.valor_66} onChange={(e) => setForm((p) => ({ ...p, valor_66: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="stock_66">Stock</label>
                <input id="stock_66" type="number" min={0} className="form-input" value={form.stock_66} onChange={(e) => setForm((p) => ({ ...p, stock_66: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="stock_disponible_66">Disponible</label>
                <input id="stock_disponible_66" type="number" min={0} className="form-input" value={form.stock_disponible_66} onChange={(e) => setForm((p) => ({ ...p, stock_disponible_66: e.target.value }))} />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="estado_66">Estado</label>
                <select id="estado_66" className="form-input" value={form.estado_66} onChange={(e) => setForm((p) => ({ ...p, estado_66: e.target.value }))}>
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="activo_66">Activo</label>
                <select
                  id="activo_66"
                  className="form-input"
                  value={form.activo_66 ? '1' : '0'}
                  onChange={(e) => setForm((p) => ({ ...p, activo_66: e.target.value === '1' }))}
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar código, nombre, serie..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar herramientas"
        />
        <select className="form-input" style={{ maxWidth: 200 }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Serie</th>
              <th>Stock</th>
              <th>Disp.</th>
              <th>Estado</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={8}>Sin registros</td></tr>
            ) : (
              pageItems.map((h) => (
                <tr key={h.idherramienta_66}>
                  <td>{h.codigo_66}</td>
                  <td>{h.nombre_66}</td>
                  <td>{h.serie_66 || '—'}</td>
                  <td>{h.stock_66}</td>
                  <td>{h.stock_disponible_66}</td>
                  <td>{h.estado_66}</td>
                  <td>{h.activo_66 ? 'Sí' : 'No'}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => startEdit(h)}>Editar</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(h.idherramienta_66)}>Eliminar</button>
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

export default HerramientaCargoView;
