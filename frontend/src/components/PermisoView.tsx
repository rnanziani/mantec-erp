import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import './BodegaView.css';

interface Permiso {
    id_permiso_05: number;
    nombre_permiso_05: string;
    descripcion_05: string | null;
}

const PermisoView: React.FC = () => {
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [nombrePermiso, setNombrePermiso] = useState('');
    const [descripcion, setDescripcion] = useState('');

    // Estados para búsqueda y ordenamiento
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Permiso; direction: 'asc' | 'desc' } | null>(null);

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
                    descripcion_05: descripcion || null
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
        if (!window.confirm('¿Está seguro de eliminar este permiso?')) return;

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
        setShowForm(true);
    };

    const resetForm = () => {
        setNombrePermiso('');
        setDescripcion('');
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

    const getSortIndicator = (key: keyof Permiso) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
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
                p.id_permiso_05.toString().includes(lowerFiltro)
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
    }, [permisos, filtro, sortConfig]);

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
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && permisos.length === 0 ? (
                            <tr><td colSpan={4}>Cargando...</td></tr>
                        ) : processedPermisos.length === 0 ? (
                            <tr><td colSpan={4}>No hay permisos registrados</td></tr>
                        ) : (
                            processedPermisos.map((permiso) => (
                                <tr key={permiso.id_permiso_05}>
                                    <td>{permiso.id_permiso_05}</td>
                                    <td><strong>{permiso.nombre_permiso_05}</strong></td>
                                    <td>{permiso.descripcion_05 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
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
        </div>
    );
};

export default PermisoView;

















