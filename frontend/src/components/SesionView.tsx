import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface Sesion {
    id_sesion_03: string;
    id_usuario_03: number;
    token_sesion_03: string;
    fecha_creacion_03: string;
    fecha_expiracion_03: string;
    ip_address_03: string | null;
    user_agent_03: string | null;
    username?: string;
    nombre_completo_00?: string;
    email?: string;
}

const SesionView: React.FC = () => {
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos'); // 'todos', 'activas', 'expiradas'
    const [sortConfig, setSortConfig] = useState<{ key: keyof Sesion; direction: 'asc' | 'desc' } | null>(null);

    const API_URL = 'http://localhost:3001/api/sesiones-view';

    useEffect(() => {
        fetchSesiones();
    }, []);

    useEffect(() => {
        fetchSesiones();
    }, [filtroEstado]);

    const fetchSesiones = async () => {
        setLoading(true);
        try {
            let url = API_URL;
            if (filtroEstado === 'activas') {
                url = `${API_URL}/activas`;
            } else if (filtroEstado === 'expiradas') {
                url = `${API_URL}/expiradas`;
            }

            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setSesiones(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar sesiones');
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof Sesion) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof Sesion) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Verificar si una sesión está activa
    const isSesionActiva = (fechaExpiracion: string): boolean => {
        return new Date(fechaExpiracion) > new Date();
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedSesiones = React.useMemo(() => {
        let data = [...sesiones];

        // 1. Filtrar por texto
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(s =>
                (s.username && s.username.toLowerCase().includes(lowerFiltro)) ||
                (s.nombre_completo_00 && s.nombre_completo_00.toLowerCase().includes(lowerFiltro)) ||
                (s.email && s.email.toLowerCase().includes(lowerFiltro)) ||
                (s.ip_address_03 && s.ip_address_03.toLowerCase().includes(lowerFiltro)) ||
                (s.user_agent_03 && s.user_agent_03.toLowerCase().includes(lowerFiltro)) ||
                (s.id_sesion_03 && s.id_sesion_03.toLowerCase().includes(lowerFiltro)) ||
                (s.token_sesion_03 && s.token_sesion_03.toLowerCase().includes(lowerFiltro)) ||
                s.id_usuario_03.toString().includes(lowerFiltro)
            );
        }

        // 2. Filtrar por estado (si no se está usando el filtro del servidor)
        if (filtroEstado === 'activas') {
            data = data.filter(s => isSesionActiva(s.fecha_expiracion_03));
        } else if (filtroEstado === 'expiradas') {
            data = data.filter(s => !isSesionActiva(s.fecha_expiracion_03));
        }

        // 3. Ordenar
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
    }, [sesiones, filtro, filtroEstado, sortConfig]);

    // Estadísticas
    const estadisticas = React.useMemo(() => {
        const total = sesiones.length;
        const activas = sesiones.filter(s => isSesionActiva(s.fecha_expiracion_03)).length;
        const expiradas = sesiones.filter(s => !isSesionActiva(s.fecha_expiracion_03)).length;
        return { total, activas, expiradas };
    }, [sesiones]);

    // Función para enmascarar token
    const maskToken = (token: string) => {
        if (!token) return 'N/A';
        if (token.length > 20) {
            return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
        }
        return '***';
    };

    // Función para parsear User Agent
    const parseUserAgent = (userAgent: string | null): string => {
        if (!userAgent) return 'N/A';
        // Extraer información básica del user agent
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        return userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : '');
    };

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔑 Gestión de Sesiones</h2>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Visualización de sesiones activas y expiradas del sistema
                </div>
            </div>

            {/* Estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div className="form-container" style={{ backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2E5A88' }}>{estadisticas.total}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Sesiones</div>
                </div>
                <div className="form-container" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>{estadisticas.activas}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Activas</div>
                </div>
                <div className="form-container" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>{estadisticas.expiradas}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Expiradas</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="form-container" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar por usuario, email, IP, token o ID..."
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                    />
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                    >
                        <option value="todos">Todas</option>
                        <option value="activas">Solo Activas</option>
                        <option value="expiradas">Solo Expiradas</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th 
                                onClick={() => handleSort('id_sesion_03')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'id_sesion_03' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID Sesión
                            </th>
                            <th 
                                onClick={() => handleSort('username')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Usuario
                            </th>
                            <th>Token (Hash)</th>
                            <th 
                                onClick={() => handleSort('fecha_creacion_03')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'fecha_creacion_03' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Fecha Creación
                            </th>
                            <th 
                                onClick={() => handleSort('fecha_expiracion_03')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'fecha_expiracion_03' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Fecha Expiración
                            </th>
                            <th 
                                onClick={() => handleSort('ip_address_03')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'ip_address_03' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                IP
                            </th>
                            <th>User Agent</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && sesiones.length === 0 ? (
                            <tr><td colSpan={8}>Cargando...</td></tr>
                        ) : processedSesiones.length === 0 ? (
                            <tr><td colSpan={8}>No hay sesiones registradas</td></tr>
                        ) : (
                            processedSesiones.map((sesion) => {
                                const activa = isSesionActiva(sesion.fecha_expiracion_03);
                                return (
                                    <tr key={sesion.id_sesion_03}>
                                        <td>
                                            <code style={{ 
                                                fontSize: '11px', 
                                                backgroundColor: '#f5f5f5', 
                                                padding: '4px 8px', 
                                                borderRadius: '3px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {sesion.id_sesion_03.substring(0, 20)}...
                                            </code>
                                        </td>
                                        <td>
                                            <strong>{sesion.username || `ID: ${sesion.id_usuario_03}`}</strong>
                                            {sesion.nombre_completo_00 && (
                                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                    {sesion.nombre_completo_00}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <code style={{ 
                                                fontSize: '10px', 
                                                backgroundColor: '#f5f5f5', 
                                                padding: '4px 8px', 
                                                borderRadius: '3px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {maskToken(sesion.token_sesion_03)}
                                            </code>
                                        </td>
                                        <td>
                                            {sesion.fecha_creacion_03
                                                ? new Date(sesion.fecha_creacion_03).toLocaleString('es-CL', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'N/A'}
                                        </td>
                                        <td>
                                            {sesion.fecha_expiracion_03
                                                ? new Date(sesion.fecha_expiracion_03).toLocaleString('es-CL', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'N/A'}
                                        </td>
                                        <td>
                                            <code style={{ 
                                                fontSize: '12px', 
                                                backgroundColor: '#f5f5f5', 
                                                padding: '4px 8px', 
                                                borderRadius: '3px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {sesion.ip_address_03 || <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>}
                                            </code>
                                        </td>
                                        <td style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {parseUserAgent(sesion.user_agent_03)}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${activa ? 'active' : 'inactive'}`}>
                                                {activa ? '✅ Activa' : '⏰ Expirada'}
                                            </span>
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

export default SesionView;








