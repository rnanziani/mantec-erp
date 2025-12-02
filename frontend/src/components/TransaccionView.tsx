import React, { useState, useEffect } from 'react';
import './BodegaView.css';

interface Transaccion {
    id_transaccion_28: number;
    id_alternador_28: number;
    id_bodega_28: number;
    fecha_28: string;
    id_tipo_transaccion_28: number;
    cod_alternador_19?: string;
    marca_18?: string;
    bodega_descripcion?: string;
    tipo_descripcion?: string;
    tipo_codigo?: string;
    valor_accion?: -1 | 0 | 1;
}

interface Alternador {
    id_alternador_19: number;
    cod_alternador_19: string;
    marca_18?: string;
}

interface Bodega {
    id_bodega_27: number;
    descripcion_27: string;
    activo: boolean;
}

interface TipoTransaccion {
    id_tipo_transaccion_25: number;
    descripcion_25: string;
    cod_accion_25: string;
    valor_accion_25: -1 | 0 | 1;
}

const TransaccionView: React.FC = () => {
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [alternadores, setAlternadores] = useState<Alternador[]>([]);
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [tipos, setTipos] = useState<TipoTransaccion[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        id_alternador_28: 0,
        id_bodega_28: 0,
        id_tipo_transaccion_28: 0,
        fecha_28: new Date().toISOString().slice(0, 16)
    });

    useEffect(() => {
        fetchTransacciones();
        fetchAlternadores();
        fetchBodegas();
        fetchTipos();
    }, []);

    const fetchTransacciones = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/transacciones');
            const data = await response.json();
            if (data.success) {
                setTransacciones(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlternadores = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/alternadores');
            const data = await response.json();
            if (data.success) {
                setAlternadores(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchBodegas = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/bodegas/activas');
            const data = await response.json();
            if (data.success) {
                setBodegas(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchTipos = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/tipos-transaccion');
            const data = await response.json();
            if (data.success) {
                setTipos(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.id_alternador_28 || !formData.id_bodega_28 || !formData.id_tipo_transaccion_28) {
            alert('Todos los campos son requeridos');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/transacciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message || 'Transacción registrada exitosamente');
                fetchTransacciones();
                resetForm();
            } else {
                alert(data.error || 'Error al registrar la transacción');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar la transacción');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            id_alternador_28: 0,
            id_bodega_28: 0,
            id_tipo_transaccion_28: 0,
            fecha_28: new Date().toISOString().slice(0, 16)
        });
        setShowForm(false);
    };

    const getValorIcon = (valor?: number) => {
        if (valor === 1) return '📈';
        if (valor === -1) return '📉';
        return '➖';
    };

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>📝 Registro de Transacciones</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nueva Transacción'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>Registrar Nueva Transacción</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Alternador *</label>
                            <select
                                value={formData.id_alternador_28}
                                onChange={(e) => setFormData({ ...formData, id_alternador_28: parseInt(e.target.value) })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value={0}>Seleccione un alternador</option>
                                {alternadores.map(alt => (
                                    <option key={alt.id_alternador_19} value={alt.id_alternador_19}>
                                        {alt.cod_alternador_19} - {alt.marca_18}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Bodega *</label>
                            <select
                                value={formData.id_bodega_28}
                                onChange={(e) => setFormData({ ...formData, id_bodega_28: parseInt(e.target.value) })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value={0}>Seleccione una bodega</option>
                                {bodegas.map(bod => (
                                    <option key={bod.id_bodega_27} value={bod.id_bodega_27}>
                                        {bod.descripcion_27}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tipo de Transacción *</label>
                            <select
                                value={formData.id_tipo_transaccion_28}
                                onChange={(e) => setFormData({ ...formData, id_tipo_transaccion_28: parseInt(e.target.value) })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value={0}>Seleccione un tipo</option>
                                {tipos.map(tipo => (
                                    <option key={tipo.id_tipo_transaccion_25} value={tipo.id_tipo_transaccion_25}>
                                        {tipo.cod_accion_25} - {tipo.descripcion_25} ({tipo.valor_accion_25 > 0 ? '+' : ''}{tipo.valor_accion_25})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Fecha y Hora *</label>
                            <input
                                type="datetime-local"
                                value={formData.fecha_28}
                                onChange={(e) => setFormData({ ...formData, fecha_28: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Registrando...' : 'Registrar Transacción'}
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
                            <th>Fecha</th>
                            <th>Alternador</th>
                            <th>Bodega</th>
                            <th>Tipo</th>
                            <th>Impacto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && transacciones.length === 0 ? (
                            <tr><td colSpan={6}>Cargando...</td></tr>
                        ) : transacciones.length === 0 ? (
                            <tr><td colSpan={6}>No hay transacciones registradas</td></tr>
                        ) : (
                            transacciones.map((trans) => (
                                <tr key={trans.id_transaccion_28}>
                                    <td>{trans.id_transaccion_28}</td>
                                    <td>{new Date(trans.fecha_28).toLocaleString('es-CL')}</td>
                                    <td>
                                        <strong>{trans.cod_alternador_19}</strong><br />
                                        <small>{trans.marca_18}</small>
                                    </td>
                                    <td>{trans.bodega_descripcion}</td>
                                    <td>
                                        <strong>{trans.tipo_codigo}</strong><br />
                                        <small>{trans.tipo_descripcion}</small>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '20px' }}>
                                            {getValorIcon(trans.valor_accion)}
                                        </span>
                                        {trans.valor_accion}
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

export default TransaccionView;
