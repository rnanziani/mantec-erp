import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import './BodegaView.css';
import { apiUrl } from '../lib/apiClient';

interface NivelUsuario {
    id_nivel_04: number;
    nombre_nivel_04: string;
    descripcion_04: string | null;
    creado_en_04: string;
}

const NivelUsuarioView: React.FC = () => {
    const [niveles, setNiveles] = useState<NivelUsuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [nombreNivel, setNombreNivel] = useState('');
    const [descripcion, setDescripcion] = useState('');

    // Estados para búsqueda y ordenamiento
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof NivelUsuario; direction: 'asc' | 'desc' }>({
        key: 'id_nivel_04',
        direction: 'asc',
    });

    const API_URL = apiUrl('/niveles-usuario');

    useEffect(() => {
        fetchNiveles();
    }, []);

    const fetchNiveles = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setNiveles(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al cargar niveles de acceso');
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
                    nombre_nivel_04: nombreNivel.trim().toUpperCase(),
                    descripcion_04: descripcion.trim() ? descripcion.trim().toUpperCase() : null
                })
            });

            const data = await response.json();

            if (data.success) {
                await showSuccess('¡Éxito!', data.message || 'Operación exitosa');
                fetchNiveles();
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
        const confirmed = await showDeleteConfirm('este nivel de acceso');
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await showSuccess('¡Eliminado!', data.message || 'Nivel de acceso eliminado exitosamente');
                fetchNiveles();
            } else {
                await showError('Error', data.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al eliminar');
        }
    };

    const handleEdit = (nivel: NivelUsuario) => {
        setEditingId(nivel.id_nivel_04);
        setNombreNivel(nivel.nombre_nivel_04.toUpperCase());
        setDescripcion((nivel.descripcion_04 || '').toUpperCase());
        setShowForm(true);
    };

    const resetForm = () => {
        setNombreNivel('');
        setDescripcion('');
        setEditingId(null);
        setShowForm(false);
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof NivelUsuario) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof NivelUsuario) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedNiveles = React.useMemo(() => {
        let data = [...niveles];

        // 1. Filtrar
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(n =>
                n.nombre_nivel_04.toLowerCase().includes(lowerFiltro) ||
                (n.descripcion_04 && n.descripcion_04.toLowerCase().includes(lowerFiltro)) ||
                n.id_nivel_04.toString().includes(lowerFiltro)
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
    }, [niveles, filtro, sortConfig]);

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>👤 Gestión de Nivel de Acceso (Roles)</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nuevo Nivel'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>{editingId ? 'Editar Nivel de Acceso' : 'Nuevo Nivel de Acceso'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Nombre del Nivel *</label>
                            <input
                                type="text"
                                value={nombreNivel}
                                onChange={(e) => setNombreNivel(e.target.value.toUpperCase())}
                                required
                                placeholder="Ej: ADMINISTRADOR, USUARIO, SUPERVISOR"
                                maxLength={50}
                                style={{ textTransform: 'uppercase' }}
                                autoCapitalize="characters"
                                spellCheck={false}
                            />
                        </div>
                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                                placeholder="DESCRIPCIÓN DEL NIVEL DE ACCESO (OPCIONAL)"
                                rows={4}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontFamily: 'inherit', resize: 'vertical', textTransform: 'uppercase' }}
                                autoCapitalize="characters"
                                spellCheck={false}
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
                    placeholder="🔍 BUSCAR NIVEL DE ACCESO..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase' }}
                    autoCapitalize="characters"
                    spellCheck={false}
                />
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th 
                                onClick={() => handleSort('id_nivel_04')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'id_nivel_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID
                            </th>
                            <th 
                                onClick={() => handleSort('nombre_nivel_04')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_nivel_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Nombre
                            </th>
                            <th 
                                onClick={() => handleSort('descripcion_04')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'descripcion_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Descripción
                            </th>
                            <th 
                                onClick={() => handleSort('creado_en_04')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'creado_en_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Creado
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && niveles.length === 0 ? (
                            <tr><td colSpan={5}>Cargando...</td></tr>
                        ) : processedNiveles.length === 0 ? (
                            <tr><td colSpan={5}>No hay niveles de acceso registrados</td></tr>
                        ) : (
                            processedNiveles.map((nivel) => (
                                <tr key={nivel.id_nivel_04}>
                                    <td>{nivel.id_nivel_04}</td>
                                    <td style={{ textTransform: 'uppercase' }}><strong>{nivel.nombre_nivel_04}</strong></td>
                                    <td style={{ textTransform: 'uppercase' }}>
                                        {nivel.descripcion_04 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}
                                    </td>
                                    <td>
                                        {nivel.creado_en_04
                                            ? new Date(nivel.creado_en_04).toLocaleDateString('es-CL', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            })
                                            : 'N/A'}
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(nivel)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(nivel.id_nivel_04)}
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

export default NivelUsuarioView;

