import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css'; // Reutilizamos los mismos estilos que AsignacionProductosAseoView
import { useToast } from '../context/ToastContext';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showConfirm } from '../utils/swal';

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
  const [productos, setProductos] = useState<ProductoAseo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [productoaseo, setProductoaseo] = useState<string>('');
  const [um, setUm] = useState<string>('');
  const [enuso, setEnuso] = useState<boolean>(true);
  const [valorpordefecto, setValorpordefecto] = useState<number>(0);
  const [orden, setOrden] = useState<number | null>(null);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [soloActivos, setSoloActivos] = useState<boolean>(true);
  const [soloInactivos, setSoloInactivos] = useState<boolean>(false);

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'orden_10', direction: 'asc' });

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/productos-aseo';

  useEffect(() => {
    fetchProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset page when search changes
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

  // Filter and sort data
  const filteredAndSortedProductos = useMemo(() => {
    let filtered = productos.filter(producto => {
      // Search filter
      const matchesSearch = !searchTerm || 
        producto.productoaseo_10.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.um_10.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filters
      let matchesStatus = true;
      if (soloActivos && soloInactivos) {
        matchesStatus = true; // Show all
      } else if (soloActivos) {
        matchesStatus = producto.enuso_10 === true;
      } else if (soloInactivos) {
        matchesStatus = producto.enuso_10 === false;
      } else {
        matchesStatus = true; // If neither is checked, show all
      }

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle null values for orden_10
      if (sortConfig.key === 'orden_10') {
        aValue = aValue === null ? 999999 : aValue;
        bValue = bValue === null ? 999999 : bValue;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [productos, searchTerm, soloActivos, soloInactivos, sortConfig]);

  // Pagination
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

  const getSortIcon = (key: keyof ProductoAseo) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoaseo.trim()) {
      showToast('El nombre del producto es requerido', 'error');
      return;
    }
    if (!um.trim()) {
      showToast('La unidad de medida es requerida', 'error');
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
        showToast(errorMessage, 'error');
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchProductos();
        resetForm();
        showToast('Producto creado exitosamente', 'success');
      } else {
        const errorMessage = data.error || data.message || 'Error al crear el producto';
        showToast(errorMessage, 'error');
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al crear el producto';
      showToast(errorMessage, 'error');
      setError(errorMessage);
      console.error('Error al crear producto:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoaseo.trim() || editingId === null) return;
    if (!um.trim()) {
      showToast('La unidad de medida es requerida', 'error');
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
        showToast(errorMessage, 'error');
        setError(errorMessage);
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchProductos();
        resetForm();
        showToast('Producto actualizado exitosamente', 'success');
      } else {
        const errorMessage = data.error || data.message || 'Error al actualizar el producto';
        showToast(errorMessage, 'error');
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión al actualizar el producto';
      showToast(errorMessage, 'error');
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
        showToast('Producto eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar el producto', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar el producto', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (producto: ProductoAseo) => {
    setEditingId(producto.idproductoaseo_10);
    setProductoaseo(producto.productoaseo_10 || '');
    setUm(producto.um_10 || '');
    setEnuso(producto.enuso_10 || true);
    setValorpordefecto(producto.valorpordefecto_10 || 0);
    setOrden(producto.orden_10);
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
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedProductos.map(p => ({
      ID: p.idproductoaseo_10,
      'Producto de Aseo': p.productoaseo_10,
      'Unidad de Medida': p.um_10,
      'En Uso': p.enuso_10 ? 'Sí' : 'No',
      'Valor Por Defecto': p.valorpordefecto_10,
      'Orden': p.orden_10 || ''
    }));
    exportToExcel(dataToExport, 'productos-aseo', 'Productos de Aseo');
    showToast('Datos exportados exitosamente', 'success');
  };

  const handleSalir = async () => {
    const confirmed = await showConfirm(
        'Confirmar salida',
        '¿Desea salir de la gestión de productos de aseo?'
    );
    if (confirmed) {
      window.location.hash = 'dashboard';
    }
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🧼 Gestión de Productos de Aseo</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={showCreateForm}>
            ✏️ Nuevo
          </button>
          <button 
            type="button"
            className="btn-success" 
            onClick={(e) => {
              e.preventDefault();
              if (editingId) {
                handleUpdate(e as any);
              } else {
                handleCreate(e as any);
              }
            }}
            disabled={!productoaseo.trim() || !um.trim()}
          >
            💾 Guardar
          </button>
          <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
            📊 Exportar
          </button>
          <button className="btn-secondary" onClick={handleSalir}>
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="form-container" style={{ background: '#FEE2E2', color: '#991B1B', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Left Panel - Datos del Producto */}
        <div className="form-container">
          <h3>Datos del Producto de Aseo</h3>
          <form id="producto-form" onSubmit={(e) => { e.preventDefault(); }}>
            <div className="form-group">
              <label htmlFor="productoaseo">Producto de Aseo:</label>
              <input
                type="text"
                id="productoaseo"
                value={productoaseo}
                onChange={(e) => setProductoaseo(e.target.value)}
                placeholder="Ej: CLORO, CERA ACRILICA..."
                required
                autoFocus
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="um">Unidad de Medida:</label>
              <input
                type="text"
                id="um"
                value={um}
                onChange={(e) => setUm(e.target.value)}
                placeholder="Ej: LTS, UND, KG..."
                required
                maxLength={50}
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  id="enuso"
                  checked={enuso}
                  onChange={(e) => setEnuso(e.target.checked)}
                />
                <span>En Uso</span>
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="valorpordefecto">Valor Por Defecto:</label>
              <input
                type="number"
                id="valorpordefecto"
                value={valorpordefecto}
                onChange={(e) => setValorpordefecto(parseInt(e.target.value) || 0)}
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="orden">Orden:</label>
              <input
                type="number"
                id="orden"
                value={orden || ''}
                onChange={(e) => setOrden(e.target.value ? parseInt(e.target.value) : null)}
                min="0"
                placeholder="Opcional"
              />
            </div>
            {editingId && (
              <div className="form-actions">
                <button 
                  type="button"
                  className="btn-primary" 
                  style={{ background: '#DC2626' }}
                  onClick={async () => {
                    await handleDelete(editingId);
                    resetForm();
                  }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Panel - Búsqueda y Filtros */}
        <div className="form-container">
          <h3>Búsqueda y Filtros</h3>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={soloActivos}
                onChange={(e) => {
                  setSoloActivos(e.target.checked);
                  if (e.target.checked && soloInactivos) {
                    setSoloInactivos(false);
                  }
                }}
              />
              <span>Solo Activos</span>
            </label>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={soloInactivos}
                onChange={(e) => {
                  setSoloInactivos(e.target.checked);
                  if (e.target.checked && soloActivos) {
                    setSoloActivos(false);
                  }
                }}
              />
              <span>Solo Inactivos</span>
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="buscar-producto">Buscar Producto:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                id="buscar-producto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o unidad..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSearchTerm('')}
                title="Limpiar búsqueda"
              >
                🔍
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ Cargando productos...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('idproductoaseo_10')} 
                    className={`sortable ${sortConfig.key === 'idproductoaseo_10' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ID
                  </th>
                  <th 
                    onClick={() => handleSort('productoaseo_10')} 
                    className={`sortable ${sortConfig.key === 'productoaseo_10' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    PRODUCTO DE ASEO
                  </th>
                  <th 
                    onClick={() => handleSort('um_10')} 
                    className={`sortable ${sortConfig.key === 'um_10' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    UNIDAD DE MEDIDA
                  </th>
                  <th 
                    onClick={() => handleSort('enuso_10')} 
                    className={`sortable ${sortConfig.key === 'enuso_10' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    EN USO
                  </th>
                  <th 
                    onClick={() => handleSort('valorpordefecto_10')} 
                    className={`sortable ${sortConfig.key === 'valorpordefecto_10' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    VALOR POR DEFECTO
                  </th>
                  <th 
                    onClick={() => handleSort('orden_10')} 
                    className={`sortable ${sortConfig.key === 'orden_10' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                  >
                    ORDEN
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentProductos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                      {searchTerm || soloActivos || soloInactivos
                        ? `📋 No se encontraron productos con los filtros aplicados`
                        : '📋 No hay productos registrados'
                      }
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
                      <td>{producto.orden_10 || '-'}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(producto)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(producto.idproductoaseo_10)}
                          title="Eliminar"
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

          {filteredAndSortedProductos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedProductos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProductoAseoView;

