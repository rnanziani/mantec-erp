import React, { useState, useEffect, useMemo } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import Pagination from './shared/Pagination';
import {
    RANGOS_MODULO_PERMISOS,
    filtrarPermisosPorModulo,
    moduloRangoValue,
} from '../constants/permisoModuloRangos';
import { apiUrl } from '../lib/apiClient';
import './BodegaView.css';

interface NivelPermiso {
    id_nivel_04: number;
    id_permiso_05: number;
    nombre_nivel_04?: string;
    nombre_permiso_05?: string;
    descripcion_04?: string;
    descripcion_05?: string;
}

interface NivelUsuario {
    id_nivel_04: number;
    nombre_nivel_04: string;
    descripcion_04: string | null;
}

interface Permiso {
    id_permiso_05: number;
    nombre_permiso_05: string;
    descripcion_05: string | null;
    orden_05: number | null;
}

const NivelPermisoView: React.FC = () => {
    const [relaciones, setRelaciones] = useState<NivelPermiso[]>([]);
    const [niveles, setNiveles] = useState<NivelUsuario[]>([]);
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedNivel, setSelectedNivel] = useState<number | ''>('');
    const [selectedPermiso, setSelectedPermiso] = useState<number | ''>('');

    // Estados para filtros y ordenamiento
    const [filterNivel, setFilterNivel] = useState<number | ''>('');
    const [filterModulo, setFilterModulo] = useState<string>('');
    const [filterPermiso, setFilterPermiso] = useState<number | ''>('');
    const [formModulo, setFormModulo] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof NivelPermiso; direction: 'asc' | 'desc' }>({
        key: 'id_nivel_04',
        direction: 'asc',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const API_URL = apiUrl('/nivel-permisos');
    const NIVELES_URL = apiUrl('/niveles-usuario');
    const PERMISOS_URL = apiUrl('/permisos');

    useEffect(() => {
        fetchRelaciones();
        fetchNiveles();
        fetchPermisos();
    }, []);

    const fetchRelaciones = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success) {
                setRelaciones(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al cargar relaciones nivel-permiso');
        } finally {
            setLoading(false);
        }
    };

    const fetchNiveles = async () => {
        try {
            const response = await fetch(NIVELES_URL);
            const data = await response.json();
            if (data.success) {
                setNiveles(data.data);
            }
        } catch (error) {
            console.error('Error al cargar niveles:', error);
        }
    };

    const fetchPermisos = async () => {
        try {
            const response = await fetch(PERMISOS_URL);
            const data = await response.json();
            if (data.success) {
                setPermisos(data.data);
            }
        } catch (error) {
            console.error('Error al cargar permisos:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedNivel || !selectedPermiso) {
            await showError('Validación', 'Debe seleccionar un nivel y un permiso');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_nivel_04: selectedNivel,
                    id_permiso_05: selectedPermiso
                })
            });

            const data = await response.json();

            if (data.success) {
                await showSuccess('¡Éxito!', data.message || 'Relación creada exitosamente');
                fetchRelaciones();
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

    const handleDelete = async (idNivel: number, idPermiso: number) => {
        const confirmed = await showDeleteConfirm('esta relación');
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/${idNivel}/${idPermiso}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await showSuccess('¡Eliminado!', data.message || 'Relación eliminada exitosamente');
                fetchRelaciones();
            } else {
                await showError('Error', data.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            await showError('Error', 'Error al eliminar');
        }
    };

    const resetForm = () => {
        setSelectedNivel('');
        setSelectedPermiso('');
        setFormModulo('');
        setShowForm(false);
    };

    // Lógica de Ordenamiento
    const handleSort = (key: keyof NivelPermiso) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof NivelPermiso) => {
        if (!sortConfig || sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    // Lógica de Filtrado y Ordenamiento Combinada
    const processedRelaciones = useMemo(() => {
        let data = [...relaciones];

        // 1. Filtrar por nivel y/o permiso
        if (filterNivel !== '') {
            data = data.filter((r) => r.id_nivel_04 === filterNivel);
        }
        if (filterModulo !== '') {
            const idsEnModulo = new Set(
                filtrarPermisosPorModulo(permisos, filterModulo).map((p) => p.id_permiso_05)
            );
            data = data.filter((r) => idsEnModulo.has(r.id_permiso_05));
        }
        if (filterPermiso !== '') {
            data = data.filter((r) => r.id_permiso_05 === filterPermiso);
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
                if (sortConfig.key === 'id_nivel_04' && a.id_permiso_05 !== b.id_permiso_05) {
                    return a.id_permiso_05 - b.id_permiso_05;
                }
                return 0;
            });
        }

        return data;
    }, [relaciones, filterNivel, filterModulo, filterPermiso, sortConfig, permisos]);

    const hayFiltroActivo = filterNivel !== '' || filterModulo !== '' || filterPermiso !== '';

    const permisosOrdenados = useMemo(
        () => [...permisos].sort((a, b) => (a.orden_05 ?? 9999) - (b.orden_05 ?? 9999)),
        [permisos]
    );

    const permisosParaFiltro = useMemo(
        () => filtrarPermisosPorModulo(permisosOrdenados, filterModulo),
        [permisosOrdenados, filterModulo]
    );

    const permisosDisponiblesNivel = useMemo(() => {
        if (!selectedNivel) return permisosOrdenados;
        const asignados = new Set(
            relaciones
                .filter((r) => r.id_nivel_04 === selectedNivel)
                .map((r) => r.id_permiso_05)
        );
        return permisosOrdenados.filter((p) => !asignados.has(p.id_permiso_05));
    }, [selectedNivel, permisosOrdenados, relaciones]);

    const permisosParaFormulario = useMemo(
        () => filtrarPermisosPorModulo(permisosDisponiblesNivel, formModulo),
        [permisosDisponiblesNivel, formModulo]
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const relacionesPaginadas = processedRelaciones.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(processedRelaciones.length / itemsPerPage) || 1;

    useEffect(() => {
        setCurrentPage(1);
    }, [filterNivel, filterModulo, filterPermiso, sortConfig]);

    const limpiarFiltros = () => {
        setFilterNivel('');
        setFilterModulo('');
        setFilterPermiso('');
    };

    useEffect(() => {
        setCurrentPage((p) => {
            const tp = Math.ceil(processedRelaciones.length / itemsPerPage) || 1;
            return p > tp ? tp : p;
        });
    }, [processedRelaciones.length, itemsPerPage]);

    return (
        <div className="bodega-view">
            <div className="view-header">
                <h2>🔗 Asignación de Permisos a Niveles</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Nueva Asignación'}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <h3>Nueva Asignación Permiso-Nivel</h3>
                    <form onSubmit={handleSubmit}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '15px',
                                marginBottom: '16px',
                                alignItems: 'start'
                            }}
                        >
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="nivel-permiso-nivel">Nivel de Acceso *</label>
                                <select
                                    id="nivel-permiso-nivel"
                                    value={selectedNivel}
                                    onChange={(e) => setSelectedNivel(e.target.value ? parseInt(e.target.value) : '')}
                                    required
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                                >
                                    <option value="">Seleccione un nivel</option>
                                    {niveles.map(nivel => (
                                        <option key={nivel.id_nivel_04} value={nivel.id_nivel_04}>
                                            {nivel.nombre_nivel_04}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="nivel-permiso-modulo">Agrupación</label>
                                <select
                                    id="nivel-permiso-modulo"
                                    value={formModulo}
                                    onChange={(e) => {
                                        setFormModulo(e.target.value);
                                        setSelectedPermiso('');
                                    }}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                                >
                                    <option value="">Todos los módulos</option>
                                    {RANGOS_MODULO_PERMISOS.map((r) => (
                                        <option key={r.label} value={moduloRangoValue(r.min, r.max)}>
                                            {r.label} ({r.min}–{r.max})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="nivel-permiso-permiso">Permiso *</label>
                                <select
                                    id="nivel-permiso-permiso"
                                    value={selectedPermiso}
                                    onChange={(e) => setSelectedPermiso(e.target.value ? parseInt(e.target.value) : '')}
                                    required
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                                >
                                    <option value="">Seleccione un permiso</option>
                                    {permisosParaFormulario.map(permiso => (
                                        <option key={permiso.id_permiso_05} value={permiso.id_permiso_05}>
                                            {permiso.nombre_permiso_05}
                                        </option>
                                    ))}
                                </select>
                                {selectedNivel && permisosParaFormulario.length === 0 && (
                                    <small style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                                        {formModulo
                                            ? 'No hay permisos disponibles en esta agrupación para el nivel seleccionado'
                                            : 'Este nivel ya tiene todos los permisos asignados'}
                                    </small>
                                )}
                                {!selectedNivel && formModulo && permisosParaFormulario.length === 0 && (
                                    <small style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
                                        No hay permisos en esta agrupación
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading || !selectedNivel || !selectedPermiso}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filtros por nivel, agrupación y permiso */}
            <div className="form-container" style={{ marginBottom: '20px' }}>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        alignItems: 'flex-end',
                    }}
                >
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px', minWidth: '160px' }}>
                        <label htmlFor="filtro-nivel">Nivel de Acceso</label>
                        <select
                            id="filtro-nivel"
                            value={filterNivel}
                            onChange={(e) => setFilterNivel(e.target.value ? parseInt(e.target.value, 10) : '')}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                        >
                            <option value="">Todos los niveles</option>
                            {niveles.map((nivel) => (
                                <option key={nivel.id_nivel_04} value={nivel.id_nivel_04}>
                                    {nivel.nombre_nivel_04}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px', minWidth: '180px' }}>
                        <label htmlFor="filtro-modulo">Agrupación</label>
                        <select
                            id="filtro-modulo"
                            value={filterModulo}
                            onChange={(e) => {
                                setFilterModulo(e.target.value);
                                setFilterPermiso('');
                            }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                        >
                            <option value="">Todos los módulos</option>
                            {RANGOS_MODULO_PERMISOS.map((r) => (
                                <option key={r.label} value={moduloRangoValue(r.min, r.max)}>
                                    {r.label} ({r.min}–{r.max})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 220px', minWidth: '200px' }}>
                        <label htmlFor="filtro-permiso">Permiso</label>
                        <select
                            id="filtro-permiso"
                            value={filterPermiso}
                            onChange={(e) => setFilterPermiso(e.target.value ? parseInt(e.target.value, 10) : '')}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
                        >
                            <option value="">Todos los permisos</option>
                            {permisosParaFiltro.map((permiso) => (
                                <option key={permiso.id_permiso_05} value={permiso.id_permiso_05}>
                                    {permiso.nombre_permiso_05}
                                </option>
                            ))}
                        </select>
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
                {hayFiltroActivo && (
                    <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: '#007bff' }}>
                        {processedRelaciones.length} resultado{processedRelaciones.length !== 1 ? 's' : ''} con los filtros aplicados
                    </p>
                )}
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th
                                onClick={() => handleSort('id_nivel_04')}
                                className={`sortable ${sortConfig.key === 'id_nivel_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                ID Nivel
                            </th>
                            <th 
                                onClick={() => handleSort('nombre_nivel_04')} 
                                className={`sortable ${sortConfig.key === 'nombre_nivel_04' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Nivel de Acceso
                            </th>
                            <th 
                                onClick={() => handleSort('nombre_permiso_05')} 
                                className={`sortable ${sortConfig && sortConfig.key === 'nombre_permiso_05' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                            >
                                Permiso
                            </th>
                            <th>Descripción Nivel</th>
                            <th>Descripción Permiso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && relaciones.length === 0 ? (
                            <tr><td colSpan={6}>Cargando...</td></tr>
                        ) : processedRelaciones.length === 0 ? (
                            <tr><td colSpan={6}>
                                {hayFiltroActivo
                                    ? 'No hay asignaciones que coincidan con los filtros aplicados'
                                    : 'No hay relaciones nivel-permiso registradas'}
                            </td></tr>
                        ) : (
                            relacionesPaginadas.map((relacion) => (
                                <tr key={`${relacion.id_nivel_04}-${relacion.id_permiso_05}`}>
                                    <td>{relacion.id_nivel_04}</td>
                                    <td>
                                        <strong>{relacion.nombre_nivel_04 || `Nivel ${relacion.id_nivel_04}`}</strong>
                                    </td>
                                    <td>
                                        <strong>{relacion.nombre_permiso_05 || `ID: ${relacion.id_permiso_05}`}</strong>
                                    </td>
                                    <td>{relacion.descripcion_04 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
                                    <td>{relacion.descripcion_05 || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin descripción</span>}</td>
                                    <td className="actions">
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(relacion.id_nivel_04, relacion.id_permiso_05)}
                                            title="Eliminar relación"
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

            {processedRelaciones.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={processedRelaciones.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    );
};

export default NivelPermisoView;

















