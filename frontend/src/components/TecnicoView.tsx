import React, { useState, useEffect, useMemo } from 'react';
import './TecnicoView.css';
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { validateRut, formatRut } from '../utils/rutValidator';

interface Tecnico {
    id_tecnico_21: number;
    rut_21: string;
    nombres_21: string;
    a_paterno_21: string;
    a_materno_21: string;
    estado_21: boolean;
    id_cargo_21: number;
    nombre_cargo?: string;
}

interface Cargo {
    idcargo_14: number;
    nombrecargo_14: string;
}

interface ApiResponse {
    success: boolean;
    data?: Tecnico[] | Tecnico | Cargo[];
    count?: number;
    message?: string;
    error?: string;
}

type SortConfig = {
    key: keyof Tecnico;
    direction: 'asc' | 'desc';
};

const TecnicoView: React.FC = () => {
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
    const [cargos, setCargos] = useState<Cargo[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Form fields
    const [rut, setRut] = useState<string>('');
    const [nombres, setNombres] = useState<string>('');
    const [aPaterno, setAPaterno] = useState<string>('');
    const [aMaterno, setAMaterno] = useState<string>('');
    const [idCargo, setIdCargo] = useState<string>('');
    const [estado, setEstado] = useState<boolean>(true);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [rutError, setRutError] = useState<string>('');

    // Features
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_tecnico_21', direction: 'desc' });
    const [filterEstado, setFilterEstado] = useState<string>('all');

    const { showToast } = useToast();
    const API_URL = 'http://localhost:3001/api/tecnicos';
    const CARGOS_URL = 'http://localhost:3001/api/cargos';

    useEffect(() => {
        fetchTecnicos();
        fetchCargos();
    }, []);

    const fetchTecnicos = async () => {
        try {
            setLoading(true);
            const response = await fetch(API_URL);
            const data: ApiResponse = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setTecnicos(data.data as Tecnico[]);
                setError('');
            } else {
                setError(data.error || 'Error al cargar técnicos');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCargos = async () => {
        try {
            const response = await fetch(CARGOS_URL);
            const data: ApiResponse = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setCargos(data.data as Cargo[]);
            }
        } catch (err) {
            console.error('Error al cargar cargos:', err);
            // No es crítico si no hay endpoint de cargos aún
        }
    };

    const handleRutChange = (value: string) => {
        setRut(value);
        setRutError('');
    };

    const handleRutBlur = () => {
        if (rut.trim()) {
            if (validateRut(rut)) {
                const formatted = formatRut(rut);
                setRut(formatted);
                setRutError('');
            } else {
                setRutError('RUT inválido');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar RUT
        if (!validateRut(rut)) {
            setRutError('RUT inválido');
            showToast('Por favor ingrese un RUT válido', 'error');
            return;
        }

        const tecnicoData = {
            rut_21: formatRut(rut),
            nombres_21: nombres.trim(),
            a_paterno_21: aPaterno.trim(),
            a_materno_21: aMaterno.trim(),
            id_cargo_21: parseInt(idCargo),
            estado_21: estado
        };

        try {
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tecnicoData)
            });

            const data: ApiResponse = await response.json();

            if (data.success) {
                showToast(
                    editingId ? 'Técnico actualizado exitosamente' : 'Técnico creado exitosamente',
                    'success'
                );
                fetchTecnicos();
                resetForm();
            } else {
                showToast(data.error || 'Error al guardar técnico', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
            console.error(err);
        }
    };

    const handleEdit = (tecnico: Tecnico) => {
        setEditingId(tecnico.id_tecnico_21);
        setRut(tecnico.rut_21);
        setNombres(tecnico.nombres_21);
        setAPaterno(tecnico.a_paterno_21);
        setAMaterno(tecnico.a_materno_21);
        setIdCargo(tecnico.id_cargo_21.toString());
        setEstado(tecnico.estado_21);
        setShowForm(true);
        setRutError('');
    };

    const handleDelete = async (id: number) => {
        const confirmed = await showDeleteConfirm('este técnico');
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            const data: ApiResponse = await response.json();

            if (data.success) {
                showToast('Técnico eliminado exitosamente', 'success');
                fetchTecnicos();
            } else {
                showToast(data.error || 'Error al eliminar técnico', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
            console.error(err);
        }
    };

    const resetForm = () => {
        setRut('');
        setNombres('');
        setAPaterno('');
        setAMaterno('');
        setIdCargo('');
        setEstado(true);
        setEditingId(null);
        setShowForm(false);
        setRutError('');
    };

    // Filtering and sorting
    const filteredTecnicos = useMemo(() => {
        return tecnicos.filter(tecnico => {
            const matchesSearch =
                tecnico.rut_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tecnico.nombres_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tecnico.a_paterno_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tecnico.a_materno_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tecnico.nombre_cargo?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

            const matchesEstado =
                filterEstado === 'all' ||
                (filterEstado === 'active' && tecnico.estado_21) ||
                (filterEstado === 'inactive' && !tecnico.estado_21);

            return matchesSearch && matchesEstado;
        });
    }, [tecnicos, searchTerm, filterEstado]);

    const sortedTecnicos = useMemo(() => {
        const sorted = [...filteredTecnicos];
        sorted.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredTecnicos, sortConfig]);

    const paginatedTecnicos = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedTecnicos.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedTecnicos, currentPage, itemsPerPage]);

    const handleSort = (key: keyof Tecnico) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleExport = () => {
        const exportData = sortedTecnicos.map(t => ({
            'RUT': t.rut_21,
            'Nombres': t.nombres_21,
            'Apellido Paterno': t.a_paterno_21,
            'Apellido Materno': t.a_materno_21,
            'Cargo': t.nombre_cargo || '',
            'Estado': t.estado_21 ? 'Activo' : 'Inactivo'
        }));
        exportToExcel(exportData, 'tecnicos');
        showToast('Datos exportados exitosamente', 'success');
    };

    if (loading) {
        return <div className="loading">Cargando técnicos...</div>;
    }

    return (
        <div className="tecnicos-container fade-in">
            <div className="tecnicos-header">
                <h2>👷 Gestión de Técnicos</h2>
                <div className="header-actions">
                    <button className="btn-export" onClick={handleExport}>
                        📊 Exportar Excel
                    </button>
                    <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '✕ Cancelar' : '+ Nuevo Técnico'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {showForm && (
                <div className="form-card">
                    <h3>{editingId ? 'Editar Técnico' : 'Nuevo Técnico'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="rut">RUT: *</label>
                                <input
                                    type="text"
                                    id="rut"
                                    className={`form-input ${rutError ? 'input-error' : ''}`}
                                    value={rut}
                                    onChange={(e) => handleRutChange(e.target.value)}
                                    onBlur={handleRutBlur}
                                    placeholder="12.345.678-9"
                                    required
                                />
                                {rutError && <span className="error-text">{rutError}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="nombres">Nombres: *</label>
                                <input
                                    type="text"
                                    id="nombres"
                                    className="form-input"
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="aPaterno">Apellido Paterno: *</label>
                                <input
                                    type="text"
                                    id="aPaterno"
                                    className="form-input"
                                    value={aPaterno}
                                    onChange={(e) => setAPaterno(e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="aMaterno">Apellido Materno: *</label>
                                <input
                                    type="text"
                                    id="aMaterno"
                                    className="form-input"
                                    value={aMaterno}
                                    onChange={(e) => setAMaterno(e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="cargo">Cargo: *</label>
                                <select
                                    id="cargo"
                                    className="form-select"
                                    value={idCargo}
                                    onChange={(e) => setIdCargo(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione un cargo</option>
                                    {cargos.map(cargo => (
                                        <option key={cargo.idcargo_14} value={cargo.idcargo_14}>
                                            {cargo.nombrecargo_14}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="estado">Estado:</label>
                                <select
                                    id="estado"
                                    className="form-select"
                                    value={estado ? 'true' : 'false'}
                                    onChange={(e) => setEstado(e.target.value === 'true')}
                                >
                                    <option value="true">Activo</option>
                                    <option value="false">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-success">
                                {editingId ? '💾 Actualizar' : '+ Crear'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                ✕ Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="search-section">
                <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por RUT, nombre o cargo..." />
                <div className="filter-group">
                    <label>Estado:</label>
                    <select
                        className="filter-select"
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
                <div className="results-info">
                    Mostrando {paginatedTecnicos.length} de {filteredTecnicos.length} técnicos
                </div>
            </div>

            <div className="table-container">
                <table className="tecnicos-table">
                    <thead>
                        <tr>
                            <th 
                                className={`sortable ${sortConfig.key === 'rut_21' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                                onClick={() => handleSort('rut_21')}
                            >
                                RUT
                            </th>
                            <th 
                                className={`sortable ${sortConfig.key === 'nombres_21' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                                onClick={() => handleSort('nombres_21')}
                            >
                                NOMBRES
                            </th>
                            <th 
                                className={`sortable ${sortConfig.key === 'a_paterno_21' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                                onClick={() => handleSort('a_paterno_21')}
                            >
                                APELLIDO PATERNO
                            </th>
                            <th 
                                className={`sortable ${sortConfig.key === 'a_materno_21' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                                onClick={() => handleSort('a_materno_21')}
                            >
                                APELLIDO MATERNO
                            </th>
                            <th>CARGO</th>
                            <th 
                                className={`sortable ${sortConfig.key === 'estado_21' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                                onClick={() => handleSort('estado_21')}
                            >
                                ESTADO
                            </th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTecnicos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="no-data">No se encontraron técnicos</td>
                            </tr>
                        ) : (
                            paginatedTecnicos.map(tecnico => (
                                <tr key={tecnico.id_tecnico_21}>
                                    <td className="tecnico-rut">{tecnico.rut_21}</td>
                                    <td className="tecnico-nombre">{tecnico.nombres_21}</td>
                                    <td>{tecnico.a_paterno_21}</td>
                                    <td>{tecnico.a_materno_21}</td>
                                    <td className="tecnico-cargo">{tecnico.nombre_cargo || 'Sin cargo'}</td>
                                    <td>
                                        <span className={`badge ${tecnico.estado_21 ? 'badge-activo' : 'badge-inactivo'}`}>
                                            {tecnico.estado_21 ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button className="btn-edit" onClick={() => handleEdit(tecnico)} title="Editar">
                                            ✏️
                                        </button>
                                        <button className="btn-delete" onClick={() => handleDelete(tecnico.id_tecnico_21)} title="Eliminar">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredTecnicos.length / itemsPerPage)}
                totalItems={filteredTecnicos.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default TecnicoView;
