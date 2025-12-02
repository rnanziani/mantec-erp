import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface Existencia {
    id_alternador_26: number;
    id_bodega_26: number;
    cantidad_26: number;
    cod_alternador_19?: string;
    marca_18?: string;
    bodega_descripcion?: string;
}

const ExistenciaView: React.FC = () => {
    const [existencias, setExistencias] = useState<Existencia[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');

    const API_URL = 'http://localhost:3001/api/existencias';

    useEffect(() => {
        fetchExistencias();
    }, []);

    const fetchExistencias = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setExistencias(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar existencias');
        } finally {
            setLoading(false);
        }
    };

    const fetchStockBajo = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/bajo-stock?umbral=2`);
            const data = await response.json();
            if (data.success) {
                setExistencias(data.data);
                alert(data.message || 'Stock bajo cargado');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar stock bajo');
        } finally {
            setLoading(false);
        }
    };

    const getStockClass = (cantidad: number) => {
        if (cantidad === 0) return 'stock-zero';
        if (cantidad <= 2) return 'stock-bajo';
        if (cantidad <= 5) return 'stock-medio';
        return 'stock-alto';
    };

    const existenciasFiltradas = existencias.filter(e =>
        e.cod_alternador_19?.toLowerCase().includes(filtro.toLowerCase()) ||
        e.marca_18?.toLowerCase().includes(filtro.toLowerCase()) ||
        e.bodega_descripcion?.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>📊 Stock Actual (Existencias)</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={fetchStockBajo}>
                        ⚠️ Ver Stock Bajo
                    </button>
                    <button className="btn-primary" onClick={fetchExistencias}>
                        🔄 Actualizar
                    </button>
                </div>
            </div>

            <div className="form-container">
                <input
                    type="text"
                    placeholder="🔍 Buscar por código, marca o bodega..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Código Alternador</th>
                            <th>Marca</th>
                            <th>Bodega</th>
                            <th>Cantidad</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5}>Cargando...</td></tr>
                        ) : existenciasFiltradas.length === 0 ? (
                            <tr><td colSpan={5}>No hay existencias registradas</td></tr>
                        ) : (
                            existenciasFiltradas.map((ex, idx) => (
                                <tr key={idx}>
                                    <td><strong>{ex.cod_alternador_19}</strong></td>
                                    <td>{ex.marca_18}</td>
                                    <td>{ex.bodega_descripcion}</td>
                                    <td>
                                        <span className={`stock-badge ${getStockClass(ex.cantidad_26)}`}>
                                            {ex.cantidad_26}
                                        </span>
                                    </td>
                                    <td>
                                        {ex.cantidad_26 === 0 && <span style={{ color: '#dc3545' }}>⚠️ Sin Stock</span>}
                                        {ex.cantidad_26 > 0 && ex.cantidad_26 <= 2 && <span style={{ color: '#ffc107' }}>⚠️ Stock Bajo</span>}
                                        {ex.cantidad_26 > 2 && ex.cantidad_26 <= 5 && <span style={{ color: '#17a2b8' }}>✓ Stock Medio</span>}
                                        {ex.cantidad_26 > 5 && <span style={{ color: '#28a745' }}>✓ Stock Normal</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
        .stock-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: bold;
          font-size: 14px;
        }
        .stock-zero {
          background: #f8d7da;
          color: #721c24;
        }
        .stock-bajo {
          background: #fff3cd;
          color: #856404;
        }
        .stock-medio {
          background: #d1ecf1;
          color: #0c5460;
        }
        .stock-alto {
          background: #d4edda;
          color: #155724;
        }
      `}</style>
        </div>
    );
};

export default ExistenciaView;
