import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';

interface ProductoAseo {
  idproductoaseo_10: number;
  productoaseo_10: string;
  um_10: string;
  enuso_10: boolean;
  valorpordefecto_10: number;
  orden_10: number | null;
}

interface ApiResponse {
  success: boolean;
  data?: ProductoAseo[] | ProductoAseo;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof ProductoAseo;
  direction: 'asc' | 'desc';
};

const ProductoAseoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [productos, setProductos] = useState<ProductoAseo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [productoaseo, setProductoaseo] = useState<string>('');
  const [um, setUm] = useState<string>('');
  const [enuso, setEnuso] = useState<boolean>(true);
  const [valorpordefecto, setValorpordefecto] = useState<number>(0);
  const [orden, setOrden] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [soloActivos, setSoloActivos] = useState<boolean>(true);
  const [soloInactivos, setSoloInactivos] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'orden_10', direction: 'asc' });

  const API_URL = 'http://localhost:3001/api/productos-aseo';

  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, soloActivos, soloInactivos]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setProductos(data.data);
      } else {
        setError(data.error || 'Error al cargar los productos');
        setProductos([]);
      }
    } catch (err) {
      setError('Error de conexión con el servidor. Verifique que el backend esté ejecutándose.');
      console.error('Error al cargar productos:', err);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProductos = useMemo(() => {
    let filtered = productos.filter(producto => {
      const matchesSearch = !searchTerm ||
        producto.productoaseo_10.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.um_10.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (soloActivos && soloInactivos) {
        matchesStatus = true;
      } else if (soloActivos) {
        matchesStatus = producto.enuso_10 === true;
      } else if (soloInactivos) {
        matchesStatus = producto.enuso_10 === false;
      } else {
        matchesStatus = true;
      }

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: number | string | boolean | null = a[sortConfig.key];
      let bValue: number | string | boolean | null = b[sortConfig.key];

      if (sortConfig.key === 'orden_10') {
        aValue = aValue === null ? 999999 : aValue;
        bValue = bValue === null ? 999999 : bValue;
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [productos, searchTerm, soloActivos, soloInactivos, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProductos = filteredAndSortedProductos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedProductos.length / itemsPerPage);

  const handleSort = (key: keyof ProductoAseo) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof ProductoAseo) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoaseo.trim()) {
      await showError('Campo requerido', 'El nombre del producto es requerido');
      return;
    }
    if (!um.trim()) {
      await showError('Campo requerido', 'La unidad de medida es requerida');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoaseo_10: productoaseo.trim(),
          um_10: um.trim(),
          enuso_10: enuso,
          valorpordefecto_10: valorpordefecto,
          orden_10: orden
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Error HTTP: ${response.status}`;
        await showError('Error al crear', errorMessage);
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchProductos();
        resetForm();
        await showSuccess('¡Producto creado!', 'El producto ha sido registrado correctamente.');
      } else {
        const errorMessage = data.error || data.message || 'Error al crear el producto';
        await showError('Error al crear', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al crear el producto';
      await showError('Error', errorMessage);
      setError(errorMessage);
      console.error('Error al crear producto:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoaseo.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre del producto es requerido');
      return;
    }
    if (!um.trim()) {
      await showError('Campo requerido', 'La unidad de medida es requerida');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoaseo_10: productoaseo.trim(),
          um_10: um.trim(),
          enuso_10: enuso,
          valorpordefecto_10: valorpordefecto,
          orden_10: orden
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Error HTTP: ${response.status}`;
        await showError('Error al actualizar', errorMessage);
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchProductos();
        resetForm();
        await showSuccess('¡Producto actualizado!', 'El producto ha sido actualizado correctamente.');
      } else {
        const errorMessage = data.error || data.message || 'Error al actualizar el producto';
        await showError('Error al actualizar', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al actualizar el producto';
      await showError('Error', errorMessage);
      setError(errorMessage);
      console.error('Error al actualizar producto:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este producto de aseo');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchProductos();
        await showSuccess('¡Producto eliminado!', 'El producto ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el producto');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el producto');
      console.error(err);
    }
  };

  const startEdit = (producto: ProductoAseo) => {
    setEditingId(producto.idproductoaseo_10);
    setProductoaseo(producto.productoaseo_10 || '');
    setUm(producto.um_10 || '');
    setEnuso(producto.enuso_10 ?? true);
    setValorpordefecto(producto.valorpordefecto_10 ?? 0);
    setOrden(producto.orden_10);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setProductoaseo('');
    setUm('');
    setEnuso(true);
    setValorpordefecto(0);
    setOrden(null);
    setEditingId(null);
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedProductos.map(p => ({
      ID: p.idproductoaseo_10,
      'Producto de Aseo': p.productoaseo_10,
      'Unidad de Medida': p.um_10,
      'En Uso': p.enuso_10 ? 'Sí' : 'No',
      'Valor Por Defecto': p.valorpordefecto_10,
      'Orden': p.orden_10 ?? ''
    }));
    exportToExcel(dataToExport, 'productos-aseo', 'Productos de Aseo');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🧼 Gestión de Productos de Aseo</h2>
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
          <h3>{editingId ? '✏️ Editar Producto de Aseo' : '➕ Nuevo Producto de Aseo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="productoaseo">Producto de Aseo: *</label>
                <input
                  type="text"
                  id="productoaseo"
                  className="form-input"
                  value={productoaseo}
                  onChange={(e) => setProductoaseo(e.target.value.toUpperCase())}
                  placeholder="Ej: CLORO, CERA ACRILICA..."
                  required
                  autoFocus
                  maxLength={100}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="um">Unidad de Medida: *</label>
                <input
                  type="text"
                  id="um"
                  className="form-input"
                  value={um}
                  onChange={(e) => setUm(e.target.value.toUpperCase())}
                  placeholder="Ej: LTS, UND, KG..."
                  required
                  maxLength={50}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="valorpordefecto">Valor Por Defecto:</label>
                <input
                  type="number"
                  id="valorpordefecto"
                  className="form-input"
                  value={valorpordefecto}
                  onChange={(e) => setValorpordefecto(parseInt(e.target.value) || 0)}
                  min={0}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="orden">Orden:</label>
                <input
                  type="number"
                  id="orden"
                  className="form-input"
                  value={orden ?? ''}
                  onChange={(e) => setOrden(e.target.value ? parseInt(e.target.value) : null)}
                  min={0}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="enuso"
                    checked={enuso}
                    onChange={(e) => setEnuso(e.target.checked)}
                    aria-label="Producto en uso"
                  />
                  En Uso
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                ❌ Cancelar
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: '#dc3545' }}
                  onClick={async () => {
                    await handleDelete(editingId);
                    resetForm();
                  }}
                >
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentProductos.length} de {filteredAndSortedProductos.length} registros
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="checkbox-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={soloActivos}
                onChange={(e) => {
                  setSoloActivos(e.target.checked);
                  if (e.target.checked && soloInactivos) setSoloInactivos(false);
                  setCurrentPage(1);
                }}
                aria-label="Solo activos"
              />
              Solo Activos
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={soloInactivos}
                onChange={(e) => {
                  setSoloInactivos(e.target.checked);
                  if (e.target.checked && soloActivos) setSoloActivos(false);
                  setCurrentPage(1);
                }}
                aria-label="Solo inactivos"
              />
              Solo Inactivos
            </label>
          </div>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o unidad..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ flex: 1, minWidth: '200px', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
            aria-label="Buscar producto"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('idproductoaseo_10')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('idproductoaseo_10')}
              </th>
              <th onClick={() => handleSort('productoaseo_10')} className="sortable" style={{ cursor: 'pointer' }}>
                PRODUCTO DE ASEO {getSortIndicator('productoaseo_10')}
              </th>
              <th onClick={() => handleSort('um_10')} className="sortable" style={{ cursor: 'pointer' }}>
                UNIDAD DE MEDIDA {getSortIndicator('um_10')}
              </th>
              <th onClick={() => handleSort('enuso_10')} className="sortable" style={{ cursor: 'pointer' }}>
                EN USO {getSortIndicator('enuso_10')}
              </th>
              <th onClick={() => handleSort('valorpordefecto_10')} className="sortable" style={{ cursor: 'pointer' }}>
                VALOR POR DEFECTO {getSortIndicator('valorpordefecto_10')}
              </th>
              <th onClick={() => handleSort('orden_10')} className="sortable" style={{ cursor: 'pointer' }}>
                ORDEN {getSortIndicator('orden_10')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && productos.length === 0 ? (
              <tr><td colSpan={7}>Cargando...</td></tr>
            ) : currentProductos.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  {searchTerm || soloActivos || soloInactivos
                    ? '📋 No se encontraron productos con los filtros aplicados'
                    : '📋 No hay productos registrados'}
                </td>
              </tr>
            ) : (
              currentProductos.map((producto) => (
                <tr key={producto.idproductoaseo_10}>
                  <td>{producto.idproductoaseo_10}</td>
                  <td>{producto.productoaseo_10}</td>
                  <td>{producto.um_10}</td>
                  <td>
                    <span className={`status-badge ${producto.enuso_10 ? 'active' : 'inactive'}`}>
                      {producto.enuso_10 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{producto.valorpordefecto_10}</td>
                  <td>{producto.orden_10 ?? '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(producto)} title="Editar" aria-label="Editar producto">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(producto.idproductoaseo_10)} title="Eliminar" aria-label="Eliminar producto">
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
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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

export default ProductoAseoView;
