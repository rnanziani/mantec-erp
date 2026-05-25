import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './MarcasAlternador.css';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface MarcaAlternador {
  id_marca_18: number;
  marca_18: string;
}

interface ApiResponse {
  success: boolean;
  data?: MarcaAlternador[] | MarcaAlternador;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof MarcaAlternador;
  direction: 'asc' | 'desc';
};

const MarcasAlternador: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [marcas, setMarcas] = useState<MarcaAlternador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [marcaName, setMarcaName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Nuevas funcionalidades
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_marca_18', direction: 'asc' });

  const API_URL = apiUrl('/marcas');

  useEffect(() => {
    fetchMarcas();
  }, []);

  const fetchMarcas = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data);
      } else {
        setError('Error al cargar las marcas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar datos
  const filteredAndSortedMarcas = useMemo(() => {
    let filtered = marcas.filter(marca =>
      marca.marca_18.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [marcas, searchTerm, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMarcas = filteredAndSortedMarcas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedMarcas.length / itemsPerPage);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof MarcaAlternador) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaName.trim()) {
      await showError('Campo requerido', 'El nombre de la marca es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_18: marcaName.trim() })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMarcas();
        setMarcaName('');
        setShowForm(false);
        await showSuccess('¡Marca creada!', 'La marca ha sido registrada correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear la marca');
      }
    } catch (err) {
      await showError('Error', 'Error al crear la marca');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaName.trim() || editingId === null) {
      await showError('Campo requerido', 'El nombre de la marca es requerido');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marca_18: marcaName.trim() })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMarcas();
        setMarcaName('');
        setEditingId(null);
        setShowForm(false);
        await showSuccess('¡Marca actualizada!', 'La marca ha sido actualizada correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar la marca');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar la marca');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta marca');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchMarcas();
        await showSuccess('¡Marca eliminada!', 'La marca ha sido eliminada correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar la marca');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar la marca');
      console.error('Error:', err);
    }
  };

  const startEdit = (marca: MarcaAlternador) => {
    setEditingId(marca.id_marca_18);
    setMarcaName(marca.marca_18);
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setMarcaName('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const showCreateForm = () => {
    setMarcaName('');
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSortedMarcas.map((m) => ({
      ID: m.id_marca_18,
      Marca: m.marca_18
    }));
    exportToExcel(dataToExport, 'marcas-alternadores', 'Marcas');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  const getSortIndicator = (key: keyof MarcaAlternador) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🏷️ Marca Alternadores</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => { cancelForm(); setShowForm(true); setError(''); }}
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
          <h3>{editingId ? '✏️ Editar Marca' : '➕ Nueva Marca'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label htmlFor="marca">Nombre de la Marca:</label>
              <input
                type="text"
                id="marca"
                className="form-input"
                value={marcaName}
                onChange={(e) => setMarcaName(e.target.value.toUpperCase())}
                placeholder="Ej: Scania, Volvo, M Benz..."
                style={{ textTransform: 'uppercase' }}
                required
                autoFocus
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

      {/* Buscador y tabla */}
      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#6c757d', fontSize: '14px' }}>
            Mostrando {currentMarcas.length} de {filteredAndSortedMarcas.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar marca..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value.toUpperCase());
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', textTransform: 'uppercase' }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_marca_18')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_marca_18')}
              </th>
              <th onClick={() => handleSort('marca_18')} className="sortable" style={{ cursor: 'pointer' }}>
                MARCA {getSortIndicator('marca_18')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && marcas.length === 0 ? (
              <tr><td colSpan={3}>Cargando...</td></tr>
            ) : currentMarcas.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron marcas con "${searchTerm}"`
                    : '📋 No hay marcas registradas'}
                </td>
              </tr>
            ) : (
              currentMarcas.map((marca) => (
                <tr key={marca.id_marca_18}>
                  <td>{marca.id_marca_18}</td>
                  <td className="marca-name">{marca.marca_18}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(marca)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(marca.id_marca_18)} title="Eliminar">
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

export default MarcasAlternador;
