import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface HistorialContrasena {
    id_historial_01: number;
    id_usuario_01: number;
    hashed_password_01: string;
    fecha_cambio_01: string;
    username_00?: string;
    nombre_completo?: string;
    email_00?: string;
}

const HistorialContrasenaView: React.FC = () => {
    const [historial, setHistorial] = useState<HistorialContrasena[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof HistorialContrasena; direction: 'asc' | 'desc' } | null>(null);

    const API_URL = 'http://localhost:3001/api/historial-contrasenas';

    useEffect(() => {
        fetchHistorial();
    }, []);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setHistorial(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar historial de contraseñas');
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof HistorialContrasena) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof HistorialContrasena) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedHistorial = React.useMemo(() => {
        let data = [...historial];

        // 1. Filtrar
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(h =>
                (h.username_00 && h.username_00.toLowerCase().includes(lowerFiltro)) ||
                (h.nombre_completo && h.nombre_completo.toLowerCase().includes(lowerFiltro)) ||
                (h.email_00 && h.email_00.toLowerCase().includes(lowerFiltro)) ||
                h.id_usuario_01.toString().includes(lowerFiltro) ||
                h.id_historial_01.toString().includes(lowerFiltro)
            );
        }

        // 2. Ordenar
        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                
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
    }, [historial, filtro, sortConfig]);

    // Función para ocultar/mostrar contraseña hasheada
    const maskPassword = (hash: string) => {
        if (!hash) return 'N/A';
        // Mostrar solo los primeros y últimos caracteres
        if (hash.length > 20) {
            return `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}`;
        }
        return '***';
    };

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔒 Historial de Contraseñas</h2>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Registro de cambios de contraseña de usuarios
                </div>
            </div>

            {/* Información */}
            <div className="form-container" style={{ marginBottom: '20px', backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>ℹ️</span>
                    <div>
                        <strong>Información:</strong> Este historial muestra todos los cambios de contraseña realizados por los usuarios. 
                        Las contraseñas están hasheadas por seguridad y no se pueden recuperar.
                    </div>
                </div>
            </div>

            {/* Buscador */}
            <div className="form-container" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por usuario, email, nombre o ID..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th 
                                onClick={() => handleSort('id_historial_01')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'id_historial_01' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID
                            </th>
                            <th 
                                onClick={() => handleSort('username_00')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'username_00' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Usuario
                            </th>
                            <th 
                                onClick={() => handleSort('nombre_completo')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_completo' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Nombre Completo
                            </th>
                            <th 
                                onClick={() => handleSort('email_00')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'email_00' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Email
                            </th>
                            <th>Contraseña (Hash)</th>
                            <th 
                                onClick={() => handleSort('fecha_cambio_01')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'fecha_cambio_01' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Fecha de Cambio
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && historial.length === 0 ? (
                            <tr><td colSpan={6}>Cargando...</td></tr>
                        ) : processedHistorial.length === 0 ? (
                            <tr><td colSpan={6}>No hay registros en el historial de contraseñas</td></tr>
                        ) : (
                            processedHistorial.map((registro) => (
                                <tr key={registro.id_historial_01}>
                                    <td>{registro.id_historial_01}</td>
                                    <td><strong>{registro.username_00 || `ID: ${registro.id_usuario_01}`}</strong></td>
                                    <td>{registro.nombre_completo || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin nombre</span>}</td>
                                    <td>{registro.email_00 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin email</span>}</td>
                                    <td>
                                        <code style={{ 
                                            fontSize: '11px', 
                                            backgroundColor: '#f5f5f5', 
                                            padding: '4px 8px', 
                                            borderRadius: '3px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {maskPassword(registro.hashed_password_01)}
                                        </code>
                                    </td>
                                    <td>
                                        {registro.fecha_cambio_01
                                            ? new Date(registro.fecha_cambio_01).toLocaleString('es-CL', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })
                                            : 'N/A'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistorialContrasenaView;

