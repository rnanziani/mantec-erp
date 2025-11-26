import React, { useState, useEffect } from 'react';
import './InventarioAlternadorView.css';

interface InventarioAlternador {
    id_inventario_23: number;
    id_alternador_23: number;
    id_estado_actual_23: number;
    id_maquina_asignada_23?: number;
    ubicacion_23?: string;
    fecha_ultimo_movimiento_23: string;
    contador_reparaciones_23: number;
    activo_23: boolean;
    cod_alternador_19?: string;
    marca_18?: string;
    estado_20?: string;
    numinterno_11?: string;
    ppu_11?: string;
}

interface Alternador {
    id_alternador_19: number;
    cod_alternador_19: string;
    marca_18?: string;
}

interface Estado {
    id_estado_20: number;
    estado_20: string;
}

interface Maquina {
    idmaquina_11: number;
    numinterno_11: string;
    ppu_11: string;
}

const InventarioAlternadorView: React.FC = () => {
    const [inventario, setInventario] = useState<InventarioAlternador[]>([]);
    const [alternadores, setAlternadores] = useState<Alternador[]>([]);
    const [estados, setEstados] = useState<Estado[]>([]);
    const [maquinas, setMaquinas] = useState<Maquina[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        id_alternador_23: '',
        id_estado_actual_23: '',
        id_maquina_asignada_23: '',
        ubicacion_23: '',
        contador_reparaciones_23: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, altRes, estRes, maqRes] = await Promise.all([
                fetch('http://localhost:3001/api/inventario'),
                fetch('http://localhost:3001/api/alternadores'),
                fetch('http://localhost:3001/api/estados'),
                fetch('http://localhost:3001/api/maquinas')
            ]);

            const invData = await invRes.json();
            const altData = await altRes.json();
            const estData = await estRes.json();
            const maqData = await maqRes.json();

            if (invData.success) setInventario(invData.data);
            if (altData.success) setAlternadores(altData.data);
            if (estData.success) setEstados(estData.data);
            if (maqData.success) setMaquinas(maqData.data);
        } catch (err) {
            setError('Error al cargar los datos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const url = editingId
                ? `http://localhost:3001/api/inventario/${editingId}`
                : 'http://localhost:3001/api/inventario';

            const method = editingId ? 'PUT' : 'POST';

            const body = {
                id_alternador_23: Number(formData.id_alternador_23),
                id_estado_actual_23: Number(formData.id_estado_actual_23),
                id_maquina_asignada_23: formData.id_maquina_asignada_23 ? Number(formData.id_maquina_asignada_23) : null,
                ubicacion_23: formData.ubicacion_23,
                contador_reparaciones_23: Number(formData.contador_reparaciones_23)
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error al guardar');
            }

            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Está seguro de eliminar este registro?')) return;

        try {
            const response = await fetch(`http://localhost:3001/api/inventario/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                fetchData();
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            alert('Error al eliminar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
    };

    const handleEdit = (item: InventarioAlternador) => {
        setEditingId(item.id_inventario_23);
        setFormData({
            id_alternador_23: item.id_alternador_23.toString(),
            id_estado_actual_23: item.id_estado_actual_23.toString(),
            id_maquina_asignada_23: item.id_maquina_asignada_23?.toString() || '',
            ubicacion_23: item.ubicacion_23 || '',
            contador_reparaciones_23: item.contador_reparaciones_23
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            id_alternador_23: '',
            id_estado_actual_23: '',
            id_maquina_asignada_23: '',
            ubicacion_23: '',
            contador_reparaciones_23: 0
        });
        setError(null);
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="inventario-container">
            <div className="inventario-header">
                <div className="inventario-title">
                    <span>📦</span> Gestión de Inventario
                </div>
                <button
                    className="btn-primary"
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                >
                    + Nuevo Registro
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="inventario-table-container">
                <table className="inventario-table">
                    <thead>
                        <tr>
                            <th>Alternador</th>
                            <th>Marca</th>
                            <th>Estado</th>
                            <th>Ubicación</th>
                            <th>Máquina Asignada</th>
                            <th>Fecha</th>
                            <th>Reparaciones</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventario.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-state">No hay registros en el inventario</td>
                            </tr>
                        ) : (
                            inventario.map((item) => (
                                <tr key={item.id_inventario_23}>
                                    <td>{item.cod_alternador_19}</td>
                                    <td>{item.marca_18}</td>
                                    <td>
                                        <span className={`status-badge ${item.activo_23 ? 'status-active' : 'status-inactive'}`}>
                                            {item.estado_20}
                                        </span>
                                    </td>
                                    <td>{item.ubicacion_23 || '-'}</td>
                                    <td>
                                        {item.numinterno_11 ? `${item.numinterno_11} (${item.ppu_11})` : '-'}
                                    </td>
                                    <td>{new Date(item.fecha_ultimo_movimiento_23).toLocaleDateString()}</td>
                                    <td>{item.contador_reparaciones_23}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(item)}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(item.id_inventario_23)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingId ? 'Editar Registro' : 'Nuevo Registro'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Alternador</label>
                                <select
                                    className="form-select"
                                    value={formData.id_alternador_23}
                                    onChange={(e) => setFormData({ ...formData, id_alternador_23: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione Alternador</option>
                                    {alternadores.map(alt => (
                                        <option key={alt.id_alternador_19} value={alt.id_alternador_19}>
                                            {alt.cod_alternador_19} - {alt.marca_18}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Estado</label>
                                <select
                                    className="form-select"
                                    value={formData.id_estado_actual_23}
                                    onChange={(e) => setFormData({ ...formData, id_estado_actual_23: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione Estado</option>
                                    {estados.map(est => (
                                        <option key={est.id_estado_20} value={est.id_estado_20}>
                                            {est.estado_20}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Máquina Asignada (Opcional)</label>
                                <select
                                    className="form-select"
                                    value={formData.id_maquina_asignada_23}
                                    onChange={(e) => setFormData({ ...formData, id_maquina_asignada_23: e.target.value })}
                                >
                                    <option value="">Ninguna</option>
                                    {maquinas.map(maq => (
                                        <option key={maq.idmaquina_11} value={maq.idmaquina_11}>
                                            {maq.numinterno_11} - {maq.ppu_11}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ubicación</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.ubicacion_23}
                                    onChange={(e) => setFormData({ ...formData, ubicacion_23: e.target.value })}
                                    placeholder="Ej: Bodega Central, Estante 3"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contador Reparaciones</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.contador_reparaciones_23}
                                    onChange={(e) => setFormData({ ...formData, contador_reparaciones_23: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default InventarioAlternadorView;
