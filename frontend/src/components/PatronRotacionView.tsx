import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './PatronRotacionView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';

interface PatronRotacion {
  id_patron_35: number;
  codigo_patron_35: string;
  descripcion_patron_35: string;
  posiciones_origen_35: number[];
  posiciones_destino_35: number[];
  activo_35: boolean;
  fecha_creacion_35?: string;
  fecha_modificacion_35?: string;
  usuario_creacion_35?: string;
}

interface ApiResponse {
  success: boolean;
  data?: PatronRotacion[] | PatronRotacion;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof PatronRotacion;
  direction: 'asc' | 'desc';
};

function parsePosicionesArray(input: string): number[] {
  if (!input || !input.trim()) return [];
  return input
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

function formatPosicionesArray(arr: number[]): string {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

const PatronRotacionView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [patrones, setPatrones] = useState<PatronRotacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [posicionesOrigen, setPosicionesOrigen] = useState<string>('');
  const [posicionesDestino, setPosicionesDestino] = useState<string>('');
  const [activo, setActivo] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'codigo_patron_35', direction: 'asc' });

  const API_URL = 'http://localhost:3001/api/patrones-rotacion';

  useEffect(() => {
    fetchPatrones();
  }, []);

  const fetchPatrones = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setPatrones(data.data);
      } else {
        setError('Error al cargar los patrones de rotación');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPatrones = useMemo(() => {
    const st = searchTerm.toLowerCase();
    let filtered = patrones.filter(
      (p) =>
        p.codigo_patron_35.toLowerCase().includes(st) ||
        p.descripcion_patron_35.toLowerCase().includes(st) ||
        formatPosicionesArray(p.posiciones_origen_35).includes(st) ||
        formatPosicionesArray(p.posiciones_destino_35).includes(st)
    );

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        const aStr = Array.isArray(aValue) ? aValue.join(',') : String(aValue);
        const bStr = Array.isArray(bValue) ? bValue.join(',') : String(bValue);
        return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [patrones, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPatrones = filteredAndSortedPatrones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedPatrones.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: keyof PatronRotacion) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: keyof PatronRotacion) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const resetForm = () => {
    setCodigo('');
    setDescripcion('');
    setPosicionesOrigen('');
    setPosicionesDestino('');
    setActivo(true);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) {
      await showError('Campo requerido', 'El código del patrón es requerido');
      return;
    }
    if (!descripcion.trim()) {
      await showError('Campo requerido', 'La descripción del patrón es requerida');
      return;
    }

    const origen = parsePosicionesArray(posicionesOrigen);
    const destino = parsePosicionesArray(posicionesDestino);

    if (origen.length === 0) {
      await showError('Campo inválido', 'Las posiciones de origen no pueden estar vacías');
      return;
    }
    if (destino.length === 0) {
      await showError('Campo inválido', 'Las posiciones de destino no pueden estar vacías');
      return;
    }
    if (origen.length !== destino.length) {
      await showError('Campo inválido', 'Las posiciones de origen y destino deben tener la misma cantidad de elementos');
      return;
    }

    try {
      setError('');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_patron_35: codigo.trim().toUpperCase(),
          descripcion_patron_35: descripcion.trim(),
          posiciones_origen_35: origen,
          posiciones_destino_35: destino,
          activo_35: activo
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchPatrones();
        resetForm();
        await showSuccess('¡Patrón creado!', 'El patrón de rotación ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear el patrón');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el patrón');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || editingId === null) {
      await showError('Campo requerido', 'El código del patrón es requerido');
      return;
    }
    if (!descripcion.trim()) {
      await showError('Campo requerido', 'La descripción del patrón es requerida');
      return;
    }

    const origen = parsePosicionesArray(posicionesOrigen);
    const destino = parsePosicionesArray(posicionesDestino);

    if (origen.length === 0) {
      await showError('Campo inválido', 'Las posiciones de origen no pueden estar vacías');
      return;
    }
    if (destino.length === 0) {
      await showError('Campo inválido', 'Las posiciones de destino no pueden estar vacías');
      return;
    }
    if (origen.length !== destino.length) {
      await showError('Campo inválido', 'Las posiciones de origen y destino deben tener la misma cantidad de elementos');
      return;
    }

    try {
      setError('');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_patron_35: codigo.trim().toUpperCase(),
          descripcion_patron_35: descripcion.trim(),
          posiciones_origen_35: origen,
          posiciones_destino_35: destino,
          activo_35: activo
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchPatrones();
        resetForm();
        await showSuccess('¡Patrón actualizado!', 'El patrón de rotación ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar el patrón');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el patrón');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este patrón');
    if (!confirmed) return;

    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchPatrones();
        await showSuccess('¡Patrón eliminado!', 'El patrón ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el patrón');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el patrón');
      console.error('Error:', err);
    }
  };

  const startEdit = (patron: PatronRotacion) => {
    setEditingId(patron.id_patron_35);
    setCodigo(patron.codigo_patron_35);
    setDescripcion(patron.descripcion_patron_35);
    setPosicionesOrigen(formatPosicionesArray(patron.posiciones_origen_35));
    setPosicionesDestino(formatPosicionesArray(patron.posiciones_destino_35));
    setActivo(patron.activo_35 !== false);
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
    const dataToExport = filteredAndSortedPatrones.map((p) => ({
      ID: p.id_patron_35,
      Código: p.codigo_patron_35,
      Descripción: p.descripcion_patron_35,
      'Posiciones Origen': formatPosicionesArray(p.posiciones_origen_35),
      'Posiciones Destino': formatPosicionesArray(p.posiciones_destino_35),
      Activo: p.activo_35 ? 'Sí' : 'No'
    }));
    exportToExcel(dataToExport, 'patrones-rotacion', 'Patrones de Rotación');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🔄 Gestión de Patrones de Rotación</h2>
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
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '8px'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Editar Patrón' : '➕ Nuevo Patrón'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row form-row-single-line">
              <div className="form-group">
                <label htmlFor="codigo">Código: *</label>
                <input
                  type="text"
                  id="codigo"
                  className="form-input"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: ROT-01"
                  maxLength={10}
                  required
                  autoFocus
                  style={{ textTransform: 'uppercase' }}
                  aria-describedby="codigo-help"
                />
                <span id="codigo-help" className="form-hint">Máx. 10</span>
              </div>
              <div className="form-group">
                <label htmlFor="descripcion">Descripción: *</label>
                <input
                  type="text"
                  id="descripcion"
                  className="form-input"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                  placeholder="Ej: Rotación frontal derecha a trasera izquierda"
                  maxLength={200}
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <span className="form-hint form-hint-spacer" aria-hidden="true">&nbsp;</span>
              </div>
              <div className="form-group">
                <label htmlFor="posiciones-origen">Origen: *</label>
                <input
                  type="text"
                  id="posiciones-origen"
                  className="form-input"
                  value={posicionesOrigen}
                  onChange={(e) => setPosicionesOrigen(e.target.value)}
                  placeholder="1, 2, 3, 4"
                  required
                  aria-describedby="pos-origen-help"
                />
                <span id="pos-origen-help" className="form-hint">Ej: 1, 2, 3, 4</span>
              </div>
              <div className="form-group">
                <label htmlFor="posiciones-destino">Destino: *</label>
                <input
                  type="text"
                  id="posiciones-destino"
                  className="form-input"
                  value={posicionesDestino}
                  onChange={(e) => setPosicionesDestino(e.target.value)}
                  placeholder="2, 3, 4, 1"
                  required
                  aria-describedby="pos-destino-help"
                />
                <span id="pos-destino-help" className="form-hint">Misma cant.</span>
              </div>
              <div className="form-group checkbox-group checkbox-group-aligned">
                <label htmlFor="activo">Activo</label>
                <div className="checkbox-control">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    aria-label="Patrón activo"
                  />
                </div>
                <span className="form-hint form-hint-spacer" aria-hidden="true">&nbsp;</span>
              </div>
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
            Mostrando {currentPatrones.length} de {filteredAndSortedPatrones.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por código, descripción o posiciones..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #ced4da'
          }}
          aria-label="Buscar patrón de rotación"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_patron_35')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_patron_35')}
              </th>
              <th onClick={() => handleSort('codigo_patron_35')} className="sortable" style={{ cursor: 'pointer' }}>
                CÓDIGO {getSortIndicator('codigo_patron_35')}
              </th>
              <th onClick={() => handleSort('descripcion_patron_35')} className="sortable" style={{ cursor: 'pointer' }}>
                DESCRIPCIÓN {getSortIndicator('descripcion_patron_35')}
              </th>
              <th onClick={() => handleSort('posiciones_origen_35')} className="sortable" style={{ cursor: 'pointer' }}>
                ORIGEN {getSortIndicator('posiciones_origen_35')}
              </th>
              <th onClick={() => handleSort('posiciones_destino_35')} className="sortable" style={{ cursor: 'pointer' }}>
                DESTINO {getSortIndicator('posiciones_destino_35')}
              </th>
              <th onClick={() => handleSort('activo_35')} className="sortable" style={{ cursor: 'pointer' }}>
                ACTIVO {getSortIndicator('activo_35')}
              </th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && patrones.length === 0 ? (
              <tr>
                <td colSpan={8}>Cargando...</td>
              </tr>
            ) : currentPatrones.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-data">
                  {searchTerm
                    ? `📋 No se encontraron patrones con "${searchTerm}"`
                    : '📋 No hay patrones registrados'}
                </td>
              </tr>
            ) : (
              currentPatrones.map((patron) => (
                <tr key={patron.id_patron_35}>
                  <td>{patron.id_patron_35}</td>
                  <td className="patron-codigo">{patron.codigo_patron_35}</td>
                  <td className="patron-descripcion">{patron.descripcion_patron_35}</td>
                  <td className="patron-posiciones">{formatPosicionesArray(patron.posiciones_origen_35)}</td>
                  <td className="patron-posiciones">{formatPosicionesArray(patron.posiciones_destino_35)}</td>
                  <td>{patron.activo_35 ? '✓' : '✗'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(patron)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(patron.id_patron_35)} title="Eliminar">
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
        totalItems={filteredAndSortedPatrones.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default PatronRotacionView;
