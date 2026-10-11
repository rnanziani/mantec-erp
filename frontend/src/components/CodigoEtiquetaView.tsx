import React, { useEffect, useMemo, useRef, useState } from 'react';
import './BodegaView.css';
import './CodigoEtiquetaView.css';
import Pagination from './shared/Pagination';
import { showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';
import { imprimirEtiqueta } from '../utils/printEtiqueta';
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

const CodigoEtiquetaView: React.FC = () => {
  const codigoRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CodigoEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [jsonText, setJsonText] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTamano, setFiltroTamano] = useState<TamanoEtiquetaId | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copias, setCopias] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl('/codigos-etiqueta');

  const fetchData = async () => {
    try {
      setLoading(true);
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    return items.filter((r) => {
      const matchTexto =
        !q ||
        r.codigo_89.includes(q) ||
        r.descripcion_89.includes(q) ||
        r.proveedor_89.includes(q);
      if (!matchTexto) return false;
      if (!filtroTamano) return true;
      return tamanoEtiquetaMm(r.codigo_89).id === filtroTamano;
    });
  }, [items, searchTerm, filtroTamano]);

  const conteoPorTamano = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    const counts: Record<TamanoEtiquetaId, number> = { '32x22': 0, '50x30': 0, '100x30': 0 };
    for (const r of items) {
      if (
        q &&
        !r.codigo_89.includes(q) &&
        !r.descripcion_89.includes(q) &&
        !r.proveedor_89.includes(q)
      ) {
        continue;
      }
      counts[tamanoEtiquetaMm(r.codigo_89).id] += 1;
    }
    return counts;
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroTamano]);

  const setUpper =
    (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      changeKeepingCaret(e, (v) => setForm((p) => ({ ...p, [key]: v.toUpperCase() })));
    };

  const handleAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_89.trim() || !form.descripcion_89.trim() || !form.proveedor_89.trim()) {
      await showError('Validación', 'Código, descripción y proveedor son requeridos');
      return;
    }
    if (form.codigo_89.trim().length > 25) {
      await showError('Validación', 'El código no puede superar 25 caracteres');
      return;
    }
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          codigo_89: form.codigo_89.trim(),
          descripcion_89: form.descripcion_89.trim(),
          proveedor_89: form.proveedor_89.trim(),
        }),
      });
      const data: ApiResponse<CodigoEtiqueta> = await res.json();
      if (data.success) {
        await fetchData();
        setForm((p) => ({ ...p, codigo_89: '', descripcion_89: '' }));
        codigoRef.current?.focus();
        await showSuccess('Creado', data.message || 'Código guardado');
      } else {
        await showError('No se grabó', data.error || 'El código ya existe');
        codigoRef.current?.select();
      }
    } catch {
      await showError('Error', 'Error de conexión');
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
        await fetchData();
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

  const handlePrint = (row: CodigoEtiqueta) => {
    try {
      imprimirEtiqueta(row, copias);
    } catch (err) {
      void showError('Imprimir', err instanceof Error ? err.message : 'No se pudo abrir la impresión');
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
      setForm((p) => ({ ...p, codigo_89: q }));
      codigoRef.current?.focus();
    }
  };

  const onCodigoKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.getElementById('descripcion_89') as HTMLInputElement | null)?.focus();
    }
  };

  if (loading) return <div className="loading">Cargando etiquetas...</div>;

  const tamanoForm = tamanoEtiquetaMm(form.codigo_89 || 'XXXXXXXXXXXXXXXXXXXX');

  return (
    <div className="bodega-view etiqueta-view">
      <div className="view-header">
        <h2>Etiquetas</h2>
        <div className="header-actions">
          <button type="button" className="btn-info" onClick={() => setShowJson((v) => !v)}>
            Cargar JSON
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

      <div className="form-container">
        <h3>Alta (teclado o pistola)</h3>
        <p className="etiqueta-hint">
          La pistola escribe el código y Enter. Si ya existe, no se duplica. Tamaño sugerido según largo:{' '}
          <strong>{tamanoForm.nombre}</strong>
        </p>
        <form onSubmit={handleAlta}>
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
          <button type="submit" className="btn-success">
            Guardar (solo si no existe)
          </button>
        </form>
      </div>

      {showJson && (
        <div className="form-container">
          <h3>Importar JSON del bot</h3>
          <p className="etiqueta-hint">Pegá el archivo de factura (items + proveedor). Los códigos repetidos se omiten.</p>
          <textarea
            className="form-input etiqueta-json"
            rows={8}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"proveedor":{"nombre":"KAUFMANN"},"items":[{"codigo":"...","descripcion":"..."}]}'
            aria-label="JSON de factura"
          />
          <button type="button" className="btn-primary" onClick={handleImportJson}>
            Importar
          </button>
        </div>
      )}

      <div className="search-section etiqueta-search">
        <input
          className="form-input etiqueta-search-q"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          onKeyDown={onScanSearch}
          placeholder="Buscar o pistola: Enter imprime si el código existe"
          aria-label="Buscar código"
        />
        <label className="etiqueta-filtro" htmlFor="filtro-tamano">
          Tipo de etiqueta
          <select
            id="filtro-tamano"
            className="form-input"
            value={filtroTamano}
            onChange={(e) => setFiltroTamano(e.target.value as TamanoEtiquetaId | '')}
          >
            <option value="">
              Todas ({conteoPorTamano['32x22'] + conteoPorTamano['50x30'] + conteoPorTamano['100x30']})
            </option>
            {TAMANOS_ETIQUETA.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({conteoPorTamano[t.id]})
              </option>
            ))}
          </select>
        </label>
        <label className="etiqueta-copias">
          Copias
          <input
            type="number"
            min={1}
            max={20}
            className="form-input"
            value={copias}
            onChange={(e) => setCopias(Number(e.target.value) || 1)}
          />
        </label>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Proveedor</th>
              <th>Etiqueta</th>
              <th>Imprimir</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6}>No hay códigos. Cargá JSON, tipeá o usá la pistola.</td>
              </tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.idcodigo_89}>
                  <td>{r.idcodigo_89}</td>
                  <td>
                    <code>{r.codigo_89}</code>
                  </td>
                  <td>{r.descripcion_89}</td>
                  <td>{r.proveedor_89}</td>
                  <td>{tamanoEtiquetaMm(r.codigo_89).nombre}</td>
                  <td>
                    <button type="button" className="btn-primary" onClick={() => handlePrint(r)}>
                      Imprimir
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

export default CodigoEtiquetaView;
