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
    const [formData, setFormData] = useState({
        descripcion_27: '',
        activo: true
    });

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
            console.error('Error al cargar bodegas:', error);
            alert('Error al cargar las bodegas');
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
                body: JSON.stringify(formData)
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
            alert('Error al guardar la bodega');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (bodega: Bodega) => {
        setEditingId(bodega.id_bodega_27);
        setFormData({
            descripcion_27: bodega.descripcion_27,
            activo: bodega.activo
        });
        setShowForm(true);
    };

    const handleToggleStatus = async (id: number) => {
        if (!confirm('¿Desea cambiar el estado de esta bodega?')) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/${id}/toggle`, {
                method: 'PATCH'
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                fetchBodegas();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cambiar el estado');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ descripcion_27: '', activo: true });
        setEditingId(null);
        setShowForm(false);
    };

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
                            <label>Descripción *</label>
                            <input
                                type="text"
                                value={formData.descripcion_27}
                                onChange={(e) => setFormData({ ...formData, descripcion_27: e.target.value })}
                                required
                                placeholder="Ej: Bodega Central"
                            />
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                Bodega Activa
                            </label>
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

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && bodegas.length === 0 ? (
                            <tr><td colSpan={4}>Cargando...</td></tr>
                        ) : bodegas.length === 0 ? (
                            <tr><td colSpan={4}>No hay bodegas registradas</td></tr>
                        ) : (
                            bodegas.map((bodega) => (
                                <tr key={bodega.id_bodega_27}>
                                    <td>{bodega.id_bodega_27}</td>
                                    <td>{bodega.descripcion_27}</td>
                                    <td>
                                        <span className={`status-badge ${bodega.activo ? 'active' : 'inactive'}`}>
                                            {bodega.activo ? '✓ Activa' : '✕ Inactiva'}
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
                                            className="btn-toggle"
                                            onClick={() => handleToggleStatus(bodega.id_bodega_27)}
                                            title={bodega.activo ? 'Desactivar' : 'Activar'}
                                        >
                                            {bodega.activo ? '🔒' : '🔓'}
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
