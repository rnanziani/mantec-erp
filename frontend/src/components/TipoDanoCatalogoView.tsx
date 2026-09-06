import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

type Kind = 'neumatico' | 'llanta';

interface Row {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const CFG = {
  neumatico: {
    title: 'Daño de neumático',
    api: '/tipos-dano-neumatico',
    exportName: 'dano_neumatico',
    map: (r: Record<string, unknown>): Row => ({
      id: Number(r.iddano_neumatico_74),
      codigo: String(r.codigo_74),
      descripcion: String(r.descripcion_74),
      activo: Boolean(r.activo_74),
    }),
    body: (codigo: string, descripcion: string, activo: boolean) => ({
      codigo_74: codigo,
      descripcion_74: descripcion,
      activo_74: activo,
    }),
  },
  llanta: {
    title: 'Daño de llanta',
    api: '/tipos-dano-llanta',
    exportName: 'dano_llanta',
    map: (r: Record<string, unknown>): Row => ({
      id: Number(r.iddano_llanta_75),
      codigo: String(r.codigo_75),
      descripcion: String(r.descripcion_75),
      activo: Boolean(r.activo_75),
    }),
    body: (codigo: string, descripcion: string, activo: boolean) => ({
      codigo_75: codigo,
      descripcion_75: descripcion,
      activo_75: activo,
    }),
  },
} as const;

const TipoDanoCatalogoView: React.FC<{ kind: Kind }> = ({ kind }) => {
  const cfg = CFG[kind];
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const API_URL = apiUrl(cfg.api);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<Record<string, unknown>[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setItems(data.data.map(cfg.map));
      else setError(data.error || 'Error al cargar');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [kind]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((p) => p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q));
  }, [items, searchTerm]);

  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const resetForm = () => {
    setCodigo('');
    setDescripcion('');
    setActivo(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !descripcion.trim()) {
      await showError('Validación', 'Código y descripción son requeridos');
      return;
    }
    const res = await apiFetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg.body(codigo.trim(), descripcion.trim(), activo)),
    });
    const data: ApiResponse = await res.json();
    if (data.success) {
      await fetchData();
      resetForm();
      await showSuccess('Listo', editingId ? 'Registro actualizado' : 'Registro creado');
    } else {
      await showError('Error', data.error || 'No se pudo guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await showDeleteConfirm('este tipo de daño'))) return;
    const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const data: ApiResponse = await res.json();
    if (data.success) {
      await fetchData();
      await showSuccess('Listo', 'Eliminado');
    } else {
      await showError('Error', data.error || 'No se pudo eliminar');
    }
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>⚠️ {cfg.title}</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>Nuevo</button>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#28a745' }} disabled={!showForm} onClick={() => formRef.current?.requestSubmit()}>Guardar</button>
          <button
            type="button"
            className="btn-primary"
            style={{ backgroundColor: '#17a2b8' }}
            onClick={() =>
              exportToExcel(
                filtered.map((p) => ({ Código: p.codigo, Descripción: p.descripcion, Activo: p.activo ? 'Sí' : 'No' })),
                cfg.exportName,
                cfg.title
              )
            }
          >
            Exportar
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>Salir</button>
        </div>
      </div>
      {error && <div role="alert" style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 8 }}>{error}</div>}
      {showForm && (
        <div className="form-container">
          <form ref={formRef} onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor={`dano-cod-${kind}`}>Código *</label>
              <input id={`dano-cod-${kind}`} className="form-input" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor={`dano-desc-${kind}`}>Descripción *</label>
              <input id={`dano-desc-${kind}`} className="form-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
            </div>
            <label>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo
            </label>
          </form>
        </div>
      )}
      <div className="form-container">
        <input className="form-input" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label={`Buscar ${cfg.title}`} />
      </div>
      {loading ? <p>Cargando...</p> : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={4} className="no-data">Sin registros</td></tr>
              ) : pageItems.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.codigo}</strong></td>
                  <td>{p.descripcion}</td>
                  <td>{p.activo ? 'Sí' : 'No'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" aria-label={`Editar ${p.codigo}`} onClick={() => {
                      setEditingId(p.id);
                      setCodigo(p.codigo);
                      setDescripcion(p.descripcion);
                      setActivo(p.activo);
                      setShowForm(true);
                    }}>✏️</button>
                    <button type="button" className="btn-delete" aria-label={`Eliminar ${p.codigo}`} onClick={() => handleDelete(p.id)}>🚫</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export const TipoDanoNeumaticoView: React.FC = () => <TipoDanoCatalogoView kind="neumatico" />;
export const TipoDanoLlantaView: React.FC = () => <TipoDanoCatalogoView kind="llanta" />;
export default TipoDanoNeumaticoView;
