import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import './MarcaNeumaticoView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';

interface MarcaNeumatico {
  id_marca_32: number;
  marca_32: string;
  diametro_32: number;
  estado_32: boolean;
  fecha_creacion_32?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof MarcaNeumatico;

const MarcaNeumaticoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<MarcaNeumatico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [marca, setMarca] = useState<string>('');
  const [diametro, setDiametro] = useState<string>('');
  const [estado, setEstado] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'id_marca_32',
    direction: 'asc'
  });

  const API_URL = 'http://localhost:3001/api/marcas-neumatico';

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<MarcaNeumatico[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        setError('Error al cargar las marcas de neumáticos');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const st = searchTerm.toLowerCase();
    const list = items.filter((i) => {
      const marcaMatch = i.marca_32.toLowerCase().includes(st);
      const diametroMatch = String(i.diametro_32).includes(st);
      return marcaMatch || diametroMatch;
    });
    list.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const diametroNum = parseInt(diametro, 10);
    if (!marca.trim()) {
      await showError('Campo requerido', 'El nombre de la marca es requerido');
      return;
    }
    if (isNaN(diametroNum) || diametroNum < 0) {
      await showError('Campo requerido', 'El diámetro debe ser un número positivo');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_32: marca.trim().toUpperCase(), diametro_32: diametroNum, estado_32: estado })
      });
      const data: ApiResponse<MarcaNeumatico> = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('¡Marca creada!', 'La marca de neumático ha sido registrada correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear marca de neumático');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al crear marca de neumático');
      setError('Error de conexión');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const diametroNum = parseInt(diametro, 10);
    if (!marca.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre de la marca es requerido');
      return;
    }
    if (isNaN(diametroNum) || diametroNum < 0) {
      await showError('Campo requerido', 'El diámetro debe ser un número positivo');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_32: marca.trim().toUpperCase(), diametro_32: diametroNum, estado_32: estado })
      });
      const data: ApiResponse<MarcaNeumatico> = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('¡Marca actualizada!', 'La marca de neumático ha sido actualizada correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar marca de neumático');
        setError(data.error || '');
      }
    } catch {
      await showError('Error', 'Error al actualizar marca de neumático');
      setError('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta marca de neumático');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('¡Marca eliminada!', 'La marca de neumático ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar marca de neumático');
      }
    } catch {
      await showError('Error', 'Error al eliminar marca de neumático');
    }
  };

  const startEdit = (m: MarcaNeumatico) => {
    setEditingId(m.id_marca_32);
    setMarca(m.marca_32);
    setDiametro(String(m.diametro_32));
    setEstado(m.estado_32 !== false);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setMarca('');
    setDiametro('');
    setEstado(true);
    setEditingId(null);
    setShowForm(false);
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
    const dataToExport = filteredAndSorted.map((m) => ({
      ID: m.id_marca_32,
      Marca: m.marca_32,
      Diametro: m.diametro_32,
      Estado: m.estado_32 !== false ? 'Activo' : 'Inactivo',
      FechaCreacion: m.fecha_creacion_32 ? new Date(m.fecha_creacion_32).toLocaleString('es-CL') : '-'
    }));
    exportToExcel(dataToExport, 'marcas-neumatico', 'MarcasNeumatico');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🛞 Gestión de Marcas de Neumáticos</h2>
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
          <h3>{editingId ? '✏️ Editar Marca de Neumático' : '➕ Nueva Marca de Neumático'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="marca">Marca: *</label>
                <input
                  type="text"
                  id="marca"
                  className="form-input"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value.toUpperCase())}
                  placeholder="Ej: MICHELIN, BRIDGESTONE..."
                  style={{ textTransform: 'uppercase' }}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="diametro">Diámetro (pulgadas): *</label>
                <input
                  type="number"
                  id="diametro"
                  className="form-input"
                  value={diametro}
                  onChange={(e) => setDiametro(e.target.value)}
                  placeholder="Ej: 17, 18, 19..."
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={estado}
                  onChange={(e) => setEstado(e.target.checked)}
                  aria-label="Marca activa"
                />
                Activo
              </label>
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
            Mostrando {currentItems.length} de {filteredAndSorted.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por marca o diámetro..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar marca de neumático"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_marca_32')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_marca_32')}
              </th>
              <th onClick={() => handleSort('marca_32')} className="sortable" style={{ cursor: 'pointer' }}>
                MARCA {getSortIndicator('marca_32')}
              </th>
              <th onClick={() => handleSort('diametro_32')} className="sortable" style={{ cursor: 'pointer' }}>
                DIÁMETRO {getSortIndicator('diametro_32')}
              </th>
              <th onClick={() => handleSort('estado_32')} className="sortable" style={{ cursor: 'pointer' }}>
                ESTADO {getSortIndicator('estado_32')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr><td colSpan={5}>Cargando...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron marcas con "${searchTerm}"`
                    : '📋 No hay marcas de neumáticos registradas'}
                </td>
              </tr>
            ) : (
              currentItems.map((m) => (
                <tr key={m.id_marca_32}>
                  <td>{m.id_marca_32}</td>
                  <td className="marca-neumatico-name">{m.marca_32}</td>
                  <td>{m.diametro_32}"</td>
                  <td>
                    <span className={`badge ${m.estado_32 !== false ? 'badge-success' : 'badge-danger'}`}>
                      {m.estado_32 !== false ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(m)} title="Editar" aria-label="Editar marca de neumático">
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(m.id_marca_32)}
                      title="Eliminar"
                      aria-label="Eliminar marca de neumático"
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
    </div>
  );
};

export default MarcaNeumaticoView;
