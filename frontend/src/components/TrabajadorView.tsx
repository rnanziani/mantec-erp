import React, { useState, useEffect, useMemo } from 'react';
import './TecnicoView.css'; // Reutilizamos los mismos estilos
import { useToast } from '../context/ToastContext';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
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
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Form fields
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

  // Features
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nombre_06', direction: 'asc' });
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');

  // Buscador de trabajadores (similar a AsignacionProductosAseoView)
  const [buscarApellido, setBuscarApellido] = useState<string>('');

  const { showToast } = useToast();
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
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTrabajadores(data.data as Trabajador[]);
        setError('');
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
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trabajadorData)
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        showToast(
          editingId ? 'Trabajador actualizado exitosamente' : 'Trabajador creado exitosamente',
          'success'
        );
        resetForm();
        fetchTrabajadores();
      } else {
        showToast(data.error || 'Error al guardar trabajador', 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor', 'error');
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
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este trabajador?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        showToast('Trabajador eliminado exitosamente', 'success');
        fetchTrabajadores();
      } else {
        showToast(data.error || 'Error al eliminar trabajador', 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor', 'error');
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
  };

  // Buscador de trabajadores por apellido (similar a AsignacionProductosAseoView)
  const trabajadoresFiltradosPorApellido = useMemo(() => {
    if (!buscarApellido || buscarApellido.trim() === '') {
      return trabajadores;
    }
    
    const busqueda = buscarApellido.trim();
    const apellidos = busqueda.split(/\s+/);
    
    return trabajadores.filter(t => {
      if (apellidos.length === 1) {
        const apellidoLower = apellidos[0].toLowerCase();
        const coincidePaterno = t.apaterno_06 && t.apaterno_06.toLowerCase().includes(apellidoLower);
        const coincideMaterno = t.amaterno_06 && t.amaterno_06.toLowerCase().includes(apellidoLower);
        const coincideNombre = t.nombre_06 && t.nombre_06.toLowerCase().includes(apellidoLower);
        
        return coincidePaterno || coincideMaterno || coincideNombre;
      } else {
        const primerApellidoLower = apellidos[0].toLowerCase();
        const segundoApellidoLower = apellidos[1].toLowerCase();
        
        const coincidePaterno = t.apaterno_06 && t.apaterno_06.toLowerCase().includes(primerApellidoLower);
        const coincideMaterno = t.amaterno_06 && t.amaterno_06.toLowerCase().includes(segundoApellidoLower);
        
        return coincidePaterno && coincideMaterno;
      }
    });
  }, [trabajadores, buscarApellido]);

  // Filtering and sorting
  const filteredTrabajadores = useMemo(() => {
    return trabajadoresFiltradosPorApellido.filter(trabajador => {
      // Filtro de búsqueda general
      const matchesSearch = searchTerm.trim() === '' ||
        trabajador.ruttrabajador_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajador.nombre_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajador.apaterno_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajador.amaterno_06?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trabajador.nombre_cargo?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (trabajador.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      // Filtro por estado
      const matchesEstado =
        filterEstado === 'all' ||
        (filterEstado === 'active' && trabajador.estado_06 === true) ||
        (filterEstado === 'inactive' && trabajador.estado_06 === false);

      // Filtro por cargo - comparar como string
      const matchesCargo =
        filterCargo === 'all' ||
        (trabajador.idcargo_06 !== null && trabajador.idcargo_06 !== undefined && 
         String(trabajador.idcargo_06) === filterCargo);

      // Filtro por empresa - comparar como string
      const matchesEmpresa =
        filterEmpresa === 'all' ||
        (trabajador.idempresa_06 !== null && trabajador.idempresa_06 !== undefined && 
         String(trabajador.idempresa_06) === filterEmpresa);

      return matchesSearch && matchesEstado && matchesCargo && matchesEmpresa;
    });
  }, [trabajadoresFiltradosPorApellido, searchTerm, filterEstado, filterCargo, filterEmpresa]);

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

  const paginatedTrabajadores = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTrabajadores.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTrabajadores, currentPage, itemsPerPage]);

  const handleSort = (key: keyof Trabajador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExport = () => {
    const exportData = sortedTrabajadores.map(t => ({
      'RUT': t.ruttrabajador_06,
      'Nombre': t.nombre_06,
      'Apellido Paterno': t.apaterno_06,
      'Apellido Materno': t.amaterno_06,
      'Cargo': t.nombre_cargo || '',
      'Empresa': t.nombre_empresa || '',
      'Estado': t.estado_06 ? 'Activo' : 'Inactivo'
    }));
    exportToExcel(exportData, 'trabajadores');
    showToast('Datos exportados exitosamente', 'success');
  };

  if (loading) {
    return <div className="loading">Cargando trabajadores...</div>;
  }

  return (
    <div className="tecnicos-container fade-in">
      <div className="tecnicos-header">
        <h2>👥 Gestión de Trabajadores</h2>
        <div className="header-actions">
          <button className="btn-export" onClick={handleExport}>
            📊 Exportar Excel
          </button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Nuevo Trabajador'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="empresa">Empresa: *</label>
                <select
                  id="empresa"
                  className="form-select"
                  value={idEmpresa}
                  onChange={(e) => setIdEmpresa(e.target.value)}
                  required
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
                />
                {rutError && <span className="error-text">{rutError}</span>}
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
            </div>

            <div className="form-row">
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
                      {cargo.nombrecargo_14 || cargo.cargo_14}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="estado">Estado:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="estado"
                    checked={estado}
                    onChange={(e) => setEstado(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="estado" style={{ margin: 0, cursor: 'pointer' }}>
                    Activo
                  </label>
                </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Buscar por Nombre o Apellido:
            </label>
            <input
              type="text"
              value={buscarApellido}
              onChange={(e) => setBuscarApellido(e.target.value.toUpperCase())}
              placeholder="Ej: GONZALEZ o GONZALEZ PEREZ"
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ced4da',
                textTransform: 'uppercase'
              }}
            />
          </div>
          <div>
            <SearchBar 
              value={searchTerm} 
              onChange={setSearchTerm} 
              placeholder="Buscar por RUT, nombre, cargo o empresa..." 
            />
          </div>
        </div>
        
        <div className="filter-group" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label>Estado:</label>
            <select
              className="filter-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>
          <div>
            <label>Filtrar por Cargo:</label>
            <select
              className="filter-select"
              value={filterCargo}
              onChange={(e) => setFilterCargo(e.target.value)}
            >
              <option value="all">Todos los cargos</option>
              {cargos.map(cargo => (
                <option key={cargo.idcargo_14} value={String(cargo.idcargo_14)}>
                  {cargo.nombrecargo_14 || cargo.cargo_14}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Filtrar por Empresa:</label>
            <select
              className="filter-select"
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(empresa => (
                <option key={empresa.idempresa_15} value={String(empresa.idempresa_15)}>
                  {empresa.nombreempresa_15}
                </option>
              ))}
            </select>
          </div>
          <div className="results-info">
            Mostrando {paginatedTrabajadores.length} de {filteredTrabajadores.length} trabajadores
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="tecnicos-table">
          <thead>
            <tr>
              <th 
                className={`sortable ${sortConfig.key === 'ruttrabajador_06' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                onClick={() => handleSort('ruttrabajador_06')}
              >
                RUT
              </th>
              <th 
                className={`sortable ${sortConfig.key === 'nombre_06' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                onClick={() => handleSort('nombre_06')}
              >
                NOMBRES
              </th>
              <th 
                className={`sortable ${sortConfig.key === 'apaterno_06' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                onClick={() => handleSort('apaterno_06')}
              >
                APELLIDO PATERNO
              </th>
              <th 
                className={`sortable ${sortConfig.key === 'amaterno_06' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                onClick={() => handleSort('amaterno_06')}
              >
                APELLIDO MATERNO
              </th>
              <th>CARGO</th>
              <th>ESTADO</th>
              <th 
                className={`sortable ${sortConfig.key === 'estado_06' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                onClick={() => handleSort('estado_06')}
              >
                ESTADO
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrabajadores.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-data">No se encontraron trabajadores</td>
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
                      {trabajador.estado_06 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(trabajador)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(trabajador.idtrabajador_06)} title="Eliminar">
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
        totalPages={Math.ceil(filteredTrabajadores.length / itemsPerPage)}
        totalItems={filteredTrabajadores.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default TrabajadorView;

