import React, { useState, useEffect, useMemo } from 'react';
import './OrdenTrabajoView.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface OrdenTrabajo {
    id_orden_24: number;
    id_alternador_24: number;
    id_maquina_retirado_24?: number;
    fecha_ingreso_taller_24: string;
    fecha_salida_taller_24?: string;
    diagnostico_24?: string;
    trabajo_realizado_24?: string;
    costo_reparacion_24?: number;
    tecnico_responsable_24?: string;
    estado_orden_24: 'PENDIENTE' | 'EN_REPARACION' | 'COMPLETADA' | 'CANCELADA';
    // JOINed fields
    cod_alternador_19?: string;
    marca_18?: string;
    numinterno_11?: string;
    ppu_11?: string;
}

interface Alternador {
    id_alternador_19: number;
    cod_alternador_19: string;
    marca_18?: string;
}

interface Maquina {
    idmaquina_11: number;
    numinterno_11: string;
    ppu_11: string;
    descripcion_11: string;
}

interface ApiResponse {
    success: boolean;
    data?: OrdenTrabajo[] | OrdenTrabajo | Alternador[] | Maquina[];
    count?: number;
    message?: string;
    error?: string;
}

type SortConfig = {
    key: keyof OrdenTrabajo;
    direction: 'asc' | 'desc';
};

