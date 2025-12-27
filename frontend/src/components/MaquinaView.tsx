import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import Pagination from './shared/Pagination';
import './BodegaView.css';

interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
  estado_11: boolean;
  descripcion_11: string;
  idempresa_11: number;
  nombre_empresa?: string;
}

interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

const MaquinaView: React.FC = () => {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [numinterno, setNuminterno] = useState('');
  const [ppu, setPpu] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idempresa, setIdempresa] = useState<number | ''>('');
  const [estado, setEstado] = useState(true);

  // Estados para búsqueda y ordenamiento
  const [filtro, setFiltro] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Maquina; direction: 'asc' | 'desc' } | null>(null);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const API_URL = 'http://localhost:3001/api/maquinas';
  const EMPRESAS_URL = 'http://localhost:3001/api/empresas';

  useEffect(() => {
    fetchMaquinas();
    fetchEmpresas();
  }, []);

  const fetchMaquinas = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (data.success) {
        setMaquinas(data.data);
      } else {
        await showError('Error', data.error || 'Error al cargar máquinas');
      }
    } catch (error) {
      console.error('Error:', error);
      await showError('Error', 'Error al cargar máquinas');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const response = await fetch(EMPRESAS_URL);
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data);
      }
    } catch (error) {
      console.error('Error al cargar empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numinterno || !ppu || !descripcion || !idempresa) {
      await showError('Validación', 'Todos los campos son requeridos');
      return;
    }

    if (numinterno.length > 4) {
      await showError('Validación', 'El número interno no puede exceder 4 caracteres');
      return;
    }

    setLoading(true);

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numinterno_11: numinterno,
          ppu_11: ppu,
          descripcion_11: descripcion,
          idempresa_11: idempresa,
          estado_11: estado
        })
      });

      const data = await response.json();

      if (data.success) {
        await showSuccess('¡Éxito!', data.message || 'Operación exitosa');
        fetchMaquinas();
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
    const confirmed = await showDeleteConfirm('esta máquina');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await showSuccess('¡Eliminado!', data.message || 'Máquina eliminada exitosamente');
        fetchMaquinas();
      } else {
        await showError('Error', data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error:', error);
      await showError('Error', 'Error al eliminar');
    }
  };

  const handleEdit = (maquina: Maquina) => {
    setEditingId(maquina.idmaquina_11);
    setNuminterno(maquina.numinterno_11);
    setPpu(maquina.ppu_11);
    setDescripcion(maquina.descripcion_11);
    setIdempresa(maquina.idempresa_11);
    setEstado(maquina.estado_11);
    setShowForm(true);
  };

  const resetForm = () => {
    setNuminterno('');
    setPpu('');
    setDescripcion('');
    setIdempresa('');
    setEstado(true);
    setEditingId(null);
    setShowForm(false);
  };

  // Lógica de Ordenamiento
  const handleSort = (key: keyof Maquina) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Maquina) => {
    if (!sortConfig || sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Lógica de Filtrado y Ordenamiento Combinada
  const processedMaquinas = React.useMemo(() => {
    let data = [...maquinas];

    // 1. Filtrar
    if (filtro) {
      const upperFiltro = filtro.toUpperCase();
      data = data.filter(m =>
        m.numinterno_11.toUpperCase().includes(upperFiltro) ||
        m.ppu_11.toUpperCase().includes(upperFiltro) ||
        m.descripcion_11.toUpperCase().includes(upperFiltro) ||
        (m.nombre_empresa && m.nombre_empresa.toUpperCase().includes(upperFiltro)) ||
        m.idmaquina_11.toString().includes(filtro)
      );
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
        return 0;
      });
    }

    return data;
  }, [maquinas, filtro, sortConfig]);

  // Paginación: calcular items a mostrar
  const paginatedMaquinas = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedMaquinas.slice(startIndex, startIndex + itemsPerPage);
  }, [processedMaquinas, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedMaquinas.length / itemsPerPage);

  // Resetear a página 1 cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [filtro]);

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🔧 Gestión de Máquinas</h2>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancelar' : '+ Nueva Máquina'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'Editar Máquina' : 'Nueva Máquina'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Número Interno * (máx. 4 caracteres)</label>
                <input
                  type="text"
                  value={numinterno}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (value.length <= 4) {
                      setNuminterno(value);
                    }
                  }}
                  onKeyPress={(e) => {
                    const char = String.fromCharCode(e.which);
                    if (!/[A-Z0-9]/.test(char)) {
                      e.preventDefault();
                    }
                  }}
                  required
                  placeholder="Ej: 001, A01"
                  maxLength={4}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label>PPU (Patente) *</label>
                <input
                  type="text"
                  value={ppu}
                  onChange={(e) => setPpu(e.target.value.toUpperCase())}
                  required
                  placeholder="Ej: ABCD12"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Descripción *</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                  required
                  placeholder="Ej: MÁQUINA DE LAVADO INDUSTRIAL"
                  maxLength={120}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label>Empresa *</label>
                <select
                  value={idempresa}
                  onChange={(e) => setIdempresa(e.target.value ? parseInt(e.target.value) : '')}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Seleccione una empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.idempresa_15} value={empresa.idempresa_15}>
                      {empresa.nombreempresa_15}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={estado}
                  onChange={(e) => setEstado(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Estado Activo
              </label>
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

      {/* Buscador */}
      <div className="form-container" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por número interno, PPU, descripción o empresa..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value.toUpperCase())}
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '14px', 
            borderRadius: '4px', 
            border: '1px solid #ced4da',
            textTransform: 'uppercase'
          }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('idmaquina_11')} 
                className={`sortable ${sortConfig && sortConfig.key === 'idmaquina_11' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                ID
              </th>
              <th 
                onClick={() => handleSort('numinterno_11')} 
                className={`sortable ${sortConfig && sortConfig.key === 'numinterno_11' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                Número Interno
              </th>
              <th 
                onClick={() => handleSort('ppu_11')} 
                className={`sortable ${sortConfig && sortConfig.key === 'ppu_11' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                PPU
              </th>
              <th 
                onClick={() => handleSort('descripcion_11')} 
                className={`sortable ${sortConfig && sortConfig.key === 'descripcion_11' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                Descripción
              </th>
              <th 
                onClick={() => handleSort('nombre_empresa')} 
                className={`sortable ${sortConfig && sortConfig.key === 'nombre_empresa' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                Empresa
              </th>
              <th 
                onClick={() => handleSort('estado_11')} 
                className={`sortable ${sortConfig && sortConfig.key === 'estado_11' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
              >
                Estado
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && maquinas.length === 0 ? (
              <tr><td colSpan={7}>Cargando...</td></tr>
            ) : paginatedMaquinas.length === 0 ? (
              <tr><td colSpan={7}>No hay máquinas registradas</td></tr>
            ) : (
              paginatedMaquinas.map((maquina) => (
                <tr key={maquina.idmaquina_11}>
                  <td>{maquina.idmaquina_11}</td>
                  <td><strong>{maquina.numinterno_11}</strong></td>
                  <td><strong>{maquina.ppu_11}</strong></td>
                  <td>{maquina.descripcion_11}</td>
                  <td>{maquina.nombre_empresa || <span style={{ color: '#999', fontStyle: 'italic' }}>Sin empresa</span>}</td>
                  <td>
                    <span className={`badge ${maquina.estado_11 ? 'badge-success' : 'badge-danger'}`}>
                      {maquina.estado_11 ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(maquina)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(maquina.idmaquina_11)}
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
      {processedMaquinas.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedMaquinas.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default MaquinaView;















