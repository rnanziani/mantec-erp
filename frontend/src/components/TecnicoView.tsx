import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './TecnicoView.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
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
  nombrecargo_14?: string;
  cargo_14?: string;
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
  const formRef = React.useRef<HTMLFormElement>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [rut, setRut] = useState<string>('');
  const [nombres, setNombres] = useState<string>('');
  const [aPaterno, setAPaterno] = useState<string>('');
  const [aMaterno, setAMaterno] = useState<string>('');
  const [idCargo, setIdCargo] = useState<string>('');
  const [estado, setEstado] = useState<boolean>(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [rutError, setRutError] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_tecnico_21', direction: 'desc' });
  const [filterEstado, setFilterEstado] = useState<string>('all');

  const API_URL = 'http://localhost:3001/api/tecnicos';
  const CARGOS_URL = 'http://localhost:3001/api/cargos';

  useEffect(() => {
    fetchTecnicos();
    fetchCargos();
  }, []);

  const fetchTecnicos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTecnicos(data.data as Tecnico[]);
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
    }
  };

  const handleRutChange = (value: string) => {
    setRut(value);
    setRutError('');
  };

  const handleRutBlur = () => {
    if (rut.trim()) {
      if (validateRut(rut)) {
        setRut(formatRut(rut));
        setRutError('');
      } else {
        setRutError('RUT inválido');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRut(rut)) {
      setRutError('RUT inválido');
      await showError('Campo requerido', 'Por favor ingrese un RUT válido');
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
      setError('');
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tecnicoData)
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTecnicos();
        resetForm();
        await showSuccess(
          editingId ? '¡Técnico actualizado!' : '¡Técnico creado!',
          editingId ? 'El técnico ha sido actualizado correctamente.' : 'El técnico ha sido registrado correctamente.'
        );
      } else {
        await showError('Error al guardar', data.error || 'Error al guardar técnico');
        setError(data.error || '');
      }
    } catch (err) {
      await showError('Error', 'Error de conexión');
      setError('Error de conexión');
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
    setError('');
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este técnico');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTecnicos();
        await showSuccess('¡Técnico eliminado!', 'El técnico ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar técnico');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar técnico');
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
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
  };

  const filteredTecnicos = useMemo(() => {
    return tecnicos.filter(tecnico => {
      const matchesSearch =
        tecnico.rut_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tecnico.nombres_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tecnico.a_paterno_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tecnico.a_materno_21.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tecnico.nombre_cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedTecnicos = sortedTecnicos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTecnicos.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado]);

  const handleSort = (key: keyof Tecnico) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof Tecnico) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleExport = async () => {
    const exportData = sortedTecnicos.map(t => ({
      'RUT': t.rut_21,
      'Nombres': t.nombres_21,
      'Apellido Paterno': t.a_paterno_21,
      'Apellido Materno': t.a_materno_21,
      'Cargo': t.nombre_cargo || '',
      'Estado': t.estado_21 ? 'Activo' : 'Inactivo'
    }));
    exportToExcel(exportData, 'tecnicos', 'Técnicos');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  const getCargoLabel = (cargo: Cargo) => cargo.nombrecargo_14 || cargo.cargo_14 || '';

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>👷 Gestión de Técnicos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={showCreateForm}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
            type="button"
          >
            💾 Guardar
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📊 Exportar
          </button>
          <button className="btn-secondary" onClick={cancelForm}>
            🚪 Salir
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Editar Técnico' : '➕ Nuevo Técnico'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
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
                  aria-invalid={!!rutError}
                  aria-describedby={rutError ? 'rut-error' : undefined}
                />
                {rutError && <span id="rut-error" className="error-text">{rutError}</span>}
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
                  className="form-input"
                  value={idCargo}
                  onChange={(e) => setIdCargo(e.target.value)}
                  required
                  aria-label="Seleccionar cargo"
                >
                  <option value="">Seleccione un cargo</option>
                  {cargos.map(cargo => (
                    <option key={cargo.idcargo_14} value={cargo.idcargo_14}>
                      {getCargoLabel(cargo)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="estado">Estado:</label>
                <select
                  id="estado"
                  className="form-input"
                  value={estado ? 'true' : 'false'}
                  onChange={(e) => setEstado(e.target.value === 'true')}
                  aria-label="Estado del técnico"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
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

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {paginatedTecnicos.length} de {sortedTecnicos.length} registros
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por RUT, nombre o cargo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ flex: '1', minWidth: '200px', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
            aria-label="Buscar técnico"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-estado" style={{ fontWeight: 500, color: '#495057', whiteSpace: 'nowrap' }}>Estado:</label>
            <select
              id="filter-estado"
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', minWidth: '120px' }}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container tecnico-table-container">
        <table className="data-table tecnico-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('rut_21')} className="sortable" style={{ cursor: 'pointer' }}>
                RUT {getSortIndicator('rut_21')}
              </th>
              <th onClick={() => handleSort('nombres_21')} className="sortable" style={{ cursor: 'pointer' }}>
                NOMBRES {getSortIndicator('nombres_21')}
              </th>
              <th onClick={() => handleSort('a_paterno_21')} className="sortable" style={{ cursor: 'pointer' }}>
                APELLIDO PATERNO {getSortIndicator('a_paterno_21')}
              </th>
              <th onClick={() => handleSort('a_materno_21')} className="sortable" style={{ cursor: 'pointer' }}>
                APELLIDO MATERNO {getSortIndicator('a_materno_21')}
              </th>
              <th>CARGO</th>
              <th onClick={() => handleSort('estado_21')} className="sortable" style={{ cursor: 'pointer' }}>
                ESTADO {getSortIndicator('estado_21')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && tecnicos.length === 0 ? (
              <tr><td colSpan={7}>Cargando...</td></tr>
            ) : paginatedTecnicos.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  {searchTerm || filterEstado !== 'all'
                    ? '📋 No se encontraron técnicos con los filtros aplicados'
                    : '📋 No hay técnicos registrados'}
                </td>
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
                      {tecnico.estado_21 ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(tecnico)} title="Editar" aria-label="Editar técnico">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(tecnico.id_tecnico_21)} title="Eliminar" aria-label="Eliminar técnico">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{ padding: '8px 15px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((numPagina) => (
              <button
                key={numPagina}
                onClick={() => setCurrentPage(numPagina)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: currentPage === numPagina ? '#007bff' : 'white',
                  color: currentPage === numPagina ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontWeight: currentPage === numPagina ? 'bold' : 'normal'
                }}
                aria-label={`Ir a página ${numPagina}`}
                aria-current={currentPage === numPagina ? 'page' : undefined}
              >
                {numPagina}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
            style={{ padding: '8px 15px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
          <div style={{ marginLeft: '15px', color: '#6c757d' }}>
            Página {currentPage} de {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

export default TecnicoView;
