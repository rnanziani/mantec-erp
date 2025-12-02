import React, { useState, useEffect } from 'react';
import './BodegaView.css'; // Reutilizamos los mismos estilos

interface TipoTransaccion {
    id_tipo_transaccion_25: number;
    descripcion_25: string;
    cod_accion_25: string;
    valor_accion_25: -1 | 0 | 1;
    created_at: string;
    updated_at: string;
}

const TipoTransaccionView: React.FC = () => {
    const [tipos, setTipos] = useState<TipoTransaccion[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        descripcion_25: '',
        cod_accion_25: '',
        valor_accion_25: 1 as -1 | 0 | 1
    });

    const API_URL = 'http://localhost:3001/api/tipos-transaccion';

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setTipos(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar tipos de transacción');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar código de 3 letras mayúsculas
        if (!/^[A-Z]{3}$/.test(formData.cod_accion_25)) {
            alert('El código debe ser exactamente 3 letras mayúsculas');
            return;
        }

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
                fetchTipos();
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

    const handleEdit = (tipo: TipoTransaccion) => {
        setEditingId(tipo.id_tipo_transaccion_25);
        setFormData({
            descripcion_25: tipo.descripcion_25,
            cod_accion_25: tipo.cod_accion_25,
            valor_accion_25: tipo.valor_accion_25
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({ descripcion_25: '', cod_accion_25: '', valor_accion_25: 1 });
        setEditingId(null);
        setShowForm(false);
    };

    const getValorLabel = (valor: number) => {
        if (valor === 1) return '📈 +1 Incrementa';
        if (valor === -1) return '📉 -1 Disminuye';
        return '➖ 0 Neutro';
    };

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔄 Tipos de Transacción</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nuevo Tipo'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>{editingId ? 'Editar Tipo' : 'Nuevo Tipo de Transacción'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Descripción *</label>
                            <input
                                type="text"
                                value={formData.descripcion_25}
                                onChange={(e) => setFormData({ ...formData, descripcion_25: e.target.value })}
                                required
                                placeholder="Ej: Entrada de Compra"
                            />
                        </div>

                        <div className="form-group">
                            <label>Código de Acción * (3 letras mayúsculas)</label>
                            <input
                                type="text"
                                value={formData.cod_accion_25}
                                onChange={(e) => setFormData({ ...formData, cod_accion_25: e.target.value.toUpperCase() })}
                                required
                                maxLength={3}
                                placeholder="ENT"
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Valor de Acción *</label>
                            <select
                                value={formData.valor_accion_25}
                                onChange={(e) => setFormData({ ...formData, valor_accion_25: parseInt(e.target.value) as -1 | 0 | 1 })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value={1}>+1 - Incrementa Stock</option>
                                <option value={-1}>-1 - Disminuye Stock</option>
                                <option value={0}>0 - No Afecta Stock</option>
                            </select>
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
                            <th>Código</th>
                            <th>Descripción</th>
                            <th>Impacto en Stock</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && tipos.length === 0 ? (
                            <tr><td colSpan={5}>Cargando...</td></tr>
                        ) : tipos.length === 0 ? (
                            <tr><td colSpan={5}>No hay tipos registrados</td></tr>
                        ) : (
                            tipos.map((tipo) => (
                                <tr key={tipo.id_tipo_transaccion_25}>
                                    <td>{tipo.id_tipo_transaccion_25}</td>
                                    <td><strong>{tipo.cod_accion_25}</strong></td>
                                    <td>{tipo.descripcion_25}</td>
                                    <td>{getValorLabel(tipo.valor_accion_25)}</td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(tipo)}
                                            title="Editar"
                                        >
                                            ✏️
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

export default TipoTransaccionView;