const OrdenTrabajoView: React.FC = () => {
    const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
    const [alternadores, setAlternadores] = useState<Alternador[]>([]);
    const [maquinas, setMaquinas] = useState<Maquina[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Form fields
    const [idAlternador, setIdAlternador] = useState<string>('');
    const [idMaquinaRetirado, setIdMaquinaRetirado] = useState<string>('');
    const [fechaSalida, setFechaSalida] = useState<string>('');
    const [diagnostico, setDiagnostico] = useState<string>('');
    const [trabajoRealizado, setTrabajoRealizado] = useState<string>('');
    const [costoReparacion, setCostoReparacion] = useState<string>('');
    const [tecnicoResponsable, setTecnicoResponsable] = useState<string>('');
    const [estadoOrden, setEstadoOrden] = useState<string>('PENDIENTE');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState<boolean>(false);

    // Features
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_orden_24', direction: 'desc' });

    // Machine dropdown search
    const [maquinaSearch, setMaquinaSearch] = useState<string>('');
    const [showMaquinaDropdown, setShowMaquinaDropdown] = useState<boolean>(false);

    const { showToast } = useToast();
    const API_URL = 'http://localhost:3001/api/ordenes-trabajo';

    useEffect(() => {
        fetchOrdenes();
        fetchAlternadores();
        fetchMaquinas();
    }, []);

    const fetchOrdenes = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch(API_URL);
            const data: ApiResponse = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setOrdenes(data.data as OrdenTrabajo[]);
            } else {
                setError('Error al cargar las órdenes de trabajo');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlternadores = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/alternadores');
            const data: ApiResponse = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setAlternadores(data.data as Alternador[]);
            }
        } catch (err) {
            console.error('Error al cargar alternadores:', err);
        }
    };

    const fetchMaquinas = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/maquinas');
            const data: ApiResponse = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setMaquinas(data.data as Maquina[]);
            }
        } catch (err) {
            console.error('Error al cargar máquinas:', err);
        }
    };

    // Filtrar máquinas por búsqueda
    const filteredMaquinas = useMemo(() => {
        if (!maquinaSearch.trim()) return maquinas;
        const search = maquinaSearch.toLowerCase();
        return maquinas.filter(maq =>
            maq.numinterno_11.toLowerCase().includes(search) ||
            maq.ppu_11.toLowerCase().includes(search)
        );
    }, [maquinas, maquinaSearch]);

    // Obtener el texto de la máquina seleccionada
    const getSelectedMaquinaText = () => {
        if (!idMaquinaRetirado) return '';
        const maquina = maquinas.find(m => m.idmaquina_11.toString() === idMaquinaRetirado);
        if (!maquina) return '';
        return `${maquina.numinterno_11} - ${maquina.ppu_11} (${maquina.descripcion_11})`;
    };

    // Filtrar y ordenar datos
    const filteredAndSortedOrdenes = useMemo(() => {
        let filtered = ordenes.filter(orden =>
            orden.cod_alternador_19?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            orden.estado_orden_24?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            orden.tecnico_responsable_24?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            orden.diagnostico_24?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            orden.numinterno_11?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Ordenar
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [ordenes, searchTerm, sortConfig]);

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrdenes = filteredAndSortedOrdenes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredAndSortedOrdenes.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleSort = (key: keyof OrdenTrabajo) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: keyof OrdenTrabajo) => {
        if (sortConfig.key !== key) return '⇅';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idAlternador) {
            showToast('Alternador es requerido', 'error');
            return;
        }

        try {
            setError('');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_alternador_24: parseInt(idAlternador),
                    id_maquina_retirado_24: idMaquinaRetirado ? parseInt(idMaquinaRetirado) : undefined,
                    diagnostico_24: diagnostico.trim() || undefined,
                    trabajo_realizado_24: trabajoRealizado.trim() || undefined,
                    costo_reparacion_24: costoReparacion ? parseFloat(costoReparacion) : undefined,
                    tecnico_responsable_24: tecnicoResponsable.trim() || undefined,
                    estado_orden_24: estadoOrden
                })
            });

            const data: ApiResponse = await response.json();

            if (data.success) {
                await fetchOrdenes();
                resetForm();
                showToast('Orden de trabajo creada exitosamente', 'success');
            } else {
                showToast(data.error || 'Error al crear la orden de trabajo', 'error');
            }
        } catch (err) {
            showToast('Error al crear la orden de trabajo', 'error');
            console.error('Error:', err);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idAlternador || editingId === null) return;

        try {
            setError('');
            const response = await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_alternador_24: parseInt(idAlternador),
                    id_maquina_retirado_24: idMaquinaRetirado ? parseInt(idMaquinaRetirado) : undefined,
                    fecha_salida_taller_24: fechaSalida || undefined,
                    diagnostico_24: diagnostico.trim() || undefined,
                    trabajo_realizado_24: trabajoRealizado.trim() || undefined,
                    costo_reparacion_24: costoReparacion ? parseFloat(costoReparacion) : undefined,
                    tecnico_responsable_24: tecnicoResponsable.trim() || undefined,
                    estado_orden_24: estadoOrden
                })
            });

            const data: ApiResponse = await response.json();

            if (data.success) {
                await fetchOrdenes();
                resetForm();
                showToast('Orden de trabajo actualizada exitosamente', 'success');
            } else {
                showToast(data.error || 'Error al actualizar la orden de trabajo', 'error');
            }
        } catch (err) {
            showToast('Error al actualizar la orden de trabajo', 'error');
            console.error('Error:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Está seguro de eliminar esta orden de trabajo?')) return;

        try {
            setError('');
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            const data: ApiResponse = await response.json();

            if (data.success) {
                await fetchOrdenes();
                showToast('Orden de trabajo eliminada exitosamente', 'success');
            } else {
                showToast(data.error || 'Error al eliminar la orden de trabajo', 'error');
            }
        } catch (err) {
            showToast('Error al eliminar la orden de trabajo', 'error');
            console.error('Error:', err);
        }
    };

    const startEdit = (orden: OrdenTrabajo) => {
        setEditingId(orden.id_orden_24);
        setIdAlternador(orden.id_alternador_24.toString());
        setIdMaquinaRetirado(orden.id_maquina_retirado_24?.toString() || '');
        setFechaSalida(orden.fecha_salida_taller_24 ? orden.fecha_salida_taller_24.substring(0, 10) : '');
        setDiagnostico(orden.diagnostico_24 || '');
        setTrabajoRealizado(orden.trabajo_realizado_24 || '');
        setCostoReparacion(orden.costo_reparacion_24?.toString() || '');
        setTecnicoResponsable(orden.tecnico_responsable_24 || '');
        setEstadoOrden(orden.estado_orden_24);
        setShowForm(true);
        setError('');
    };

    const resetForm = () => {
        setIdAlternador('');
        setIdMaquinaRetirado('');
        setFechaSalida('');
        setDiagnostico('');
        setTrabajoRealizado('');
        setCostoReparacion('');
        setTecnicoResponsable('');
        setEstadoOrden('PENDIENTE');
        setEditingId(null);
        setShowForm(false);
        setError('');
        setMaquinaSearch('');
        setShowMaquinaDropdown(false);
    };

    const showCreateForm = () => {
        resetForm();
        setShowForm(true);
    };

    const handleExport = () => {
        const dataToExport = filteredAndSortedOrdenes.map(o => ({
            ID: o.id_orden_24,
            Alternador: o.cod_alternador_19 || '',
            Marca: o.marca_18 || '',
            Máquina: o.numinterno_11 ? `${o.numinterno_11} - ${o.ppu_11}` : '-',
            'Fecha Ingreso': new Date(o.fecha_ingreso_taller_24).toLocaleDateString('es-CL'),
            'Fecha Salida': o.fecha_salida_taller_24 ? new Date(o.fecha_salida_taller_24).toLocaleDateString('es-CL') : '-',
            Estado: o.estado_orden_24,
            Diagnóstico: o.diagnostico_24 || '-',
            'Trabajo Realizado': o.trabajo_realizado_24 || '-',
            'Costo (CLP)': o.costo_reparacion_24 ? `$${o.costo_reparacion_24.toLocaleString('es-CL')}` : '-',
            Técnico: o.tecnico_responsable_24 || '-'
        }));
        exportToExcel(dataToExport, 'ordenes-trabajo', 'Órdenes de Trabajo');
        showToast('Datos exportados exitosamente', 'success');
    };

    const formatFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatCosto = (costo?: number) => {
        if (!costo) return '-';
        return `$${costo.toLocaleString('es-CL')}`;
    };

    return (
        <div className="ordenes-container fade-in">
            <div className="ordenes-header">
                <h2>🔧 Gestión de Órdenes de Trabajo</h2>
                <div className="header-actions">
                    {!showForm && (
                        <>
                            <button className="btn-export" onClick={handleExport} title="Exportar a Excel">
                                📊 Exportar
                            </button>
                            <button className="btn-primary" onClick={showCreateForm}>
                                ➕ Nueva Orden
                            </button>
                        </>
                    )}
                </div>
            </div>

            {!showForm && (
                <div className="search-section">
                    <SearchBar
                        placeholder="Buscar por alternador, estado, técnico, máquina..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                    <div className="results-info">
                        {filteredAndSortedOrdenes.length} resultado{filteredAndSortedOrdenes.length !== 1 ? 's' : ''}
                        {searchTerm && ` para "${searchTerm}"`}
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-error fade-in">
                    ⚠️ {error}
                </div>
            )}

            {showForm && (
                <div className="form-card fade-in">
                    <h3>{editingId ? '✏️ Editar Orden de Trabajo' : '➕ Nueva Orden de Trabajo'}</h3>
                    <form onSubmit={editingId ? handleUpdate : handleCreate}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="alternador">Alternador: *</label>
                                <select
                                    id="alternador"
                                    className="form-select"
                                    value={idAlternador}
                                    onChange={(e) => setIdAlternador(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione un alternador</option>
                                    {alternadores.map(alt => (
                                        <option key={alt.id_alternador_19} value={alt.id_alternador_19}>
                                            {alt.cod_alternador_19} {alt.marca_18 ? `- ${alt.marca_18}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="estadoOrden">Estado: *</label>
                                <select
                                    id="estadoOrden"
                                    className="form-select"
                                    value={estadoOrden}
                                    onChange={(e) => setEstadoOrden(e.target.value)}
                                    required
                                >
                                    <option value="PENDIENTE">PENDIENTE</option>
                                    <option value="EN_REPARACION">EN REPARACIÓN</option>
                                    <option value="COMPLETADA">COMPLETADA</option>
                                    <option value="CANCELADA">CANCELADA</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="maquina">Máquina Retirada:</label>
                                <div className="searchable-select-container" style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        id="maquina"
                                        className="form-input"
                                        placeholder="Buscar por número interno o PPU..."
                                        value={idMaquinaRetirado ? getSelectedMaquinaText() : maquinaSearch}
                                        onChange={(e) => {
                                            setMaquinaSearch(e.target.value);
                                            setIdMaquinaRetirado('');
                                        }}
                                        onFocus={() => setShowMaquinaDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowMaquinaDropdown(false), 200)}
                                        autoComplete="off"
                                    />
                                    {showMaquinaDropdown && (
                                        <div className="searchable-dropdown" style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            backgroundColor: '#ffffff',
                                            border: '2px solid var(--border-color)',
                                            borderRadius: '8px',
                                            marginTop: '4px',
                                            zIndex: 9999,
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                                            isolation: 'isolate'
                                        }}>
                                            <div
                                                className="dropdown-item"
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseDown={() => {
                                                    setIdMaquinaRetirado('');
                                                    setMaquinaSearch('');
                                                    setShowMaquinaDropdown(false);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <em style={{ color: 'var(--text-secondary)' }}>Sin máquina asignada</em>
                                            </div>
                                            {filteredMaquinas.length === 0 ? (
                                                <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                    No se encontraron máquinas
                                                </div>
                                            ) : (
                                                filteredMaquinas.map(maq => (
                                                    <div
                                                        key={maq.idmaquina_11}
                                                        className="dropdown-item"
                                                        style={{
                                                            padding: '10px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseDown={() => {
                                                            setIdMaquinaRetirado(maq.idmaquina_11.toString());
                                                            setMaquinaSearch('');
                                                            setShowMaquinaDropdown(false);
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <strong>{maq.numinterno_11}</strong> - {maq.ppu_11}
                                                        <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                            {maq.descripcion_11}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {editingId && (
                                <div className="form-group">
                                    <label htmlFor="fechaSalida">Fecha Salida Taller:</label>
                                    <input
                                        type="date"
                                        id="fechaSalida"
                                        className="form-input"
                                        value={fechaSalida}
                                        onChange={(e) => setFechaSalida(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="tecnico">Técnico Responsable:</label>
                                <input
                                    type="text"
                                    id="tecnico"
                                    className="form-input"
                                    value={tecnicoResponsable}
                                    onChange={(e) => setTecnicoResponsable(e.target.value)}
                                    placeholder="Nombre del técnico"
                                    maxLength={100}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="costo">Costo Reparación (CLP):</label>
                                <input
                                    type="number"
                                    id="costo"
                                    className="form-input"
                                    value={costoReparacion}
                                    onChange={(e) => setCostoReparacion(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="diagnostico">Diagnóstico:</label>
                            <textarea
                                id="diagnostico"
                                className="form-textarea"
                                value={diagnostico}
                                onChange={(e) => setDiagnostico(e.target.value)}
                                placeholder="Descripción del diagnóstico..."
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="trabajoRealizado">Trabajo Realizado:</label>
                            <textarea
                                id="trabajoRealizado"
                                className="form-textarea"
                                value={trabajoRealizado}
                                onChange={(e) => setTrabajoRealizado(e.target.value)}
                                placeholder="Descripción del trabajo realizado..."
                                rows={3}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-success">
                                {editingId ? '💾 Actualizar' : '➕ Crear'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                ❌ Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="loading">⏳ Cargando órdenes de trabajo...</div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="ordenes-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('id_orden_24')} className="sortable">
                                        ID {getSortIcon('id_orden_24')}
                                    </th>
                                    <th onClick={() => handleSort('cod_alternador_19')} className="sortable">
                                        Alternador {getSortIcon('cod_alternador_19')}
                                    </th>
                                    <th>Máquina</th>
                                    <th onClick={() => handleSort('fecha_ingreso_taller_24')} className="sortable">
                                        F. Ingreso {getSortIcon('fecha_ingreso_taller_24')}
                                    </th>
                                    <th onClick={() => handleSort('fecha_salida_taller_24')} className="sortable">
                                        F. Salida {getSortIcon('fecha_salida_taller_24')}
                                    </th>
                                    <th onClick={() => handleSort('estado_orden_24')} className="sortable">
                                        Estado {getSortIcon('estado_orden_24')}
                                    </th>
                                    <th>Costo</th>
                                    <th>Técnico</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentOrdenes.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="no-data">
                                            {searchTerm
                                                ? `🔧 No se encontraron órdenes con "${searchTerm}"`
                                                : '🔧 No hay órdenes de trabajo registradas'
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    currentOrdenes.map((orden) => (
                                        <tr key={orden.id_orden_24} className="fade-in">
                                            <td>{orden.id_orden_24}</td>
                                            <td className="orden-alternador">
                                                {orden.cod_alternador_19}
                                                {orden.marca_18 && <div className="marca-text">{orden.marca_18}</div>}
                                            </td>
                                            <td className="orden-maquina">
                                                {orden.numinterno_11 ? `${orden.numinterno_11} - ${orden.ppu_11}` : '-'}
                                            </td>
                                            <td>{formatFecha(orden.fecha_ingreso_taller_24)}</td>
                                            <td>{orden.fecha_salida_taller_24 ? formatFecha(orden.fecha_salida_taller_24) : '-'}</td>
                                            <td>
                                                <span className={`badge badge-${orden.estado_orden_24.toLowerCase()}`}>
                                                    {orden.estado_orden_24}
                                                </span>
                                            </td>
                                            <td className="orden-costo">{formatCosto(orden.costo_reparacion_24)}</td>
                                            <td>{orden.tecnico_responsable_24 || '-'}</td>
                                            <td className="actions">
                                                <button
                                                    className="btn-edit"
                                                    onClick={() => startEdit(orden)}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDelete(orden.id_orden_24)}
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

                    {filteredAndSortedOrdenes.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredAndSortedOrdenes.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default OrdenTrabajoView;
