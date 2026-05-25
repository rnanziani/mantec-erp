import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import { exportToExcel } from '../utils/exportUtils';
import Pagination from './shared/Pagination';
import { RANGOS_MODULO_PERMISOS } from '../constants/permisoModuloRangos';
import './BodegaView.css';
import { apiUrl } from '../lib/apiClient';

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
    const [ordenMin, setOrdenMin] = useState('');
    const [ordenMax, setOrdenMax] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Permiso; direction: 'asc' | 'desc' } | null>(null);

    /** Orden igual al sidebar: 1 Inicio … 7 Reportes (miles = posición del menú) */
    const RANGOS_MODULO = RANGOS_MODULO_PERMISOS;
    
    // Estados para paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10);

    const API_URL = apiUrl('/permisos');

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

        // 1. Filtrar por texto
        if (filtro) {
            const lowerFiltro = filtro.toLowerCase();
            data = data.filter(p =>
                p.nombre_permiso_05.toLowerCase().includes(lowerFiltro) ||
                (p.descripcion_05 && p.descripcion_05.toLowerCase().includes(lowerFiltro)) ||
                p.id_permiso_05.toString().includes(lowerFiltro) ||
                (p.orden_05 !== null && p.orden_05.toString().includes(lowerFiltro))
            );
        }

        // 2. Filtrar por rango de orden
        const minVal = ordenMin.trim() !== '' ? Number(ordenMin) : null;
        const maxVal = ordenMax.trim() !== '' ? Number(ordenMax) : null;
        if (minVal !== null && !Number.isNaN(minVal)) {
            data = data.filter((p) => (p.orden_05 ?? 0) >= minVal);
        }
        if (maxVal !== null && !Number.isNaN(maxVal)) {
            data = data.filter((p) => (p.orden_05 ?? 0) <= maxVal);
        }

        // 3. Ordenar
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
    }, [permisos, filtro, ordenMin, ordenMax, sortConfig]);

    const hayFiltroActivo = Boolean(filtro || ordenMin.trim() || ordenMax.trim());
    const rangoActivoLabel = React.useMemo(() => {
        if (!ordenMin.trim() && !ordenMax.trim()) return null;
        const match = RANGOS_MODULO.find(
            (r) => ordenMin === String(r.min) && ordenMax === String(r.max)
        );
        if (match) return `${match.label} (${match.min}–${match.max})`;
        return `${ordenMin.trim() || '…'} – ${ordenMax.trim() || '…'}`;
    }, [ordenMin, ordenMax]);

    // Paginación: calcular items a mostrar
    const paginatedPermisos = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedPermisos.slice(startIndex, startIndex + itemsPerPage);
    }, [processedPermisos, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedPermisos.length / itemsPerPage);

    // Resetear a página 1 cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [filtro, ordenMin, ordenMax]);

    const aplicarRango = (min: number, max: number) => {
        setOrdenMin(String(min));
        setOrdenMax(String(max));
    };

    const limpiarFiltros = () => {
        setFiltro('');
        setOrdenMin('');
        setOrdenMax('');
    };

    const handleExport = async () => {
        const dataToExport = processedPermisos.map((p) => ({
            ID: p.id_permiso_05,
            Nombre: p.nombre_permiso_05,
            Descripcion: p.descripcion_05 ?? '',
            Orden: p.orden_05 ?? 0
        }));
        let suffix = '';
        if (ordenMin.trim() || ordenMax.trim()) {
            suffix += `_orden_${ordenMin.trim() || 'min'}_${ordenMax.trim() || 'max'}`;
        }
        if (filtro) suffix += '_texto';
        exportToExcel(dataToExport, `permisos${suffix || '_completo'}`, 'Permisos');
        await showSuccess('¡Exportación exitosa!', 'El reporte de permisos se descargó en Excel.');
    };

    return (
        <div className="bodega-view">
            <div
                className="view-header"
                style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '16px',
                        flex: '1 1 320px',
                        minWidth: 0,
                    }}
                >
                    <h2>🔐 Catálogo de Permisos</h2>
                    <p
                        role="note"
                        aria-label="Observación sobre el catálogo de permisos"
                        style={{
                            margin: 0,
                            flex: '1 1 260px',
                            maxWidth: '720px',
                            fontSize: '0.85rem',
                            color: '#3d5a73',
                            lineHeight: 1.45,
                            padding: '8px 14px',
                            background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
                            border: '1px solid #b8d4f0',
                            borderRadius: '8px',
                            boxShadow: '0 1px 2px rgba(0, 60, 120, 0.06)',
                        }}
                    >
                        <strong style={{ color: '#2563eb', fontWeight: 600 }}>ℹ️ Observación:</strong>{' '}
                        Aún no asignas nada a nadie. Solo defines llaves que existen en el sistema.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleExport}
                        disabled={processedPermisos.length === 0}
                        style={{ backgroundColor: '#17a2b8' }}
                        title="Exportar listado a Excel"
                        aria-label="Exportar permisos a Excel"
                    >
                        📊 Exportar
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '✕ Cancelar' : '+ Nuevo Permiso'}
                    </button>
                </div>
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
                                💡 Tip: Usa rangos por menú (1000 Inicio, 2000 Nivel de Acceso, 3000 Operaciones, 4000 Neumáticos, 5000 Gestión Alternadores, 6000 Mantenedores, 7000 Reportes).
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

            {/* Buscador y filtro por rango de orden */}
            <div className="form-container" style={{ marginBottom: '20px' }}>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        alignItems: 'flex-end',
                        marginBottom: '12px',
                    }}
                >
                    <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                        <label htmlFor="filtro-permiso" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                            Buscar permiso
                        </label>
                        <input
                            id="filtro-permiso"
                            type="text"
                            placeholder="🔍 Nombre, descripción o ID..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            aria-label="Buscar permiso por nombre, descripción o ID"
                            style={{ width: '100%', padding: '8px 10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    <div style={{ flex: '0 1 110px', minWidth: '90px' }}>
                        <label htmlFor="orden-min" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                            Desde
                        </label>
                        <input
                            id="orden-min"
                            type="number"
                            min={0}
                            placeholder="4000"
                            value={ordenMin}
                            onChange={(e) => setOrdenMin(e.target.value)}
                            aria-describedby="rango-orden-ayuda"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    <div style={{ flex: '0 1 110px', minWidth: '90px' }}>
                        <label htmlFor="orden-max" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                            Hasta
                        </label>
                        <input
                            id="orden-max"
                            type="number"
                            min={0}
                            placeholder="4999"
                            value={ordenMax}
                            onChange={(e) => setOrdenMax(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    {hayFiltroActivo && (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={limpiarFiltros}
                            style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                <p id="rango-orden-ayuda" style={{ fontSize: '0.8rem', color: '#6c757d', margin: '0 0 10px' }}>
                    Atajos por módulo (mismo orden que el menú lateral):
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="group" aria-label="Atajos de rango por módulo">
                    {RANGOS_MODULO.map((r) => {
                        const activo = ordenMin === String(r.min) && ordenMax === String(r.max);
                        return (
                            <button
                                key={r.label}
                                type="button"
                                onClick={() => aplicarRango(r.min, r.max)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    borderRadius: '20px',
                                    border: activo ? '2px solid #007bff' : '1px solid #ced4da',
                                    background: activo ? '#e7f1ff' : '#f8f9fa',
                                    cursor: 'pointer',
                                }}
                                aria-pressed={activo}
                            >
                                {r.label} ({r.min}–{r.max})
                            </button>
                        );
                    })}
                </div>

                {rangoActivoLabel && (
                    <p style={{ marginTop: '10px', marginBottom: 0, fontSize: '0.85rem', color: '#007bff' }}>
                        Mostrando permisos con orden entre <strong>{rangoActivoLabel}</strong>
                        {' '}({processedPermisos.length} resultado{processedPermisos.length !== 1 ? 's' : ''})
                    </p>
                )}
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
                            <tr><td colSpan={5}>
                                {hayFiltroActivo
                                    ? 'No hay permisos que coincidan con los filtros aplicados'
                                    : 'No hay permisos registrados'}
                            </td></tr>
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

















