import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './TecnicoView.css';
import './TrabajadorView.css';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import { exportToExcel } from '../utils/exportUtils';
import { validateRut, formatRut } from '../utils/rutValidator';

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06: string;
  nombre_06: string;
  apaterno_06: string;
  amaterno_06: string;
  estado_06: boolean;
  idcargo_06?: number;
  nombre_cargo?: string;
  idempresa_06?: number;
  nombre_empresa?: string;
}

interface Cargo {
  idcargo_14: number;
  cargo_14: string;
  nombrecargo_14?: string;
}

interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

interface ApiResponse {
  success: boolean;
  data?: Trabajador[] | Trabajador | Cargo[] | Empresa[];
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Trabajador;
  direction: 'asc' | 'desc';
};

const TrabajadorView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [rut, setRut] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [aPaterno, setAPaterno] = useState<string>('');
  const [aMaterno, setAMaterno] = useState<string>('');
  const [idCargo, setIdCargo] = useState<string>('');
  const [idEmpresa, setIdEmpresa] = useState<string>('');
  const [estado, setEstado] = useState<boolean>(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [rutError, setRutError] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nombre_06', direction: 'asc' });
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [modoBusquedaNombre, setModoBusquedaNombre] = useState<'apellido' | 'nombre'>('apellido');
  const [buscarApellido, setBuscarApellido] = useState<string>('');

  const API_URL = 'http://localhost:3001/api/trabajadores';
  const CARGOS_URL = 'http://localhost:3001/api/cargos';
  const EMPRESAS_URL = 'http://localhost:3001/api/empresas';

  useEffect(() => {
    fetchTrabajadores();
    fetchCargos();
    fetchEmpresas();
  }, []);

  const fetchTrabajadores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTrabajadores(data.data as Trabajador[]);
      } else {
        setError(data.error || 'Error al cargar trabajadores');
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

  const fetchEmpresas = async () => {
    try {
      const response = await fetch(EMPRESAS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setEmpresas(data.data as Empresa[]);
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err);
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

    const trabajadorData = {
      ruttrabajador_06: formatRut(rut),
      nombre_06: nombre.trim(),
      apaterno_06: aPaterno.trim(),
      amaterno_06: aMaterno.trim(),
      idcargo_06: parseInt(idCargo),
      idempresa_06: parseInt(idEmpresa),
      estado_06: estado
    };

    try {
      setError('');
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trabajadorData)
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTrabajadores();
        resetForm();
        await showSuccess(
          editingId ? '¡Trabajador actualizado!' : '¡Trabajador creado!',
          editingId ? 'El trabajador ha sido actualizado correctamente.' : 'El trabajador ha sido registrado correctamente.'
        );
      } else {
        await showError('Error al guardar', data.error || 'No se pudo guardar el trabajador');
        setError(data.error || '');
      }
    } catch (err) {
      await showError('Error', 'Error de conexión con el servidor');
      setError('Error de conexión');
      console.error(err);
    }
  };

  const handleEdit = (trabajador: Trabajador) => {
    setRut(trabajador.ruttrabajador_06);
    setNombre(trabajador.nombre_06);
    setAPaterno(trabajador.apaterno_06 || '');
    setAMaterno(trabajador.amaterno_06 || '');
    setIdCargo(trabajador.idcargo_06?.toString() || '');
    setIdEmpresa(trabajador.idempresa_06?.toString() || '');
    setEstado(trabajador.estado_06);
    setEditingId(trabajador.idtrabajador_06);
    setShowForm(true);
    setRutError('');
    setError('');
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este trabajador');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchTrabajadores();
        await showSuccess('¡Trabajador eliminado!', 'El trabajador ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'No se pudo eliminar el trabajador');
      }
    } catch (err) {
      await showError('Error', 'Error de conexión con el servidor');
      console.error(err);
    }
  };

  const resetForm = () => {
    setRut('');
    setNombre('');
    setAPaterno('');
    setAMaterno('');
    setIdCargo('');
    setIdEmpresa('');
    setEstado(true);
    setEditingId(null);
    setShowForm(false);
    setRutError('');
    setBuscarApellido('');
    setModoBusquedaNombre('apellido');
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
  };

  const trabajadoresFiltradosPorNombreOApellido = useMemo(() => {
    if (!buscarApellido || buscarApellido.trim() === '') {
      return trabajadores;
    }
    const busqueda = buscarApellido.trim();
    const termino = busqueda.toLowerCase();

    if (modoBusquedaNombre === 'nombre') {
      return trabajadores.filter(t =>
        t.nombre_06 != null && t.nombre_06.toLowerCase().startsWith(termino)
      );
    }

    const apellidos = busqueda.split(/\s+/).map(a => a.toLowerCase());
    if (apellidos.length === 1) {
      const word = apellidos[0];
      const paternoMatch = trabajadores.filter(t =>
        t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(word)
      );
      const maternoMatch = trabajadores.filter(t =>
        t.amaterno_06 != null && t.amaterno_06.toLowerCase().startsWith(word) &&
        !paternoMatch.some(p => p.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paternoMatch, ...maternoMatch];
    }
    const [primer, segundo] = apellidos;
    return trabajadores
      .filter(t =>
        t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(primer) &&
        t.amaterno_06 != null && t.amaterno_06.toLowerCase().startsWith(segundo)
      )
      .sort((a, b) => {
        const cmpP = (a.apaterno_06 || '').localeCompare(b.apaterno_06 || '');
        return cmpP !== 0 ? cmpP : (a.amaterno_06 || '').localeCompare(b.amaterno_06 || '');
      });
  }, [trabajadores, buscarApellido, modoBusquedaNombre]);

  const filteredTrabajadores = useMemo(() => {
    return trabajadoresFiltradosPorNombreOApellido.filter(trabajador => {
      const matchesSearch = searchTerm.trim() === '' ||
        trabajador.ruttrabajador_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajador.nombre_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajador.apaterno_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajador.amaterno_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trabajador.nombre_cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (trabajador.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesEstado =
        filterEstado === 'all' ||
        (filterEstado === 'active' && trabajador.estado_06 === true) ||
        (filterEstado === 'inactive' && trabajador.estado_06 === false);

      const matchesCargo =
        filterCargo === 'all' ||
        (trabajador.idcargo_06 != null && String(trabajador.idcargo_06) === filterCargo);

      const matchesEmpresa =
        filterEmpresa === 'all' ||
        (trabajador.idempresa_06 != null && String(trabajador.idempresa_06) === filterEmpresa);

      return matchesSearch && matchesEstado && matchesCargo && matchesEmpresa;
    });
  }, [trabajadoresFiltradosPorNombreOApellido, searchTerm, filterEstado, filterCargo, filterEmpresa]);

  const sortedTrabajadores = useMemo(() => {
    const sorted = [...filteredTrabajadores];
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
  }, [filteredTrabajadores, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedTrabajadores = sortedTrabajadores.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTrabajadores.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, filterCargo, filterEmpresa, buscarApellido]);

  const handleSort = (key: keyof Trabajador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof Trabajador) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleExport = async () => {
    const exportData = sortedTrabajadores.map(t => ({
      'RUT': t.ruttrabajador_06,
      'Nombre': t.nombre_06,
      'Apellido Paterno': t.apaterno_06,
      'Apellido Materno': t.amaterno_06,
      'Cargo': t.nombre_cargo || '',
      'Empresa': t.nombre_empresa || '',
      'Estado': t.estado_06 ? 'Activo' : 'Inactivo'
    }));
    exportToExcel(exportData, 'trabajadores', 'Trabajadores');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  const getCargoLabel = (cargo: Cargo) => cargo.nombrecargo_14 || cargo.cargo_14 || '';

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>👥 Gestión de Trabajadores</h2>
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
          <h3>{editingId ? '✏️ Editar Trabajador' : '➕ Nuevo Trabajador'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end' }}>
              <div className="form-group">
                <label htmlFor="empresa">Empresa: *</label>
                <select
                  id="empresa"
                  className="form-input"
                  value={idEmpresa}
                  onChange={(e) => setIdEmpresa(e.target.value)}
                  required
                  aria-label="Seleccionar empresa"
                >
                  <option value="">Seleccione una empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.idempresa_15} value={empresa.idempresa_15}>
                      {empresa.nombreempresa_15}
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="form-group checkbox-group">
                <label htmlFor="estado" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="estado"
                    checked={estado}
                    onChange={(e) => setEstado(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    aria-label="Estado activo"
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre: *</label>
                <input
                  type="text"
                  id="nombre"
                  className="form-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
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
                <label htmlFor="aMaterno">Apellido Materno:</label>
                <input
                  type="text"
                  id="aMaterno"
                  className="form-input"
                  value={aMaterno}
                  onChange={(e) => setAMaterno(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                />
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
            Mostrando {paginatedTrabajadores.length} de {sortedTrabajadores.length} registros
          </div>
        </div>

        <div className="trabajador-search-grid">
          <div className="trabajador-search-block">
            <div className="search-mode-toggles">
              <span style={{ fontWeight: 600, marginRight: '8px' }}>Buscar por:</span>
              <button
                type="button"
                onClick={() => setModoBusquedaNombre('apellido')}
                className={`search-mode-btn ${modoBusquedaNombre === 'apellido' ? 'active' : ''}`}
                aria-pressed={modoBusquedaNombre === 'apellido'}
                aria-label="Buscar por apellido"
              >
                Apellido
              </button>
              <button
                type="button"
                onClick={() => setModoBusquedaNombre('nombre')}
                className={`search-mode-btn ${modoBusquedaNombre === 'nombre' ? 'active' : ''}`}
                aria-pressed={modoBusquedaNombre === 'nombre'}
                aria-label="Buscar por nombre"
              >
                Nombre
              </button>
            </div>
            <label htmlFor="buscar-apellido" className="search-label">
              {modoBusquedaNombre === 'apellido' ? 'Buscar por Apellido:' : 'Buscar por Nombre:'}
            </label>
            <input
              id="buscar-apellido"
              type="text"
              value={buscarApellido}
              onChange={(e) => setBuscarApellido(e.target.value.toUpperCase())}
              placeholder={
                modoBusquedaNombre === 'apellido'
                  ? 'Ej: GONZALEZ o GONZALEZ PEREZ'
                  : 'Ej: JUAN o JUAN PABLO'
              }
              className="search-input"
              style={{ textTransform: 'uppercase' }}
              aria-label={modoBusquedaNombre === 'apellido' ? 'Buscar por apellido' : 'Buscar por nombre'}
            />
          </div>
          <div className="trabajador-search-block">
            <label htmlFor="search-general" className="search-label">Búsqueda general:</label>
            <input
              id="search-general"
              type="text"
              placeholder="🔍 Buscar por RUT, nombre, cargo o empresa..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
              aria-label="Buscar trabajador"
            />
          </div>
        </div>

        <div className="trabajador-filters">
          <div className="filter-item">
            <label htmlFor="filter-estado">Estado:</label>
            <select
              id="filter-estado"
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>
          <div className="filter-item">
            <label htmlFor="filter-cargo">Filtrar por Cargo:</label>
            <select
              id="filter-cargo"
              value={filterCargo}
              onChange={(e) => {
                setFilterCargo(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
              aria-label="Filtrar por cargo"
            >
              <option value="all">Todos los cargos</option>
              {cargos.map(cargo => (
                <option key={cargo.idcargo_14} value={String(cargo.idcargo_14)}>
                  {getCargoLabel(cargo)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label htmlFor="filter-empresa">Filtrar por Empresa:</label>
            <select
              id="filter-empresa"
              value={filterEmpresa}
              onChange={(e) => {
                setFilterEmpresa(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
              aria-label="Filtrar por empresa"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(empresa => (
                <option key={empresa.idempresa_15} value={String(empresa.idempresa_15)}>
                  {empresa.nombreempresa_15}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container trabajador-table-container">
        <table className="data-table trabajador-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('ruttrabajador_06')} className="sortable" style={{ cursor: 'pointer' }}>
                RUT {getSortIndicator('ruttrabajador_06')}
              </th>
              <th onClick={() => handleSort('nombre_06')} className="sortable" style={{ cursor: 'pointer' }}>
                NOMBRES {getSortIndicator('nombre_06')}
              </th>
              <th onClick={() => handleSort('apaterno_06')} className="sortable" style={{ cursor: 'pointer' }}>
                APELLIDO PATERNO {getSortIndicator('apaterno_06')}
              </th>
              <th onClick={() => handleSort('amaterno_06')} className="sortable" style={{ cursor: 'pointer' }}>
                APELLIDO MATERNO {getSortIndicator('amaterno_06')}
              </th>
              <th>CARGO</th>
              <th>EMPRESA</th>
              <th onClick={() => handleSort('estado_06')} className="sortable" style={{ cursor: 'pointer' }}>
                ESTADO {getSortIndicator('estado_06')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && trabajadores.length === 0 ? (
              <tr><td colSpan={9}>Cargando...</td></tr>
            ) : paginatedTrabajadores.length === 0 ? (
              <tr>
                <td colSpan={9} className="no-data">
                  {searchTerm || filterEstado !== 'all' || filterCargo !== 'all' || filterEmpresa !== 'all' || buscarApellido
                    ? '📋 No se encontraron trabajadores con los filtros aplicados'
                    : '📋 No hay trabajadores registrados'}
                </td>
              </tr>
            ) : (
              paginatedTrabajadores.map(trabajador => (
                <tr key={trabajador.idtrabajador_06}>
                  <td className="tecnico-rut">{trabajador.ruttrabajador_06}</td>
                  <td className="tecnico-nombre">{trabajador.nombre_06}</td>
                  <td>{trabajador.apaterno_06}</td>
                  <td>{trabajador.amaterno_06 || '-'}</td>
                  <td className="tecnico-cargo">{trabajador.nombre_cargo || 'Sin cargo'}</td>
                  <td>{trabajador.nombre_empresa || 'Sin empresa'}</td>
                  <td>
                    <span className={`badge ${trabajador.estado_06 ? 'badge-activo' : 'badge-inactivo'}`}>
                      {trabajador.estado_06 ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(trabajador)} title="Editar" aria-label="Editar trabajador">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(trabajador.idtrabajador_06)} title="Eliminar" aria-label="Eliminar trabajador">
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
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {(() => {
              const maxVisible = 7;
              const pages: (number | 'ellipsis')[] = [];
              if (totalPages <= maxVisible) {
                for (let j = 1; j <= totalPages; j++) pages.push(j);
              } else if (currentPage <= 4) {
                for (let j = 1; j <= 5; j++) pages.push(j);
                pages.push('ellipsis');
                pages.push(totalPages);
              } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('ellipsis');
                for (let j = totalPages - 4; j <= totalPages; j++) pages.push(j);
              } else {
                pages.push(1);
                pages.push('ellipsis');
                for (let j = currentPage - 1; j <= currentPage + 1; j++) pages.push(j);
                pages.push('ellipsis');
                pages.push(totalPages);
              }
              return pages.map((numPagina, idx) =>
                numPagina === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#6c757d' }}>...</span>
                ) : (
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
                )
              );
            })()}
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

export default TrabajadorView;
