import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css'; // Reutilizamos los mismos estilos que TipoTransaccionView

interface Existencia {
  id_existencia_26: number;
  id_alternador_26: number;
  id_ubicacion_26: number;
  cantidad_26: number;
  created_at: string;
  updated_at: string;
  cod_alternador_19?: string;
  marca_18?: string;
  ubicacion_descripcion?: string;
  estado_20?: string;
}

interface ApiResponse {
  success: boolean;
  data?: Existencia[] | Existencia;
  count?: number;
  message?: string;
  error?: string;
}


const ExistenciaView: React.FC = () => {
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados para búsqueda y ordenamiento (igual que TipoTransaccionView)
  const [filtro, setFiltro] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Existencia; direction: 'asc' | 'desc' } | null>(null);

  const API_URL = 'http://localhost:3001/api/existencias';

  useEffect(() => {
    fetchExistencias();
  }, []);

  const fetchExistencias = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setExistencias(data.data);
      } else {
        alert('Error al cargar las existencias');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Filtrado y Ordenamiento Combinada (igual que TipoTransaccionView)
  const processedExistencias = useMemo(() => {
    let data = [...existencias];

    // 1. Filtrar
    if (filtro) {
      const lowerFiltro = filtro.toLowerCase();
      data = data.filter(e =>
        e.cod_alternador_19?.toLowerCase().includes(lowerFiltro) ||
        e.marca_18?.toLowerCase().includes(lowerFiltro) ||
        e.ubicacion_descripcion?.toLowerCase().includes(lowerFiltro) ||
        e.cantidad_26.toString().includes(filtro) ||
        e.id_existencia_26.toString().includes(filtro)
      );
    }

    // 2. Ordenar
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return data;
  }, [existencias, filtro, sortConfig]);

  // Lógica de Ordenamiento (igual que TipoTransaccionView)
  const handleSort = (key: keyof Existencia) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Existencia) => {
    if (!sortConfig || sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getStockStatus = (cantidad: number) => {
    if (cantidad === 0) return { label: 'Sin Stock', class: 'stock-zero', icon: '🔴' };
    if (cantidad < 5) return { label: 'Bajo Stock', class: 'stock-low', icon: '🟡' };
    return { label: 'En Stock', class: 'stock-ok', icon: '🟢' };
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📊 Stock Actual - Existencias</h2>
        <button
          className="btn-primary"
          onClick={fetchExistencias}
          disabled={loading}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Buscador */}
      <div className="form-container" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar existencia..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('cod_alternador_19')} style={{ cursor: 'pointer' }}>
                Código {getSortIndicator('cod_alternador_19')}
              </th>
              <th onClick={() => handleSort('marca_18')} style={{ cursor: 'pointer' }}>
                Marca {getSortIndicator('marca_18')}
              </th>
              <th onClick={() => handleSort('ubicacion_descripcion')} style={{ cursor: 'pointer' }}>
                Ubicación {getSortIndicator('ubicacion_descripcion')}
              </th>
              <th onClick={() => handleSort('cantidad_26')} style={{ cursor: 'pointer' }}>
                Cantidad {getSortIndicator('cantidad_26')}
              </th>
              <th onClick={() => handleSort('cantidad_26')} style={{ cursor: 'pointer' }}>
                Estado Stock {getSortIndicator('cantidad_26')}
              </th>
              <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer' }}>
                Última Actualización {getSortIndicator('updated_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && existencias.length === 0 ? (
              <tr><td colSpan={6}>Cargando...</td></tr>
            ) : processedExistencias.length === 0 ? (
              <tr><td colSpan={6}>No hay existencias registradas</td></tr>
            ) : (
              processedExistencias.map((existencia) => {
                const stockStatus = getStockStatus(existencia.cantidad_26);
                return (
                  <tr key={existencia.id_existencia_26}>
                    <td><strong>{existencia.cod_alternador_19 || 'N/A'}</strong></td>
                    <td>{existencia.marca_18 || 'N/A'}</td>
                    <td>{existencia.ubicacion_descripcion || 'N/A'}</td>
                    <td><strong>{existencia.cantidad_26}</strong></td>
                    <td>
                      <span className={`status-badge ${stockStatus.class === 'stock-zero' ? 'inactive' : stockStatus.class === 'stock-low' ? 'inactive' : 'active'}`}>
                        {stockStatus.icon} {stockStatus.label}
                      </span>
                    </td>
                    <td>
                      {existencia.updated_at
                        ? new Date(existencia.updated_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExistenciaView;

