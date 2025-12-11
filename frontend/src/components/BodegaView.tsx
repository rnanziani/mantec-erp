import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface Bodega {
    id_bodega_27: number;
    descripcion_27: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

const BodegaView: React.FC = () => {
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [descripcion, setDescripcion] = useState('');

    // Estados para búsqueda y ordenamiento
    const [filtro, setFiltro] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Bodega; direction: 'asc' | 'desc' } | null>(null);

    const API_URL = 'http://localhost:3001/api/bodegas';

    useEffect(() => {
        fetchBodegas();
    }, []);

    const fetchBodegas = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setBodegas(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar bodegas');
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
                body: JSON.stringify({ descripcion_27: descripcion })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message || 'Operación exitosa');
                fetchBodegas();
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

    const handleToggleStatus = async (id: number) => {
        if (!window.confirm('¿Está seguro de cambiar el estado de esta bodega?')) return;

        try {
            const response = await fetch(`${API_URL}/${id}/toggle`, {
                method: 'PATCH'
            });
            const data = await response.json();
            if (data.success) {
                fetchBodegas();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleEdit = (bodega: Bodega) => {
        setEditingId(bodega.id_bodega_27);
        setDescripcion(bodega.descripcion_27);
        setShowForm(true);
    };

    const resetForm = () => {
        setDescripcion('');
        setEditingId(null);
        setShowForm(false);
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof Bodega) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof Bodega) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedBodegas = React.useMemo(() => {
        let data = [...bodegas];

        // 1. Filtrar
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(b =>
                b.descripcion_27.toLowerCase().includes(lowerFiltro) ||
                b.id_bodega_27.toString().includes(lowerFiltro)
            );
        }

        // 2. Ordenar
        if (sortConfig) {
            data.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return data;
    }, [bodegas, filtro, sortConfig]);

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🏢 Gestión de Bodegas</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nueva Bodega'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>{editingId ? 'Editar Bodega' : 'Nueva Bodega'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Descripción de la Bodega *</label>
                            <input
                                type="text"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                required
                                placeholder="Ej: Bodega Central"
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
                    placeholder="🔍 Buscar bodega..."
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
                                onClick={() => handleSort('id_bodega_27')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'id_bodega_27' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID
                            </th>
                            <th 
                                onClick={() => handleSort('descripcion_27')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'descripcion_27' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Descripción
                            </th>
                            <th 
                                onClick={() => handleSort('activo')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'activo' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Estado
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && bodegas.length === 0 ? (
                            <tr><td colSpan={4}>Cargando...</td></tr>
                        ) : processedBodegas.length === 0 ? (
                            <tr><td colSpan={4}>No hay bodegas registradas</td></tr>
                        ) : (
                            processedBodegas.map((bodega) => (
                                <tr key={bodega.id_bodega_27}>
                                    <td>{bodega.id_bodega_27}</td>
                                    <td>{bodega.descripcion_27}</td>
                                    <td>
                                        <span className={`status-badge ${bodega.activo ? 'active' : 'inactive'}`}>
                                            {bodega.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(bodega)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className={`btn-toggle ${bodega.activo ? 'btn-danger' : 'btn-success'}`}
                                            onClick={() => handleToggleStatus(bodega.id_bodega_27)}
                                            title={bodega.activo ? 'Desactivar' : 'Activar'}
                                        >
                                            {bodega.activo ? '🚫' : '✅'}
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

export default BodegaView;
