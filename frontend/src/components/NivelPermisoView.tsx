import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface NivelPermiso {
    id_nivel_04: number;
    id_permiso_05: number;
    nombre_nivel_04?: string;
    nombre_permiso_05?: string;
    descripcion_04?: string;
    descripcion_05?: string;
}

interface NivelUsuario {
    id_nivel_04: number;
    nombre_nivel_04: string;
    descripcion_04: string | null;
}

interface Permiso {
    id_permiso_05: number;
    nombre_permiso_05: string;
    descripcion_05: string | null;
}

const NivelPermisoView: React.FC = () => {
    const [relaciones, setRelaciones] = useState<NivelPermiso[]>([]);
    const [niveles, setNiveles] = useState<NivelUsuario[]>([]);
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedNivel, setSelectedNivel] = useState<number | ''>('');
    const [selectedPermiso, setSelectedPermiso] = useState<number | ''>('');

    // Estados para búsqueda y ordenamiento
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof NivelPermiso; direction: 'asc' | 'desc' } | null>(null);

    const API_URL = 'http://localhost:3001/api/nivel-permisos';
    const NIVELES_URL = 'http://localhost:3001/api/niveles-usuario';
    const PERMISOS_URL = 'http://localhost:3001/api/permisos';

    useEffect(() => {
        fetchRelaciones();
        fetchNiveles();
        fetchPermisos();
    }, []);

    const fetchRelaciones = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setRelaciones(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar relaciones nivel-permiso');
        } finally {
            setLoading(false);
        }
    };

    const fetchNiveles = async () => {
        try {
            const response = await fetch(NIVELES_URL);
            const data = await response.json();
            if (data.success) {
                setNiveles(data.data);
            }
        } catch (error) {
            console.error('Error al cargar niveles:', error);
        }
    };

    const fetchPermisos = async () => {
        try {
            const response = await fetch(PERMISOS_URL);
            const data = await response.json();
            if (data.success) {
                setPermisos(data.data);
            }
        } catch (error) {
            console.error('Error al cargar permisos:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedNivel || !selectedPermiso) {
            alert('Debe seleccionar un nivel y un permiso');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_nivel_04: selectedNivel,
                    id_permiso_05: selectedPermiso
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message || 'Relación creada exitosamente');
                fetchRelaciones();
                resetForm();
            } else {
                alert(data.error || 'Error en la operación');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (idNivel: number, idPermiso: number) => {
        if (!window.confirm('¿Está seguro de eliminar esta relación?')) return;

        try {
            const response = await fetch(`${API_URL}/${idNivel}/${idPermiso}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message || 'Relación eliminada exitosamente');
                fetchRelaciones();
            } else {
                alert(data.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar');
        }
    };

    const resetForm = () => {
        setSelectedNivel('');
        setSelectedPermiso('');
        setShowForm(false);
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof NivelPermiso) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof NivelPermiso) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedRelaciones = React.useMemo(() => {
        let data = [...relaciones];

        // 1. Filtrar
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(r =>
                (r.nombre_nivel_04 && r.nombre_nivel_04.toLowerCase().includes(lowerFiltro)) ||
                (r.nombre_permiso_05 && r.nombre_permiso_05.toLowerCase().includes(lowerFiltro)) ||
                (r.descripcion_04 && r.descripcion_04.toLowerCase().includes(lowerFiltro)) ||
                (r.descripcion_05 && r.descripcion_05.toLowerCase().includes(lowerFiltro)) ||
                r.id_nivel_04.toString().includes(lowerFiltro) ||
                r.id_permiso_05.toString().includes(lowerFiltro)
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
    }, [relaciones, filtro, sortConfig]);

    // Obtener permisos disponibles para un nivel (no asignados)
    const getPermisosDisponibles = (nivelId: number) => {
        const permisosAsignados = relaciones
            .filter(r => r.id_nivel_04 === nivelId)
            .map(r => r.id_permiso_05);
        return permisos.filter(p => !permisosAsignados.includes(p.id_permiso_05));
    };

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔗 Asignación de Permisos a Niveles</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nueva Asignación'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>Nueva Asignación Permiso-Nivel</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Nivel de Acceso *</label>
                            <select
                                value={selectedNivel}
                                onChange={(e) => setSelectedNivel(e.target.value ? parseInt(e.target.value) : '')}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value="">Seleccione un nivel</option>
                                {niveles.map(nivel => (
                                    <option key={nivel.id_nivel_04} value={nivel.id_nivel_04}>
                                        {nivel.nombre_nivel_04}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Permiso *</label>
                            <select
                                value={selectedPermiso}
                                onChange={(e) => setSelectedPermiso(e.target.value ? parseInt(e.target.value) : '')}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value="">Seleccione un permiso</option>
                                {selectedNivel 
                                    ? getPermisosDisponibles(selectedNivel as number).map(permiso => (
                                        <option key={permiso.id_permiso_05} value={permiso.id_permiso_05}>
                                            {permiso.nombre_permiso_05}
                                        </option>
                                    ))
                                    : permisos.map(permiso => (
                                        <option key={permiso.id_permiso_05} value={permiso.id_permiso_05}>
                                            {permiso.nombre_permiso_05}
                                        </option>
                                    ))
                                }
                            </select>
                            {selectedNivel && getPermisosDisponibles(selectedNivel as number).length === 0 && (
                                <small style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                                    Este nivel ya tiene todos los permisos asignados
                                </small>
                            )}
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading || !selectedNivel || !selectedPermiso}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Buscador */}
            <div className="form-container" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por nivel, permiso o descripción..."
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
                                onClick={() => handleSort('nombre_nivel_04')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_nivel_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Nivel de Acceso
                            </th>
                            <th 
                                onClick={() => handleSort('nombre_permiso_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_permiso_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Permiso
                            </th>
                            <th>Descripción Nivel</th>
                            <th>Descripción Permiso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && relaciones.length === 0 ? (
                            <tr><td colSpan={5}>Cargando...</td></tr>
                        ) : processedRelaciones.length === 0 ? (
                            <tr><td colSpan={5}>No hay relaciones nivel-permiso registradas</td></tr>
                        ) : (
                            processedRelaciones.map((relacion) => (
                                <tr key={`${relacion.id_nivel_04}-${relacion.id_permiso_05}`}>
                                    <td>
                                        <strong>{relacion.nombre_nivel_04 || `ID: ${relacion.id_nivel_04}`}</strong>
                                    </td>
                                    <td>
                                        <strong>{relacion.nombre_permiso_05 || `ID: ${relacion.id_permiso_05}`}</strong>
                                    </td>
                                    <td>{relacion.descripcion_04 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
                                    <td>{relacion.descripcion_05 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
                                    <td className="actions">
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(relacion.id_nivel_04, relacion.id_permiso_05)}
                                            title="Eliminar relación"
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
        </div>
    );
};

export default NivelPermisoView;

