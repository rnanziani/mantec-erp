import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './NeumaticoView.css';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { apiUrl } from '../lib/apiClient';

interface Neumatico {
  id_neumatico_31: number;
  cod_neumatico_31: string;
  id_marca_31: number;
  fecha_ingreso_31?: string;
  observaciones_31?: string;
  marca_32?: string;
}

interface MarcaNeumatico {
  id_marca_32: number;
  marca_32: string;
  diametro_32: number;
  estado_32: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: Neumatico[] | Neumatico | MarcaNeumatico[];
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Neumatico;
  direction: 'asc' | 'desc';
};

const NeumaticoView: React.FC = () => {
  const [neumaticos, setNeumaticos] = useState<Neumatico[]>([]);
  const [marcas, setMarcas] = useState<MarcaNeumatico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedMarca, setSelectedMarca] = useState<number>(0);
  const [fechaIngreso, setFechaIngreso] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMarca, setFilterMarca] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_neumatico_31', direction: 'asc' });

  const API_URL = apiUrl('/neumaticos');
  const MARCAS_URL = apiUrl('/marcas-neumatico?activo=true');

  useEffect(() => {
    fetchNeumaticos();
    fetchMarcas();
  }, []);

  const fetchNeumaticos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setNeumaticos(data.data as Neumatico[]);
      } else {
        setError('Error al cargar los neumáticos');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcas = async () => {
    try {
      const response = await fetch(MARCAS_URL);
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data as MarcaNeumatico[]);
      }
    } catch (err) {
      console.error('Error al cargar marcas:', err);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = neumaticos.filter((n) => {
      const matchesSearch =
        n.cod_neumatico_31?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.marca_32?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.observaciones_31?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMarca = filterMarca === 0 || n.id_marca_31 === filterMarca;
      return matchesSearch && matchesMarca;
    });
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [neumaticos, searchTerm, filterMarca, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMarca]);

  const handleSort = (key: keyof Neumatico) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarca || selectedMarca === 0) {
      await showError('Validación', 'Debe seleccionar una marca');
      return;
    }
    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_marca_31: selectedMarca,
          fecha_ingreso_31: fechaIngreso || undefined,
          observaciones_31: observaciones.trim() || undefined
        })
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        resetForm();
        await showSuccess('¡Éxito!', 'Neumático creado exitosamente');
      } else {
        await showError('Error', data.error || data.message || 'Error al crear el neumático');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el neumático');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarca || selectedMarca === 0 || editingId === null) return;
    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_marca_31: selectedMarca,
          fecha_ingreso_31: fechaIngreso || undefined,
          observaciones_31: observaciones.trim() || undefined
        })
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        resetForm();
        await showSuccess('¡Éxito!', 'Neumático actualizado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al actualizar el neumático');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el neumático');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este neumático');
    if (!confirmed) return;
    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        await showSuccess('¡Éxito!', 'Neumático eliminado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al eliminar el neumático');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el neumático');
      console.error('Error:', err);
    }
  };

  const startEdit = (n: Neumatico) => {
    setEditingId(n.id_neumatico_31);
    setSelectedMarca(n.id_marca_31);
    setFechaIngreso(n.fecha_ingreso_31 ? n.fecha_ingreso_31.split('T')[0] : new Date().toISOString().split('T')[0]);
    setObservaciones(n.observaciones_31 || '');
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setSelectedMarca(0);
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setObservaciones('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => resetForm();

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map((n) => ({
      ID: n.id_neumatico_31,
      Código: n.cod_neumatico_31,
      Marca: n.marca_32 || '',
      'Fecha Ingreso': n.fecha_ingreso_31 ? n.fecha_ingreso_31.split('T')[0] : '-',
      Observaciones: n.observaciones_31 || ''
    }));
    exportToExcel(dataToExport, 'neumaticos', 'Neumaticos');
    await showSuccess('¡Éxito!', 'Datos exportados exitosamente');
  };

  return (
    <div className="bodega-view neumatico-view">
      <header className="view-header">
        <h2>🛞 Gestión de Neumáticos</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button
                type="button"
                className="btn-export"
                onClick={handleExport}
                title="Exportar a Excel"
                aria-label="Exportar neumáticos a Excel"
              >
                📊 Exportar
              </button>
              <button
                type="button"
                className="btn-primary neumatico-btn-new"
                onClick={showCreateForm}
                aria-label="Crear nuevo neumático"
              >
                ➕ Nuevo Neumático
              </button>
            </>
          )}
        </div>
      </header>

      {!showForm && (
        <div className="form-container neumatico-search-section">
          <div className="neumatico-filters-row">
            <div className="neumatico-search-wrap">
              <SearchBar
                placeholder="Buscar por código o marca..."
                value={searchTerm}
                onChange={setSearchTerm}
                ariaLabel="Buscar neumáticos por código o marca"
              />
            </div>
            <div className="neumatico-filter-wrap">
              <label htmlFor="filter-marca" className="neumatico-filter-label">
                Filtrar por Marca:
              </label>
              <select
                id="filter-marca"
                value={filterMarca}
                onChange={(e) => setFilterMarca(parseInt(e.target.value))}
                className="neumatico-filter-select"
                aria-label="Filtrar neumáticos por marca"
              >
                <option value={0}>Todas las marcas</option>
                {marcas.map((m) => (
                  <option key={m.id_marca_32} value={m.id_marca_32}>
                    {m.marca_32} ({m.diametro_32}")
                  </option>
                ))}
              </select>
            </div>
            <div className="neumatico-results-info">
              Mostrando {currentItems.length} de {filteredAndSorted.length} registros
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="neumatico-alert-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container neumatico-form-card">
          <h3>{editingId ? '✏️ Editar Neumático' : '➕ Nuevo Neumático'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="neumatico-form-row-3">
              <div className="form-group">
                <label htmlFor="marca">Marca del Neumático: *</label>
                <select
                  id="marca"
                  className="form-select"
                  value={selectedMarca}
                  onChange={(e) => setSelectedMarca(parseInt(e.target.value))}
                  required
                >
                  <option value="0">-- Seleccione una marca --</option>
                  {marcas.map((m) => (
                    <option key={m.id_marca_32} value={m.id_marca_32}>
                      {m.marca_32} ({m.diametro_32}")
                    </option>
                  ))}
                </select>
                <small className="form-hint">
                  💡 El código del neumático se generará automáticamente
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="fechaIngreso">Fecha de Ingreso:</label>
                <input
                  id="fechaIngreso"
                  type="date"
                  className="form-input"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="observaciones">Observaciones:</label>
                <textarea
                  id="observaciones"
                  className="form-input form-textarea"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Opcional"
                  rows={2}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn-success"
                aria-label={editingId ? 'Guardar cambios del neumático' : 'Crear nuevo neumático'}
              >
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelForm}
                aria-label="Cancelar y cerrar formulario"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ Cargando neumáticos...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table neumatico-table" role="grid" aria-label="Lista de neumáticos">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id_neumatico_31')} className="sortable" scope="col">
                    ID
                  </th>
                  <th onClick={() => handleSort('cod_neumatico_31')} className="sortable" scope="col">
                    CÓDIGO
                  </th>
                  <th onClick={() => handleSort('marca_32')} className="sortable" scope="col">
                    MARCA
                  </th>
                  <th onClick={() => handleSort('fecha_ingreso_31')} className="sortable" scope="col">
                    FECHA INGRESO
                  </th>
                  <th scope="col">OBSERVACIONES</th>
                  <th scope="col">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      {searchTerm || filterMarca
                        ? '📋 No se encontraron neumáticos con los filtros aplicados'
                        : '📋 No hay neumáticos registrados'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((n) => (
                    <tr key={n.id_neumatico_31}>
                      <td>{n.id_neumatico_31}</td>
                      <td className="codigo-neumatico">{n.cod_neumatico_31}</td>
                      <td className="marca-name">{n.marca_32}</td>
                      <td>{n.fecha_ingreso_31 ? n.fecha_ingreso_31.split('T')[0] : '-'}</td>
                      <td className="observaciones-cell">{n.observaciones_31 || '-'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => startEdit(n)}
                          title="Editar neumático"
                          aria-label={`Editar neumático con código ${n.cod_neumatico_31}`}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDelete(n.id_neumatico_31)}
                          title="Eliminar neumático"
                          aria-label={`Eliminar neumático con código ${n.cod_neumatico_31}`}
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

          {filteredAndSorted.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSorted.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default NeumaticoView;
