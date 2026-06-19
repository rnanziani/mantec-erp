import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './InsumoView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface Insumo {
  id_insumo_43: number;
  descripcion_43: string;
  precio_insumo_43: number | string;
  id_categoria_43: number;
  categoria_42?: string;
}

interface Categoria {
  id_categoria_42: number;
  categoria_42: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof Insumo;

const InsumoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'id_insumo_43',
    direction: 'asc'
  });

  const API_URL = apiUrl('/insumos');
  const CATEG_URL = apiUrl('/categorias');

  const formatAmount = (value: number | string) =>
    new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));

  useEffect(() => {
    fetchCategorias();
    fetchInsumos();
  }, []);

  const fetchCategorias = async () => {
    try {
      const res = await fetch(CATEG_URL);
      const data: ApiResponse<Categoria[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategorias(
          [...data.data].sort((a, b) =>
            a.categoria_42.localeCompare(b.categoria_42, 'es', { sensitivity: 'base' })
          )
        );
      }
    } catch {}
  };

  const fetchInsumos = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<Insumo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInsumos(data.data);
      } else {
        setError('Error al cargar insumos');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const st = searchTerm.toLowerCase();
    const list = insumos.filter(i => {
      const cat = i.categoria_42 ? i.categoria_42.toLowerCase() : '';
      const amountStr = Number(i.precio_insumo_43).toFixed(2);
      const desc = i.descripcion_43 ? i.descripcion_43.toLowerCase() : '';
      return cat.includes(st) || amountStr.includes(st) || desc.includes(st);
    });
    list.sort((a, b) => {
      const aRaw = a[sortConfig.key];
      const bRaw = b[sortConfig.key];
      const aValue = sortConfig.key === 'precio_insumo_43' ? Number(aRaw) : (aRaw ?? '');
      const bValue = sortConfig.key === 'precio_insumo_43' ? Number(bRaw) : (bRaw ?? '');
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [insumos, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const resetForm = () => {
    setAmount('');
    setCategoriaId('');
    setDescripcion('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    const cat = parseInt(categoriaId, 10);
    if (isNaN(num) || !isFinite(num)) {
      await showError('Campo requerido', 'El precio debe ser numérico');
      return;
    }
    if (!cat) {
      await showError('Campo requerido', 'Debe seleccionar una categoría');
      return;
    }
    if (!descripcion.trim()) {
      await showError('Campo requerido', 'La descripción es requerida');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion_43: descripcion.trim().toUpperCase(), precio_insumo_43: num, id_categoria_43: cat })
      });
      const data: ApiResponse<Insumo> = await res.json();
      if (data.success) {
        await fetchInsumos();
        resetForm();
        await showSuccess('¡Insumo creado!', 'El insumo ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear insumo');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear insumo');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    const num = parseFloat(amount);
    const cat = parseInt(categoriaId, 10);
    if (isNaN(num) || !isFinite(num)) {
      await showError('Campo requerido', 'El precio debe ser numérico');
      return;
    }
    if (!cat) {
      await showError('Campo requerido', 'Debe seleccionar una categoría');
      return;
    }
    if (!descripcion.trim()) {
      await showError('Campo requerido', 'La descripción es requerida');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion_43: descripcion.trim().toUpperCase(), precio_insumo_43: num, id_categoria_43: cat })
      });
      const data: ApiResponse<Insumo> = await res.json();
      if (data.success) {
        await fetchInsumos();
        resetForm();
        await showSuccess('¡Insumo actualizado!', 'El insumo ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar insumo');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar insumo');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este insumo');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchInsumos();
        await showSuccess('¡Insumo eliminado!', 'El insumo ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar insumo');
      }
    } catch {
      await showError('Error', 'Error al eliminar insumo');
    }
  };

  const startEdit = (ins: Insumo) => {
    setEditingId(ins.id_insumo_43);
    setAmount(Number(ins.precio_insumo_43).toFixed(2));
    setCategoriaId(String(ins.id_categoria_43));
    setDescripcion(ins.descripcion_43 || '');
    setShowForm(true);
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map(i => ({
      ID: i.id_insumo_43,
      Descripcion: i.descripcion_43,
      Precio: i.precio_insumo_43,
      Categoria: i.categoria_42 || ''
    }));
    exportToExcel(dataToExport, 'insumos', 'Insumos');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🧾 Gestión de Insumos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={showCreateForm}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
            type="button"
          >
            💾 Guardar
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📊 Exportar
          </button>
          <button className="btn-secondary" onClick={cancelForm}>
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Editar Insumo' : '➕ Nuevo Insumo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="descripcion">Descripción: *</label>
                <input
                  type="text"
                  id="descripcion"
                  className="form-input"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                  placeholder="Ej: MANGUERA REFRIGERACION..."
                  style={{ textTransform: 'uppercase' }}
                  maxLength={255}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="monto">Precio: *</label>
                <input
                  type="number"
                  id="monto"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min={0}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="categoria">Categoría: *</label>
                <select
                  id="categoria"
                  className="form-input"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  required
                  aria-label="Seleccionar categoría"
                >
                  <option value="">Seleccione...</option>
                  {categorias.map(c => (
                    <option key={c.id_categoria_42} value={String(c.id_categoria_42)}>
                      {c.categoria_42}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentItems.length} de {filteredAndSorted.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por categoría o precio..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value.toUpperCase());
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase' }}
          aria-label="Buscar insumo"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_insumo_43')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_insumo_43')}
              </th>
              <th onClick={() => handleSort('descripcion_43')} className="sortable" style={{ cursor: 'pointer' }}>
                DESCRIPCIÓN {getSortIndicator('descripcion_43')}
              </th>
              <th onClick={() => handleSort('precio_insumo_43')} className="sortable" style={{ cursor: 'pointer' }}>
                PRECIO {getSortIndicator('precio_insumo_43')}
              </th>
              <th>CATEGORÍA</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && insumos.length === 0 ? (
              <tr><td colSpan={5}>Cargando...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron insumos con "${searchTerm}"`
                    : '📋 No hay insumos registrados'}
                </td>
              </tr>
            ) : (
              currentItems.map((ins) => (
                <tr key={ins.id_insumo_43}>
                  <td>{ins.id_insumo_43}</td>
                  <td className="insumo-desc">{ins.descripcion_43}</td>
                  <td className="insumo-price">${formatAmount(ins.precio_insumo_43)}</td>
                  <td className="insumo-cat">{ins.categoria_42 || ''}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(ins)} title="Editar" aria-label="Editar insumo">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(ins.id_insumo_43)} title="Eliminar" aria-label="Eliminar insumo">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{ padding: '8px 15px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((numPagina) => (
              <button
                key={numPagina}
                onClick={() => setCurrentPage(numPagina)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: currentPage === numPagina ? '#007bff' : 'white',
                  color: currentPage === numPagina ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontWeight: currentPage === numPagina ? 'bold' : 'normal'
                }}
                aria-label={`Ir a página ${numPagina}`}
                aria-current={currentPage === numPagina ? 'page' : undefined}
              >
                {numPagina}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
            style={{ padding: '8px 15px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
          <div style={{ marginLeft: '15px', color: '#6c757d' }}>
            Página {currentPage} de {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsumoView;
