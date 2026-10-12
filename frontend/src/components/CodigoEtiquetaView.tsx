import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './BodegaView.css';
import './CodigoEtiquetaView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess, showWarning } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';
import { imprimirEtiqueta } from '../utils/printEtiqueta';
import { exportToExcel } from '../utils/exportUtils';
import { TAMANOS_ETIQUETA, tamanoEtiquetaMm, type TamanoEtiquetaId } from '../utils/code128';

interface CodigoEtiqueta {
  idcodigo_89: number;
  codigo_89: string;
  descripcion_89: string;
  proveedor_89: string;
  activo_89: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const emptyForm = { codigo_89: '', descripcion_89: '', proveedor_89: '' };
const API_URL = apiUrl('/codigos-etiqueta');

type SortKey = 'idcodigo_89' | 'codigo_89' | 'descripcion_89';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' };

function matchTexto(r: CodigoEtiqueta, q: string): boolean {
  return (
    !q ||
    r.codigo_89.includes(q) ||
    r.descripcion_89.includes(q) ||
    r.proveedor_89.includes(q)
  );
}

const CodigoEtiquetaView: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const codigoRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CodigoEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [jsonText, setJsonText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroTamano, setFiltroTamano] = useState<TamanoEtiquetaId | ''>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'idcodigo_89', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [copias, setCopias] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<CodigoEtiqueta[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data);
      else setError(data.error || 'Error al cargar códigos');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const proveedores = useMemo(() => {
    const set = new Set(items.map((r) => r.proveedor_89).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    const list = items.filter((r) => {
      if (!matchTexto(r, q)) return false;
      if (filtroProveedor && r.proveedor_89 !== filtroProveedor) return false;
      if (filtroTamano && tamanoEtiquetaMm(r.codigo_89).id !== filtroTamano) return false;
      return true;
    });
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortConfig.key === 'idcodigo_89') {
        return (a.idcodigo_89 - b.idcodigo_89) * dir;
      }
      const cmp = a[sortConfig.key].localeCompare(b[sortConfig.key], 'es', {
        numeric: true,
        sensitivity: 'base',
      });
      return cmp * dir;
    });
    return list;
  }, [items, searchTerm, filtroProveedor, filtroTamano, sortConfig]);

  const conteoPorTamano = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    const counts = Object.fromEntries(TAMANOS_ETIQUETA.map((t) => [t.id, 0])) as Record<
      TamanoEtiquetaId,
      number
    >;
    for (const r of items) {
      if (!matchTexto(r, q)) continue;
      if (filtroProveedor && r.proveedor_89 !== filtroProveedor) continue;
      counts[tamanoEtiquetaMm(r.codigo_89).id] += 1;
    }
    return counts;
  }, [items, searchTerm, filtroProveedor]);

  const conteoPorProveedor = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    const counts: Record<string, number> = {};
    for (const r of items) {
      if (!matchTexto(r, q)) continue;
      if (filtroTamano && tamanoEtiquetaMm(r.codigo_89).id !== filtroTamano) continue;
      counts[r.proveedor_89] = (counts[r.proveedor_89] || 0) + 1;
    }
    return counts;
  }, [items, searchTerm, filtroTamano]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroProveedor, filtroTamano, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortClass = (key: SortKey) =>
    `sortable ${sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`;

  const onSortKey = (key: SortKey) => (e: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(key);
    }
  };

  const setUpper =
    (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      changeKeepingCaret(e, (v) => setForm((p) => ({ ...p, [key]: v.toUpperCase() })));
    };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError('');
  };

  const handleNuevo = (codigoInicial = '') => {
    setShowJson(false);
    setEditingId(null);
    setForm({ ...emptyForm, codigo_89: codigoInicial });
    setShowForm(true);
    setTimeout(() => codigoRef.current?.focus(), 0);
  };

  const startEdit = (row: CodigoEtiqueta) => {
    setShowJson(false);
    setEditingId(row.idcodigo_89);
    setForm({
      codigo_89: row.codigo_89,
      descripcion_89: row.descripcion_89,
      proveedor_89: row.proveedor_89,
    });
    setShowForm(true);
    setTimeout(() => codigoRef.current?.focus(), 0);
  };

  const validarForm = async (): Promise<boolean> => {
    if (!form.codigo_89.trim() || !form.descripcion_89.trim() || !form.proveedor_89.trim()) {
      await showError('Validación', 'Código, descripción y proveedor son requeridos');
      return false;
    }
    if (form.codigo_89.trim().length > 25) {
      await showError('Validación', 'El código no puede superar 25 caracteres');
      return false;
    }
    return true;
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await validarForm())) return;
    const payload = {
      codigo_89: form.codigo_89.trim(),
      descripcion_89: form.descripcion_89.trim(),
      proveedor_89: form.proveedor_89.trim(),
    };
    try {
      const res = await apiFetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse<CodigoEtiqueta> = await res.json();
      if (!data.success) {
        await showError('No se grabó', data.error || 'El código ya existe');
        codigoRef.current?.select();
        return;
      }
      await fetchData(true);
      if (editingId) {
        await showSuccess('Actualizado', data.message || 'Código corregido');
        resetForm();
      } else {
        await showSuccess('Creado', data.message || 'Código guardado');
        setForm((p) => ({ ...p, codigo_89: '', descripcion_89: '' }));
        codigoRef.current?.focus();
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleEliminar = async (row: CodigoEtiqueta) => {
    const ok = await showDeleteConfirm(`el código ${row.codigo_89}`, 'Solo para errores de digitación. No se puede deshacer.');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${row.idcodigo_89}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('Eliminado', data.message || 'Código eliminado');
        await fetchData(true);
        if (editingId === row.idcodigo_89) resetForm();
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión al eliminar');
    }
  };

  const handleImportJson = async () => {
    const raw = jsonText.trim();
    if (!raw) {
      await showError('JSON', 'Pegá el JSON del bot (factura Kaufmann u otro)');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await showError('JSON', 'El texto no es un JSON válido');
      return;
    }
    try {
      const res = await apiFetch(`${API_URL}/importar`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      const data: ApiResponse<{ inserted: number; skipped: number; total: number }> = await res.json();
      if (data.success) {
        await fetchData(true);
        setJsonText('');
        setShowJson(false);
        await showSuccess('Importación', data.message || 'Listo');
      } else {
        await showError('JSON', data.error || 'No se pudo importar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const hayFiltrosActivos = Boolean(searchTerm.trim() || filtroProveedor || filtroTamano);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroProveedor('');
    setFiltroTamano('');
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      void showWarning('Excel', 'No hay códigos para exportar con el filtro actual');
      return;
    }
    exportToExcel(
      filtered.map((r) => ({
        ID: r.idcodigo_89,
        Codigo: r.codigo_89,
        Descripcion: r.descripcion_89,
        Proveedor: r.proveedor_89,
        Etiqueta: tamanoEtiquetaMm(r.codigo_89).nombre,
      })),
      'etiquetas',
      'Etiquetas'
    );
  };

  const handlePrint = (row: CodigoEtiqueta) => {
    try {
      imprimirEtiqueta(row, copias);
    } catch (err) {
      void showError('Imprimir', err instanceof Error ? err.message : 'No se pudo enviar RAW a la TLP');
    }
  };

  const onScanSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const q = searchTerm.trim().toUpperCase();
    if (!q) return;
    const exact = items.find((r) => r.codigo_89 === q);
    if (exact) {
      e.preventDefault();
      handlePrint(exact);
    } else {
      e.preventDefault();
      handleNuevo(q);
    }
  };

  const onCodigoKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.getElementById('descripcion_89') as HTMLInputElement | null)?.focus();
    }
  };

  const handleSalir = () => {
    if (showForm || showJson) {
      resetForm();
      setShowJson(false);
      return;
    }
    window.location.hash = 'dashboard';
  };

  const tamanoForm = tamanoEtiquetaMm(form.codigo_89 || 'XXXXXXXXXXXXXXXXXXXX');

  return (
    <div className="bodega-view etiqueta-view">
      <div className="view-header">
        <h2>🏷️ Etiquetas</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleNuevo()}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
          >
            💾 Guardar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowJson((v) => !v);
            }}
            style={{ backgroundColor: '#6f42c1' }}
          >
            📄 Cargar JSON
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleExportExcel}
            style={{ backgroundColor: '#dc3545' }}
          >
            📊 Excel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={limpiarFiltros}
            disabled={!hayFiltrosActivos}
            aria-label="Limpiar búsqueda, proveedor y tipo de etiqueta"
          >
            🧹 Limpiar filtros
          </button>
          <button type="button" className="btn-secondary" onClick={handleSalir}>
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Corregir etiqueta' : '➕ Nueva etiqueta'}</h3>
          <p className="etiqueta-hint">
            {editingId
              ? 'Corregí código, descripción o proveedor. El código no puede repetirse.'
              : 'Pistola o teclado. Si el código ya existe, no se duplica. Tamaño según largo:'}{' '}
            <strong>{tamanoForm.nombre}</strong>
          </p>
          <form ref={formRef} onSubmit={handleGuardar}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="codigo_89">Código * (máx. 25)</label>
                <input
                  ref={codigoRef}
                  id="codigo_89"
                  className="form-input"
                  maxLength={25}
                  autoComplete="off"
                  value={form.codigo_89}
                  onChange={setUpper('codigo_89')}
                  onKeyDown={onCodigoKey}
                />
              </div>
              <div className="form-group">
                <label htmlFor="descripcion_89">Descripción *</label>
                <input
                  id="descripcion_89"
                  className="form-input"
                  maxLength={200}
                  value={form.descripcion_89}
                  onChange={setUpper('descripcion_89')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="proveedor_89">Proveedor *</label>
                <input
                  id="proveedor_89"
                  className="form-input"
                  maxLength={80}
                  value={form.proveedor_89}
                  onChange={setUpper('proveedor_89')}
                  placeholder="KAUFMANN"
                />
              </div>
            </div>
            <div className="form-actions etiqueta-form-actions">
              {editingId ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const row = items.find((r) => r.idcodigo_89 === editingId);
                    if (row) handlePrint({ ...row, ...form });
                  }}
                >
                  🖨️ Imprimir
                </button>
              ) : (
                <span className="etiqueta-hint" style={{ margin: 0 }}>
                  💡 Después de guardar el código queda listo para pistola otra vez.
                </span>
              )}
              <button type="button" className="btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {showJson && (
        <div className="form-container">
          <h3>📄 Importar JSON del bot</h3>
          <p className="etiqueta-hint">Pegá el archivo de factura (items + proveedor). Los códigos repetidos se omiten.</p>
          <textarea
            className="form-input etiqueta-json"
            rows={8}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"proveedor":{"nombre":"KAUFMANN"},"items":[{"codigo":"...","descripcion":"..."}]}'
            aria-label="JSON de factura"
          />
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={handleImportJson}>
              Importar
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowJson(false)}>
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {!showForm && !showJson && (
        <>
          <div className="form-container etiqueta-toolbar">
            <div className="etiqueta-periodo">
              🏷️ Catálogo: {filtered.length} de {items.length} códigos
              <span className="etiqueta-agente is-ok">TLP RAW al puerto (se abre y cierra solo)</span>
            </div>
            <div className="etiqueta-search">
              <input
                className="form-input etiqueta-search-q"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                onKeyDown={onScanSearch}
                placeholder="🔍 Buscar o pistola: Enter imprime si el código existe"
                aria-label="Buscar código"
              />
              <label className="etiqueta-filtro etiqueta-filtro-proveedor" htmlFor="filtro-proveedor">
                Proveedor
                <select
                  id="filtro-proveedor"
                  className="form-input"
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                >
                  <option value="">
                    Todos ({proveedores.reduce((n, p) => n + (conteoPorProveedor[p] || 0), 0)})
                  </option>
                  {proveedores.map((p) => (
                    <option key={p} value={p}>
                      {p} ({conteoPorProveedor[p] || 0})
                    </option>
                  ))}
                </select>
              </label>
              <label className="etiqueta-filtro" htmlFor="filtro-tamano">
                Tipo de etiqueta
                <select
                  id="filtro-tamano"
                  className="form-input"
                  value={filtroTamano}
                  onChange={(e) => setFiltroTamano(e.target.value as TamanoEtiquetaId | '')}
                >
                  <option value="">
                    Todas ({TAMANOS_ETIQUETA.reduce((n, t) => n + conteoPorTamano[t.id], 0)})
                  </option>
                  {TAMANOS_ETIQUETA.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({conteoPorTamano[t.id]})
                    </option>
                  ))}
                </select>
              </label>
              <label className="etiqueta-copias" htmlFor="etiqueta-copias">
                Impresiones
                <div className="etiqueta-stepper">
                  <button
                    type="button"
                    className="etiqueta-stepper-btn"
                    onClick={() => setCopias((n) => Math.max(1, n - 1))}
                    disabled={copias <= 1}
                    aria-label="Menos impresiones"
                  >
                    −
                  </button>
                  <input
                    id="etiqueta-copias"
                    type="number"
                    min={1}
                    max={20}
                    className="form-input etiqueta-stepper-value"
                    value={copias}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) {
                        setCopias(1);
                        return;
                      }
                      setCopias(Math.max(1, Math.min(20, Math.trunc(n))));
                    }}
                    aria-label="Cantidad de impresiones"
                  />
                  <button
                    type="button"
                    className="etiqueta-stepper-btn"
                    onClick={() => setCopias((n) => Math.min(20, n + 1))}
                    disabled={copias >= 20}
                    aria-label="Más impresiones"
                  >
                    +
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading" style={{ padding: '2rem' }}>
                Cargando etiquetas...
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      className={sortClass('idcodigo_89')}
                      onClick={() => handleSort('idcodigo_89')}
                      onKeyDown={onSortKey('idcodigo_89')}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={
                        sortConfig.key === 'idcodigo_89'
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      ID
                    </th>
                    <th
                      className={sortClass('codigo_89')}
                      onClick={() => handleSort('codigo_89')}
                      onKeyDown={onSortKey('codigo_89')}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={
                        sortConfig.key === 'codigo_89'
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Código
                    </th>
                    <th
                      className={sortClass('descripcion_89')}
                      onClick={() => handleSort('descripcion_89')}
                      onKeyDown={onSortKey('descripcion_89')}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={
                        sortConfig.key === 'descripcion_89'
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      Descripción
                    </th>
                    <th>Proveedor</th>
                    <th>Etiqueta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="no-data">
                        {searchTerm || filtroTamano || filtroProveedor
                          ? `📋 No se encontraron códigos con ese filtro`
                          : '📋 No hay códigos. Nuevo, pistola o Cargar JSON.'}
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((r) => (
                      <tr key={r.idcodigo_89} className="fade-in">
                        <td>{r.idcodigo_89}</td>
                        <td>
                          <code>{r.codigo_89}</code>
                        </td>
                        <td>{r.descripcion_89}</td>
                        <td>{r.proveedor_89}</td>
                        <td>{tamanoEtiquetaMm(r.codigo_89).nombre}</td>
                        <td className="actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => handlePrint(r)}
                            title="Imprimir"
                            aria-label={`Imprimir ${r.codigo_89}`}
                          >
                            🖨️
                          </button>
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => startEdit(r)}
                            title="Editar"
                            aria-label={`Editar ${r.codigo_89}`}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleEliminar(r)}
                            title="Eliminar"
                            aria-label={`Eliminar ${r.codigo_89}`}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default CodigoEtiquetaView;
