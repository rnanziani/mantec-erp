import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './EstadoNeumaticoView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface EstadoNeumatico {
  id_estado_33: number;
  estado_33: string;
  descripcion_33?: string;
  activo_33: boolean;
  orden_33: number;
  color_33?: string;
  fecha_creacion_33?: string;
}

interface ApiResponse {
  success: boolean;
  data?: EstadoNeumatico[] | EstadoNeumatico;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof EstadoNeumatico;
  direction: 'asc' | 'desc';
};

const EstadoNeumaticoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [estados, setEstados] = useState<EstadoNeumatico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [estadoName, setEstadoName] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [activo, setActivo] = useState<boolean>(true);
  const [orden, setOrden] = useState<string>('0');
  const [color, setColor] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'orden_33', direction: 'asc' });

  const API_URL = apiUrl('/estados-neumatico');

  useEffect(() => {
    fetchEstados();
  }, []);

  const fetchEstados = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setEstados(data.data);
      } else {
        setError('Error al cargar los estados de neumático');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedEstados = useMemo(() => {
    const st = searchTerm.toLowerCase();
    let filtered = estados.filter(estado =>
      estado.estado_33.toLowerCase().includes(st) ||
      (estado.descripcion_33 && estado.descripcion_33.toLowerCase().includes(st)) ||
      (estado.color_33 && estado.color_33.toLowerCase().includes(st))
    );

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [estados, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEstados = filteredAndSortedEstados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedEstados.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof EstadoNeumatico) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof EstadoNeumatico) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const resetForm = () => {
    setEstadoName('');
    setDescripcion('');
    setActivo(true);
    setOrden('0');
    setColor('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoName.trim()) {
      await showError('Campo requerido', 'El nombre del estado es requerido');
      return;
    }

    const ordenNum = parseInt(orden, 10);
    if (isNaN(ordenNum) || ordenNum < 0) {
      await showError('Campo inválido', 'El orden debe ser un número mayor o igual a 0');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_33: estadoName.trim().toUpperCase(),
          descripcion_33: descripcion.trim() || undefined,
          activo_33: activo,
          orden_33: ordenNum,
          color_33: color.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        resetForm();
        await showSuccess('¡Estado creado!', 'El estado de neumático ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear el estado');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el estado');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoName.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre del estado es requerido');
      return;
    }

    const ordenNum = parseInt(orden, 10);
    if (isNaN(ordenNum) || ordenNum < 0) {
      await showError('Campo inválido', 'El orden debe ser un número mayor o igual a 0');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_33: estadoName.trim().toUpperCase(),
          descripcion_33: descripcion.trim() || undefined,
          activo_33: activo,
          orden_33: ordenNum,
          color_33: color.trim() || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        resetForm();
        await showSuccess('¡Estado actualizado!', 'El estado de neumático ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar el estado');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el estado');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este estado');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchEstados();
        await showSuccess('¡Estado eliminado!', 'El estado ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el estado');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el estado');
      console.error('Error:', err);
    }
  };

  const startEdit = (estado: EstadoNeumatico) => {
    setEditingId(estado.id_estado_33);
    setEstadoName(estado.estado_33);
    setDescripcion(estado.descripcion_33 || '');
    setActivo(estado.activo_33 !== false);
    setOrden(String(estado.orden_33 ?? 0));
    setColor(estado.color_33 || '');
    setShowForm(true);
    setError('');
  };

  const showCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedEstados.map((e) => ({
      ID: e.id_estado_33,
      Estado: e.estado_33,
      Descripción: e.descripcion_33 || '',
      Activo: e.activo_33 ? 'Sí' : 'No',
      Orden: e.orden_33,
      Color: e.color_33 || ''
    }));
    exportToExcel(dataToExport, 'estados-neumatico', 'Estados de Neumático');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🛞 Gestión de Estados de Neumático</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          <h3>{editingId ? '✏️ Editar Estado' : '➕ Nuevo Estado'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row form-row-4">
              <div className="form-group">
                <label htmlFor="estado">Nombre del Estado: *</label>
                <input
                  type="text"
                  id="estado"
                  className="form-input"
                  value={estadoName}
                  onChange={(e) => setEstadoName(e.target.value.toUpperCase())}
                  placeholder="Ej: Nuevo, En Uso, Desgastado..."
                  required
                  autoFocus
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="orden">Orden:</label>
                <input
                  type="number"
                  id="orden"
                  className="form-input"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="color">Color (hex o nombre):</label>
                <input
                  type="text"
                  id="color"
                  className="form-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  placeholder="Ej: #28A745, VERDE"
                  maxLength={20}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group checkbox-group">
                <label htmlFor="activo" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="activo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    aria-label="Estado activo"
                  />
                  Activo
                </label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="descripcion">Descripción:</label>
              <textarea
                id="descripcion"
                className="form-input"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                placeholder="Descripción opcional del estado..."
                rows={3}
                style={{ resize: 'vertical', textTransform: 'uppercase' }}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingId ? '💾 Actualizar' : '➕ Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentEstados.length} de {filteredAndSortedEstados.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar estado, descripción o color..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar estado de neumático"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_estado_33')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_estado_33')}
              </th>
              <th onClick={() => handleSort('estado_33')} className="sortable" style={{ cursor: 'pointer' }}>
                ESTADO {getSortIndicator('estado_33')}
              </th>
              <th onClick={() => handleSort('descripcion_33')} className="sortable" style={{ cursor: 'pointer' }}>
                DESCRIPCIÓN {getSortIndicator('descripcion_33')}
              </th>
              <th onClick={() => handleSort('orden_33')} className="sortable" style={{ cursor: 'pointer' }}>
                ORDEN {getSortIndicator('orden_33')}
              </th>
              <th onClick={() => handleSort('activo_33')} className="sortable" style={{ cursor: 'pointer' }}>
                ACTIVO {getSortIndicator('activo_33')}
              </th>
              <th onClick={() => handleSort('color_33')} className="sortable" style={{ cursor: 'pointer' }}>
                COLOR {getSortIndicator('color_33')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && estados.length === 0 ? (
              <tr><td colSpan={7}>Cargando...</td></tr>
            ) : currentEstados.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron estados con "${searchTerm}"`
                    : '📋 No hay estados registrados'}
                </td>
              </tr>
            ) : (
              currentEstados.map((estado) => (
                <tr key={estado.id_estado_33}>
                  <td>{estado.id_estado_33}</td>
                  <td className="estado-name">{estado.estado_33}</td>
                  <td className="estado-descripcion">{estado.descripcion_33 || '-'}</td>
                  <td>{estado.orden_33}</td>
                  <td>{estado.activo_33 ? '✓' : '✗'}</td>
                  <td>
                    {estado.color_33 ? (
                      <span
                        className="estado-color-badge"
                        style={{
                          backgroundColor: estado.color_33.startsWith('#') ? estado.color_33 : undefined,
                          color: estado.color_33.startsWith('#') ? '#fff' : undefined
                        }}
                        title={estado.color_33}
                      >
                        {estado.color_33}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(estado)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(estado.id_estado_33)} title="Eliminar">
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
        totalPages={totalPages}
        totalItems={filteredAndSortedEstados.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default EstadoNeumaticoView;
