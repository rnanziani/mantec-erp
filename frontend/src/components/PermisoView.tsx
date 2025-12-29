import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import Pagination from './shared/Pagination';
import './BodegaView.css';

interface Permiso {
    id_permiso_05: number;
    nombre_permiso_05: string;
    descripcion_05: string | null;
    orden_05: number | null;
}

const PermisoView: React.FC = () => {
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [nombrePermiso, setNombrePermiso] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [orden, setOrden] = useState<number>(0);

    // Estados para búsqueda y ordenamiento
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Permiso; direction: 'asc' | 'desc' } | null>(null);
    
    // Estados para paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10);

    const API_URL = 'http://localhost:3001/api/permisos';

    useEffect(() => {
        fetchPermisos();
    }, []);

    const fetchPermisos = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setPermisos(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al cargar permisos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre_permiso_05: nombrePermiso,
                    descripcion_05: descripcion || null,
                    orden_05: orden
                })
            });

            const data = await response.json();

            if (data.success) {
                await showSuccess('¡Éxito!', data.message || 'Operación exitosa');
                fetchPermisos();
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

    const handleDelete = async (id: number) => {
        const confirmed = await showDeleteConfirm('este permiso');
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await showSuccess('¡Eliminado!', data.message || 'Permiso eliminado exitosamente');
                fetchPermisos();
            } else {
                await showError('Error', data.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al eliminar');
        }
    };

    const handleEdit = (permiso: Permiso) => {
        setEditingId(permiso.id_permiso_05);
        setNombrePermiso(permiso.nombre_permiso_05);
        setDescripcion(permiso.descripcion_05 || '');
        setOrden(permiso.orden_05 ?? 0);
        setShowForm(true);
    };

    const resetForm = () => {
        setNombrePermiso('');
        setDescripcion('');
        setOrden(0);
        setEditingId(null);
        setShowForm(false);
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof Permiso) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedPermisos = React.useMemo(() => {
        let data = [...permisos];

        // 1. Filtrar
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(p =>
                p.nombre_permiso_05.toLowerCase().includes(lowerFiltro) ||
                (p.descripcion_05 && p.descripcion_05.toLowerCase().includes(lowerFiltro)) ||
                p.id_permiso_05.toString().includes(lowerFiltro) ||
                (p.orden_05 !== null && p.orden_05.toString().includes(lowerFiltro))
            );
        }

        // 2. Ordenar
        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                // Manejar valores null/undefined
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
            // Orden por defecto: por orden_05, luego por nombre
            data.sort((a, b) => {
                const aOrden = a.orden_05 ?? 9999;
                const bOrden = b.orden_05 ?? 9999;
                
                if (aOrden !== bOrden) {
                    return aOrden - bOrden;
                }
                return a.nombre_permiso_05.localeCompare(b.nombre_permiso_05);
            });
        }

        return data;
    }, [permisos, filtro, sortConfig]);

    // Paginación: calcular items a mostrar
    const paginatedPermisos = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedPermisos.slice(startIndex, startIndex + itemsPerPage);
    }, [processedPermisos, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedPermisos.length / itemsPerPage);

    // Resetear a página 1 cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [filtro]);

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔐 Gestión de Permisos</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nuevo Permiso'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>{editingId ? 'Editar Permiso' : 'Nuevo Permiso'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Nombre del Permiso *</label>
                            <input
                                type="text"
                                value={nombrePermiso}
                                onChange={(e) => setNombrePermiso(e.target.value)}
                                required
                                placeholder="Ej: Crear Usuario, Editar Orden, Ver Reportes"
                                maxLength={50}
                            />
                        </div>
                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Descripción del permiso (opcional)"
                                rows={4}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Orden</label>
                            <input
                                type="number"
                                value={orden}
                                onChange={(e) => setOrden(parseInt(e.target.value) || 0)}
                                placeholder="Orden de visualización (ej: 1000, 2000, 3000...)"
                                min="0"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            />
                            <small style={{ color: '#6c757d', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                                💡 Tip: Usa rangos para agrupar permisos (1000-1999: Dashboard, 2000-2999: Nivel de Acceso, etc.)
                            </small>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
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
                    placeholder="🔍 Buscar permiso..."
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
                                onClick={() => handleSort('id_permiso_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'id_permiso_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID
                            </th>
                            <th 
                                onClick={() => handleSort('nombre_permiso_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_permiso_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Nombre
                            </th>
                            <th 
                                onClick={() => handleSort('descripcion_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'descripcion_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Descripción
                            </th>
                            <th 
                                onClick={() => handleSort('orden_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'orden_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Orden
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && permisos.length === 0 ? (
                            <tr><td colSpan={5}>Cargando...</td></tr>
                        ) : processedPermisos.length === 0 ? (
                            <tr><td colSpan={5}>No hay permisos registrados</td></tr>
                        ) : (
                            paginatedPermisos.map((permiso) => (
                                <tr key={permiso.id_permiso_05}>
                                    <td>{permiso.id_permiso_05}</td>
                                    <td><strong>{permiso.nombre_permiso_05}</strong></td>
                                    <td>{permiso.descripcion_05 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
                                    <td>
                                        <span style={{ 
                                            fontWeight: permiso.orden_05 && permiso.orden_05 > 0 ? 'bold' : 'normal',
                                            color: permiso.orden_05 && permiso.orden_05 > 0 ? '#495057' : '#999'
                                        }}>
                                            {permiso.orden_05 !== null && permiso.orden_05 !== undefined ? permiso.orden_05 : <span style={{ fontStyle: 'italic' }}>0</span>}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(permiso)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(permiso.id_permiso_05)}
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

            {/* Paginación */}
            {processedPermisos.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={processedPermisos.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    );
};

export default PermisoView;

















