import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface IntentoLogin {
    id_intento_02: number;
    id_usuario_02: number | null;
    attempted_email: string;
    ip_address_02: string | null;
    exitoso_02: boolean;
    fecha_intento_02: string;
    username?: string;
    nombre_completo_00?: string;
    email?: string;
}

const IntentoLoginView: React.FC = () => {
    const [intentos, setIntentos] = useState<IntentoLogin[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('');
    const [filtroExitoso, setFiltroExitoso] = useState<string>('todos'); // 'todos', 'exitosos', 'fallidos'
    const [sortConfig, setSortConfig] = useState<{ key: keyof IntentoLogin; direction: 'asc' | 'desc' } | null>(null);

    const API_URL = 'http://localhost:3001/api/intentos-login';

    useEffect(() => {
        fetchIntentos();
    }, []);

    const fetchIntentos = async () => {
        setLoading(true);
        try {
            const url = filtroExitoso === 'fallidos' ? `${API_URL}/fallidos` : API_URL;
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setIntentos(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar intentos de login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntentos();
    }, [filtroExitoso]);

    // Lógica de Ordenamiento
    const handleSort = (key: keyof IntentoLogin) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof IntentoLogin) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedIntentos = React.useMemo(() => {
        let data = [...intentos];

        // 1. Filtrar por texto
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(i =>
                (i.attempted_email && i.attempted_email.toLowerCase().includes(lowerFiltro)) ||
                (i.username && i.username.toLowerCase().includes(lowerFiltro)) ||
                (i.nombre_completo_00 && i.nombre_completo_00.toLowerCase().includes(lowerFiltro)) ||
                (i.email && i.email.toLowerCase().includes(lowerFiltro)) ||
                (i.ip_address_02 && i.ip_address_02.toLowerCase().includes(lowerFiltro)) ||
                (i.id_usuario_02 && i.id_usuario_02.toString().includes(lowerFiltro)) ||
                i.id_intento_02.toString().includes(lowerFiltro)
            );
        }

        // 2. Filtrar por éxito (si no se está usando el filtro del servidor)
        if (filtroExitoso === 'exitosos') {
            data = data.filter(i => i.exitoso_02 === true);
        } else if (filtroExitoso === 'fallidos') {
            data = data.filter(i => i.exitoso_02 === false);
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
    }, [intentos, filtro, filtroExitoso, sortConfig]);

    // Estadísticas
    const estadisticas = React.useMemo(() => {
        const total = intentos.length;
        const exitosos = intentos.filter(i => i.exitoso_02).length;
        const fallidos = intentos.filter(i => !i.exitoso_02).length;
        return { total, exitosos, fallidos };
    }, [intentos]);

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔐 Historial de Intentos de Login</h2>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Registro de auditoría de accesos al sistema
                </div>
            </div>

            {/* Estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div className="form-container" style={{ backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2E5A88' }}>{estadisticas.total}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Intentos</div>
                </div>
                <div className="form-container" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>{estadisticas.exitosos}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Exitosos</div>
                </div>
                <div className="form-container" style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>{estadisticas.fallidos}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Fallidos</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="form-container" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar por email, usuario, IP o ID..."
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                    />
                    <select
                        value={filtroExitoso}
                        onChange={(e) => setFiltroExitoso(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                    >
                        <option value="todos">Todos</option>
                        <option value="exitosos">Solo Exitosos</option>
                        <option value="fallidos">Solo Fallidos</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th 
                                onClick={() => handleSort('id_intento_02')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'id_intento_02' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID
                            </th>
                            <th 
                                onClick={() => handleSort('fecha_intento_02')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'fecha_intento_02' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Fecha/Hora
                            </th>
                            <th 
                                onClick={() => handleSort('attempted_email')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'attempted_email' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Email Intentado
                            </th>
                            <th 
                                onClick={() => handleSort('username')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Usuario
                            </th>
                            <th 
                                onClick={() => handleSort('ip_address_02')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'ip_address_02' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Dirección IP
                            </th>
                            <th 
                                onClick={() => handleSort('exitoso_02')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'exitoso_02' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Estado
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && intentos.length === 0 ? (
                            <tr><td colSpan={6}>Cargando...</td></tr>
                        ) : processedIntentos.length === 0 ? (
                            <tr><td colSpan={6}>No hay intentos de login registrados</td></tr>
                        ) : (
                            processedIntentos.map((intento) => (
                                <tr key={intento.id_intento_02}>
                                    <td>{intento.id_intento_02}</td>
                                    <td>
                                        {intento.fecha_intento_02
                                            ? new Date(intento.fecha_intento_02).toLocaleString('es-CL', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })
                                            : 'N/A'}
                                    </td>
                                    <td><strong>{intento.attempted_email}</strong></td>
                                    <td>
                                        {intento.username 
                                            ? `${intento.username}${intento.nombre_completo_00 ? ` (${intento.nombre_completo_00})` : ''}`
                                            : <span style={{ color: '#999', fontStyle: 'italic' }}>Usuario no encontrado</span>}
                                    </td>
                                    <td>
                                        <code style={{ 
                                            fontSize: '12px', 
                                            backgroundColor: '#f5f5f5', 
                                            padding: '4px 8px', 
                                            borderRadius: '3px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {intento.ip_address_02 || <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>}
                                        </code>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${intento.exitoso_02 ? 'active' : 'inactive'}`}>
                                            {intento.exitoso_02 ? '✅ Exitoso' : '❌ Fallido'}
                                        </span>
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

export default IntentoLoginView;








