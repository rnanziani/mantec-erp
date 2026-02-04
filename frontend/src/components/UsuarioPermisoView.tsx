import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import Pagination from './shared/Pagination';
import './BodegaView.css';

interface UsuarioPermiso {
    id_usuario_000: number;
    id_permiso_000: number;
    created_at_000?: string;
    username?: string;
    nombre_completo_00?: string;
    email?: string;
    nombre_permiso_05?: string;
    descripcion_05?: string;
    orden_05?: number;
}

interface Usuario {
    id_usuario_00: number;
    username: string;
    nombre_completo_00?: string;
    email: string;
    is_active: boolean;
}

interface Permiso {
    id_permiso_05: number;
    nombre_permiso_05: string;
    descripcion_05: string | null;
    orden_05: number | null;
}

const UsuarioPermisoView: React.FC = () => {
    const [relaciones, setRelaciones] = useState<UsuarioPermiso[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showFormMasivo, setShowFormMasivo] = useState(false);
    const [selectedUsuario, setSelectedUsuario] = useState<number | ''>('');
    const [selectedPermiso, setSelectedPermiso] = useState<number | ''>('');
    const [selectedPermisosMasivos, setSelectedPermisosMasivos] = useState<number[]>([]);

    // Estados para búsqueda y ordenamiento
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof UsuarioPermiso; direction: 'asc' | 'desc' } | null>(null);
    
    // Estados para paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10);

    const API_URL = 'http://localhost:3001/api/usuario-permisos';
    const USUARIOS_URL = 'http://localhost:3001/api/usuarios';
    const PERMISOS_URL = 'http://localhost:3001/api/permisos';

    useEffect(() => {
        fetchRelaciones();
        fetchUsuarios();
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
            await showError('Error', 'Error al cargar relaciones usuario-permiso');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await fetch(USUARIOS_URL);
            const data = await response.json();
            if (data.success) {
                // Filtrar solo usuarios activos
                const usuariosActivos = data.data.filter((u: Usuario) => u.is_active);
                setUsuarios(usuariosActivos);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
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
        
        if (!selectedUsuario || !selectedPermiso) {
            await showError('Validación', 'Debe seleccionar un usuario y un permiso');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario_000: selectedUsuario,
                    id_permiso_000: selectedPermiso
                })
            });

            const data = await response.json();

            if (data.success) {
                await showSuccess('¡Éxito!', data.message || 'Permiso asignado al usuario exitosamente');
                fetchRelaciones();
                resetForm();
            } else {
                await showError('Error', data.error || 'Error en la operación');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitMasivo = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedUsuario || selectedPermisosMasivos.length === 0) {
            await showError('Validación', 'Debe seleccionar un usuario y al menos un permiso');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/masivo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario_000: selectedUsuario,
                    permisos: selectedPermisosMasivos
                })
            });

            const data = await response.json();

            if (data.success) {
                await showSuccess('¡Éxito!', data.message || 'Permisos asignados exitosamente');
                fetchRelaciones();
                resetFormMasivo();
            } else {
                await showError('Error', data.error || 'Error en la operación');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (idUsuario: number, idPermiso: number) => {
        const usuario = usuarios.find(u => u.id_usuario_00 === idUsuario);
        const permiso = permisos.find(p => p.id_permiso_05 === idPermiso);
        const nombreUsuario = usuario?.nombre_completo_00 || usuario?.username || `Usuario ID: ${idUsuario}`;
        const nombrePermiso = permiso?.nombre_permiso_05 || `Permiso ID: ${idPermiso}`;
        
        const confirmed = await showDeleteConfirm(`el permiso "${nombrePermiso}" del usuario "${nombreUsuario}"`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/${idUsuario}/${idPermiso}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await showSuccess('¡Eliminado!', data.message || 'Permiso removido del usuario exitosamente');
                fetchRelaciones();
            } else {
                await showError('Error', data.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al eliminar');
        }
    };

    const handleDeleteTodos = async (idUsuario: number) => {
        const usuario = usuarios.find(u => u.id_usuario_00 === idUsuario);
        const nombreUsuario = usuario?.nombre_completo_00 || usuario?.username || `Usuario ID: ${idUsuario}`;
        
        const confirmed = await showDeleteConfirm(`todos los permisos directos del usuario "${nombreUsuario}"`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/usuario/${idUsuario}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await showSuccess('¡Eliminado!', data.message || 'Permisos removidos exitosamente');
                fetchRelaciones();
            } else {
                await showError('Error', data.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al eliminar');
        }
    };

    const resetForm = () => {
        setSelectedUsuario('');
        setSelectedPermiso('');
        setShowForm(false);
    };

    const resetFormMasivo = () => {
        setSelectedUsuario('');
        setSelectedPermisosMasivos([]);
        setShowFormMasivo(false);
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof UsuarioPermiso) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedRelaciones = React.useMemo(() => {
        let data = [...relaciones];

        // 1. Filtrar
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(r =>
                (r.username && r.username.toLowerCase().includes(lowerFiltro)) ||
                (r.nombre_completo_00 && r.nombre_completo_00.toLowerCase().includes(lowerFiltro)) ||
                (r.email && r.email.toLowerCase().includes(lowerFiltro)) ||
                (r.nombre_permiso_05 && r.nombre_permiso_05.toLowerCase().includes(lowerFiltro)) ||
                (r.descripcion_05 && r.descripcion_05.toLowerCase().includes(lowerFiltro)) ||
                r.id_usuario_000.toString().includes(lowerFiltro) ||
                r.id_permiso_000.toString().includes(lowerFiltro)
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
        } else {
            // Orden por defecto: por usuario, luego por orden del permiso
            data.sort((a, b) => {
                const usuarioA = (a.username || '').toLowerCase();
                const usuarioB = (b.username || '').toLowerCase();
                if (usuarioA !== usuarioB) {
                    return usuarioA.localeCompare(usuarioB);
                }
                const ordenA = a.orden_05 ?? 9999;
                const ordenB = b.orden_05 ?? 9999;
                return ordenA - ordenB;
            });
        }

        return data;
    }, [relaciones, filtro, sortConfig]);

    // Paginación: calcular items a mostrar
    const paginatedRelaciones = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedRelaciones.slice(startIndex, startIndex + itemsPerPage);
    }, [processedRelaciones, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedRelaciones.length / itemsPerPage);

    // Resetear a página 1 cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [filtro]);

    // Obtener permisos disponibles para un usuario (no asignados directamente)
    const getPermisosDisponibles = (usuarioId: number) => {
        const permisosAsignados = relaciones
            .filter(r => r.id_usuario_000 === usuarioId)
            .map(r => r.id_permiso_000);
        return permisos.filter(p => !permisosAsignados.includes(p.id_permiso_05));
    };

    // Agregar/remover permiso de la selección masiva
    const togglePermisoMasivo = (permisoId: number) => {
        setSelectedPermisosMasivos(prev => 
            prev.includes(permisoId)
                ? prev.filter(id => id !== permisoId)
                : [...prev, permisoId]
        );
    };

    // Obtener relaciones agrupadas por usuario para mostrar el botón "Eliminar todos"
    const relacionesPorUsuario = React.useMemo(() => {
        const grupos: Record<number, UsuarioPermiso[]> = {};
        relaciones.forEach(rel => {
            if (!grupos[rel.id_usuario_000]) {
                grupos[rel.id_usuario_000] = [];
            }
            grupos[rel.id_usuario_000].push(rel);
        });
        return grupos;
    }, [relaciones]);

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>👤 Asignación de Permisos Directos a Usuarios</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setShowFormMasivo(!showFormMasivo);
                            setShowForm(false);
                        }}
                    >
                        {showFormMasivo ? '✕ Cancelar' : '📦 Asignación Masiva'}
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setShowForm(!showForm);
                            setShowFormMasivo(false);
                        }}
                    >
                        {showForm ? '✕ Cancelar' : '+ Nueva Asignación'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>Nueva Asignación Permiso-Usuario</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Usuario *</label>
                            <select
                                value={selectedUsuario}
                                onChange={(e) => setSelectedUsuario(e.target.value ? parseInt(e.target.value) : '')}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value="">Seleccione un usuario</option>
                                {usuarios.map(usuario => (
                                    <option key={usuario.id_usuario_00} value={usuario.id_usuario_00}>
                                        {usuario.nombre_completo_00 || usuario.username} ({usuario.email})
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
                                {selectedUsuario 
                                    ? getPermisosDisponibles(selectedUsuario as number).map(permiso => (
                                        <option key={permiso.id_permiso_05} value={permiso.id_permiso_05}>
                                            {permiso.nombre_permiso_05} {permiso.descripcion_05 ? `- ${permiso.descripcion_05}` : ''}
                                        </option>
                                    ))
                                    : permisos.map(permiso => (
                                        <option key={permiso.id_permiso_05} value={permiso.id_permiso_05}>
                                            {permiso.nombre_permiso_05} {permiso.descripcion_05 ? `- ${permiso.descripcion_05}` : ''}
                                        </option>
                                    ))
                                }
                            </select>
                            {selectedUsuario && getPermisosDisponibles(selectedUsuario as number).length === 0 && (
                                <small style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                                    Este usuario ya tiene todos los permisos asignados directamente
                                </small>
                            )}
                            <small style={{ color: '#6c757d', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                                💡 Nota: Solo se muestran permisos no asignados directamente. Los permisos del nivel se mantienen.
                            </small>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading || !selectedUsuario || !selectedPermiso}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showFormMasivo && (
                <div className="form-container">
                    <h3>Asignación Masiva de Permisos</h3>
                    <form onSubmit={handleSubmitMasivo}>
                        <div className="form-group">
                            <label>Usuario *</label>
                            <select
                                value={selectedUsuario}
                                onChange={(e) => setSelectedUsuario(e.target.value ? parseInt(e.target.value) : '')}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value="">Seleccione un usuario</option>
                                {usuarios.map(usuario => (
                                    <option key={usuario.id_usuario_00} value={usuario.id_usuario_00}>
                                        {usuario.nombre_completo_00 || usuario.username} ({usuario.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Permisos *</label>
                            <div style={{ 
                                maxHeight: '300px', 
                                overflowY: 'auto', 
                                border: '1px solid #ced4da', 
                                borderRadius: '4px', 
                                padding: '10px',
                                backgroundColor: '#f8f9fa'
                            }}>
                                {selectedUsuario ? (
                                    getPermisosDisponibles(selectedUsuario as number).length === 0 ? (
                                        <p style={{ color: '#dc3545', textAlign: 'center', padding: '20px' }}>
                                            Este usuario ya tiene todos los permisos asignados directamente
                                        </p>
                                    ) : (
                                        getPermisosDisponibles(selectedUsuario as number).map(permiso => (
                                            <label key={permiso.id_permiso_05} style={{ 
                                                display: 'block', 
                                                padding: '8px',
                                                marginBottom: '5px',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                backgroundColor: selectedPermisosMasivos.includes(permiso.id_permiso_05) ? '#e7f3ff' : 'transparent'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermisosMasivos.includes(permiso.id_permiso_05)}
                                                    onChange={() => togglePermisoMasivo(permiso.id_permiso_05)}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                <strong>{permiso.nombre_permiso_05}</strong>
                                                {permiso.descripcion_05 && (
                                                    <span style={{ color: '#6c757d', fontSize: '0.9em' }}> - {permiso.descripcion_05}</span>
                                                )}
                                            </label>
                                        ))
                                    )
                                ) : (
                                    <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                                        Seleccione un usuario para ver los permisos disponibles
                                    </p>
                                )}
                            </div>
                            <small style={{ color: '#6c757d', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                                💡 Seleccione uno o más permisos para asignar al usuario
                            </small>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading || !selectedUsuario || selectedPermisosMasivos.length === 0}>
                                {loading ? 'Guardando...' : `Guardar (${selectedPermisosMasivos.length} permisos)`}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetFormMasivo}>
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
                    placeholder="🔍 Buscar por usuario, permiso, email o descripción..."
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
                                onClick={() => handleSort('username')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Usuario
                            </th>
                            <th>Email</th>
                            <th 
                                onClick={() => handleSort('nombre_permiso_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_permiso_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Permiso
                            </th>
                            <th>Descripción Permiso</th>
                            <th>Fecha Asignación</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && relaciones.length === 0 ? (
                            <tr><td colSpan={6}>Cargando...</td></tr>
                        ) : processedRelaciones.length === 0 ? (
                            <tr><td colSpan={6}>No hay permisos directos asignados a usuarios</td></tr>
                        ) : (
                            paginatedRelaciones.map((relacion, index) => {
                                const isFirstOfUser = index === 0 || 
                                    paginatedRelaciones[index - 1].id_usuario_000 !== relacion.id_usuario_000;
                                const relacionesDelUsuario = relacionesPorUsuario[relacion.id_usuario_000] || [];
                                const tieneMultiplesPermisos = relacionesDelUsuario.length > 1;

                                return (
                                    <tr key={`${relacion.id_usuario_000}-${relacion.id_permiso_000}`}>
                                        <td>
                                            <strong>{relacion.nombre_completo_00 || relacion.username || `ID: ${relacion.id_usuario_000}`}</strong>
                                            {isFirstOfUser && tieneMultiplesPermisos && (
                                                <div style={{ marginTop: '5px' }}>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDeleteTodos(relacion.id_usuario_000)}
                                                        title={`Eliminar todos los permisos de ${relacion.nombre_completo_00 || relacion.username}`}
                                                        style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                                    >
                                                        🗑️ Eliminar Todos ({relacionesDelUsuario.length})
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td>{relacion.email || '-'}</td>
                                        <td>
                                            <strong>{relacion.nombre_permiso_05 || `ID: ${relacion.id_permiso_000}`}</strong>
                                        </td>
                                        <td>{relacion.descripcion_05 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
                                        <td>
                                            {relacion.created_at_000 
                                                ? new Date(relacion.created_at_000).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : '-'
                                            }
                                        </td>
                                        <td className="actions">
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(relacion.id_usuario_000, relacion.id_permiso_000)}
                                                title="Eliminar permiso"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {processedRelaciones.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={processedRelaciones.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    );
};

export default UsuarioPermisoView;







