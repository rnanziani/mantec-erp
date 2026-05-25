import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import './HistorialNeumaticoView.css';
import Pagination from './shared/Pagination';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { apiUrl } from '../lib/apiClient';

interface HistorialNeumatico {
  id_historial_34: number;
  cod_neumatico_34: string;
  id_conductor_34?: number;
  id_maquina_34?: number;
  kilometraje_34?: number;
  id_tecnico_34?: number;
  balanceo_34: boolean;
  fecha_movimiento_34: string;
  observaciones_34?: string;
  conductor_nombre?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  tecnico_nombre?: string;
}

interface Neumatico {
  id_neumatico_31: number;
  cod_neumatico_31: string;
  marca_32?: string;
}

interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
  descripcion_11?: string;
}

interface Tecnico {
  id_tecnico_21: number;
  nombres_21: string;
  a_paterno_21?: string;
  a_materno_21?: string;
}

interface Trabajador {
  idtrabajador_06: number;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
  ruttrabajador_06?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortKey = keyof HistorialNeumatico;

const API_URL = apiUrl('/historial-neumatico');
const NEUMATICOS_URL = apiUrl('/neumaticos');
const MAQUINAS_URL = apiUrl('/maquinas');
const TECNICOS_URL = apiUrl('/tecnicos');
const TRABAJADORES_URL = apiUrl('/trabajadores');

const formatFecha = (f: string) => {
  if (!f) return '-';
  const d = new Date(f);
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
};

const HistorialNeumaticoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [historial, setHistorial] = useState<HistorialNeumatico[]>([]);
  const [neumaticos, setNeumaticos] = useState<Neumatico[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [buscarNeumatico, setBuscarNeumatico] = useState<string>('');
  const [buscarConductor, setBuscarConductor] = useState<string>('');
  const [buscarMaquina, setBuscarMaquina] = useState<string>('');
  const [codNeumatico, setCodNeumatico] = useState<string>('');
  const [idConductor, setIdConductor] = useState<string>('');
  const [idMaquina, setIdMaquina] = useState<string>('');
  const [kilometraje, setKilometraje] = useState<string>('');
  const [idTecnico, setIdTecnico] = useState<string>('');
  const [balanceo, setBalanceo] = useState<boolean>(false);
  const [fechaMovimiento, setFechaMovimiento] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [observaciones, setObservaciones] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'fecha_movimiento_34',
    direction: 'desc'
  });

  useEffect(() => {
    fetchHistorial();
    fetchNeumaticos();
    fetchMaquinas();
    fetchTecnicos();
    fetchTrabajadores();
  }, []);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(API_URL);
      const data: ApiResponse<HistorialNeumatico[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistorial(data.data);
      } else {
        setError('Error al cargar el historial');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchNeumaticos = async () => {
    try {
      const res = await fetch(NEUMATICOS_URL);
      const data: ApiResponse<Neumatico[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setNeumaticos(data.data);
    } catch (e) {
      console.error('Error cargando neumáticos:', e);
    }
  };

  const fetchMaquinas = async () => {
    try {
      const res = await fetch(MAQUINAS_URL);
      const data: ApiResponse<Maquina[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setMaquinas(data.data);
    } catch (e) {
      console.error('Error cargando máquinas:', e);
    }
  };

  const fetchTecnicos = async () => {
    try {
      const res = await fetch(TECNICOS_URL);
      const data: ApiResponse<Tecnico[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setTecnicos(data.data);
    } catch (e) {
      console.error('Error cargando técnicos:', e);
    }
  };

  const fetchTrabajadores = async () => {
    try {
      const res = await fetch(TRABAJADORES_URL);
      const data: ApiResponse<Trabajador[]> = await res.json();
      if (data.success && Array.isArray(data.data)) setTrabajadores(data.data);
    } catch (e) {
      console.error('Error cargando trabajadores:', e);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const st = searchTerm.toLowerCase();
    const list = historial.filter((h) => {
      const matchCod = h.cod_neumatico_34?.toLowerCase().includes(st);
      const matchCond = h.conductor_nombre?.toLowerCase().includes(st);
      const matchMaq = h.maquina_numinterno?.toLowerCase().includes(st) || h.maquina_ppu?.toLowerCase().includes(st);
      const matchTec = h.tecnico_nombre?.toLowerCase().includes(st);
      const matchObs = h.observaciones_34?.toLowerCase().includes(st);
      return matchCod || matchCond || matchMaq || matchTec || matchObs;
    });
    list.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [historial, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const neumaticosFiltrados = useMemo(() => {
    if (!buscarNeumatico || buscarNeumatico.trim() === '') return neumaticos;
    const busquedaLower = buscarNeumatico.trim().toLowerCase();
    return neumaticos.filter(
      (n) =>
        (n.cod_neumatico_31 && n.cod_neumatico_31.toLowerCase().includes(busquedaLower)) ||
        (n.marca_32 && n.marca_32.toLowerCase().includes(busquedaLower))
    );
  }, [neumaticos, buscarNeumatico]);

  const conductoresFiltrados = useMemo(() => {
    if (!buscarConductor || buscarConductor.trim() === '') return trabajadores;
    const busqueda = buscarConductor.trim();
    const palabras = busqueda.split(/\s+/).map((a) => a.toLowerCase());
    if (palabras.length === 1) {
      const word = palabras[0];
      const paternoMatch = trabajadores.filter(
        (t) => t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(word)
      );
      const maternoMatch = trabajadores.filter(
        (t) =>
          t.amaterno_06 != null &&
          t.amaterno_06.toLowerCase().startsWith(word) &&
          !paternoMatch.some((p) => p.idtrabajador_06 === t.idtrabajador_06)
      );
      const nombreMatch = trabajadores.filter(
        (t) =>
          t.nombre_06 != null &&
          t.nombre_06.toLowerCase().includes(word) &&
          !paternoMatch.some((p) => p.idtrabajador_06 === t.idtrabajador_06) &&
          !maternoMatch.some((m) => m.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paternoMatch, ...maternoMatch, ...nombreMatch];
    }
    const [primer, segundo] = palabras;
    return trabajadores.filter(
      (t) =>
        t.apaterno_06 != null &&
        t.apaterno_06.toLowerCase().startsWith(primer) &&
        t.amaterno_06 != null &&
        t.amaterno_06.toLowerCase().startsWith(segundo)
    );
  }, [trabajadores, buscarConductor]);

  const maquinasFiltradas = useMemo(() => {
    if (!buscarMaquina || buscarMaquina.trim() === '') return maquinas;
    const busquedaLower = buscarMaquina.trim().toLowerCase();
    return maquinas.filter(
      (m) =>
        (m.ppu_11 && m.ppu_11.toLowerCase().includes(busquedaLower)) ||
        (m.numinterno_11 && m.numinterno_11.toLowerCase().includes(busquedaLower)) ||
        (m.descripcion_11 && m.descripcion_11.toLowerCase().includes(busquedaLower))
    );
  }, [maquinas, buscarMaquina]);

  const resetForm = () => {
    setBuscarNeumatico('');
    setBuscarConductor('');
    setBuscarMaquina('');
    setCodNeumatico('');
    setIdConductor('');
    setIdMaquina('');
    setKilometraje('');
    setIdTecnico('');
    setBalanceo(false);
    setFechaMovimiento(new Date().toISOString().slice(0, 16));
    setObservaciones('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codNeumatico.trim()) {
      await showError('Campo requerido', 'El código del neumático es requerido');
      return;
    }
    const km = kilometraje.trim() ? parseFloat(kilometraje) : null;
    if (kilometraje.trim() && (isNaN(km!) || km! < 0)) {
      await showError('Campo inválido', 'El kilometraje debe ser un número mayor o igual a 0');
      return;
    }
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_neumatico_34: codNeumatico.trim().toUpperCase(),
          id_conductor_34: idConductor ? parseInt(idConductor, 10) : undefined,
          id_maquina_34: idMaquina ? parseInt(idMaquina, 10) : undefined,
          kilometraje_34: km,
          id_tecnico_34: idTecnico ? parseInt(idTecnico, 10) : undefined,
          balanceo_34: balanceo,
          fecha_movimiento_34: fechaMovimiento ? new Date(fechaMovimiento).toISOString() : undefined,
          observaciones_34: observaciones.trim() || undefined
        })
      });
      const data: ApiResponse<HistorialNeumatico> = await res.json();
      if (data.success) {
        await fetchHistorial();
        resetForm();
        await showSuccess('¡Registro creado!', 'El historial ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear el registro');
      }
    } catch {
      await showError('Error', 'Error al crear el registro');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codNeumatico.trim() || editingId === null) {
      await showError('Campo requerido', 'El código del neumático es requerido');
      return;
    }
    const km = kilometraje.trim() ? parseFloat(kilometraje) : null;
    if (kilometraje.trim() && (isNaN(km!) || km! < 0)) {
      await showError('Campo inválido', 'El kilometraje debe ser un número mayor o igual a 0');
      return;
    }
    try {
      setError('');
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_neumatico_34: codNeumatico.trim().toUpperCase(),
          id_conductor_34: idConductor ? parseInt(idConductor, 10) : undefined,
          id_maquina_34: idMaquina ? parseInt(idMaquina, 10) : undefined,
          kilometraje_34: km,
          id_tecnico_34: idTecnico ? parseInt(idTecnico, 10) : undefined,
          balanceo_34: balanceo,
          fecha_movimiento_34: fechaMovimiento ? new Date(fechaMovimiento).toISOString() : undefined,
          observaciones_34: observaciones.trim() || undefined
        })
      });
      const data: ApiResponse<HistorialNeumatico> = await res.json();
      if (data.success) {
        await fetchHistorial();
        resetForm();
        await showSuccess('¡Registro actualizado!', 'El historial ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar el registro');
      }
    } catch {
      await showError('Error', 'Error al actualizar el registro');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este registro');
    if (!confirmed) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchHistorial();
        await showSuccess('¡Registro eliminado!', 'El registro ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar el registro');
      }
    } catch {
      await showError('Error', 'Error al eliminar el registro');
    }
  };

  const startEdit = (h: HistorialNeumatico) => {
    setEditingId(h.id_historial_34);
    setCodNeumatico(h.cod_neumatico_34);
    setIdConductor(h.id_conductor_34 ? String(h.id_conductor_34) : '');
    setIdMaquina(h.id_maquina_34 ? String(h.id_maquina_34) : '');
    setKilometraje(h.kilometraje_34 != null ? String(h.kilometraje_34) : '');
    setIdTecnico(h.id_tecnico_34 ? String(h.id_tecnico_34) : '');
    setBalanceo(h.balanceo_34 === true);
    setFechaMovimiento(h.fecha_movimiento_34 ? new Date(h.fecha_movimiento_34).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setObservaciones(h.observaciones_34 || '');
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
    const dataToExport = filteredAndSorted.map((h) => ({
      ID: h.id_historial_34,
      'Cód. Neumático': h.cod_neumatico_34,
      Conductor: h.conductor_nombre || '-',
      Máquina: h.maquina_numinterno ? `${h.maquina_numinterno} (${h.maquina_ppu || ''})` : '-',
      Kilometraje: h.kilometraje_34 ?? '-',
      Técnico: h.tecnico_nombre || '-',
      Balanceo: h.balanceo_34 ? 'Sí' : 'No',
      'Fecha Movimiento': formatFecha(h.fecha_movimiento_34),
      Observaciones: h.observaciones_34 || ''
    }));
    exportToExcel(dataToExport, 'historial-neumatico', 'Historial Neumáticos');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📋 Historial de Neumáticos</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={showCreateForm} style={{ backgroundColor: '#007bff' }}>
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
          <button className="btn-primary" onClick={handleExport} style={{ backgroundColor: '#17a2b8' }}>
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
          <h3>{editingId ? '✏️ Editar Registro' : '➕ Nuevo Registro'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            {/* Fila única: Neumático, Conductor y Máquina en 3 columnas */}
            <div className="historial-buscadores-row">
            <div className="historial-buscador-col">
              <div className="form-group">
                <label htmlFor="buscarNeumatico">Buscar Neumático</label>
                <input
                  type="text"
                  id="buscarNeumatico"
                  className="form-input"
                  value={buscarNeumatico}
                  onChange={(e) => setBuscarNeumatico(e.target.value.toUpperCase())}
                  placeholder="INGRESE CÓDIGO O MARCA"
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="historial-form-tip">💡 Tip: Busque por código o marca del neumático</small>
              </div>
              <div className="form-group">
                <label>Seleccionar Neumático *</label>
                <div className="historial-list-box">
                  {neumaticosFiltrados.length > 0 ? (
                    neumaticosFiltrados.map((n) => (
                      <div
                        key={n.id_neumatico_31}
                        role="button"
                        tabIndex={0}
                        onClick={() => setCodNeumatico(n.cod_neumatico_31)}
                        onKeyDown={(e) => e.key === 'Enter' && setCodNeumatico(n.cod_neumatico_31)}
                        className={codNeumatico === n.cod_neumatico_31 ? 'historial-list-item selected' : 'historial-list-item'}
                      >
                        <strong>{n.cod_neumatico_31}</strong> - {n.marca_32 || ''}
                      </div>
                    ))
                  ) : (
                    <div className="historial-list-empty">
                      {neumaticos.length === 0 ? 'Cargando neumáticos...' : 'No se encontraron neumáticos con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="historial-buscador-col">
              <div className="form-group">
                <label htmlFor="buscarConductor">Buscar Conductor por Apellido</label>
                <input
                  type="text"
                  id="buscarConductor"
                  className="form-input"
                  value={buscarConductor}
                  onChange={(e) => setBuscarConductor(e.target.value.toUpperCase())}
                  placeholder="EJ: GONZALEZ O GONZALEZ PEREZ"
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="historial-form-tip">💡 Tip: Una palabra busca por apellido. Dos palabras: paterno y materno.</small>
              </div>
              <div className="form-group">
                <label>Seleccionar Conductor</label>
                <div className="historial-list-box">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIdConductor('')}
                    onKeyDown={(e) => e.key === 'Enter' && setIdConductor('')}
                    className={!idConductor ? 'historial-list-item selected' : 'historial-list-item historial-list-clear'}
                  >
                    — Sin conductor —
                  </div>
                  {conductoresFiltrados.length > 0 ? (
                    conductoresFiltrados.map((tr) => (
                      <div
                        key={tr.idtrabajador_06}
                        role="button"
                        tabIndex={0}
                        onClick={() => setIdConductor(String(tr.idtrabajador_06))}
                        onKeyDown={(e) => e.key === 'Enter' && setIdConductor(String(tr.idtrabajador_06))}
                        className={idConductor === String(tr.idtrabajador_06) ? 'historial-list-item selected' : 'historial-list-item'}
                      >
                        <strong>{tr.apaterno_06 || ''} {tr.amaterno_06 || ''}</strong> {tr.nombre_06 || ''}
                        {tr.ruttrabajador_06 && <span className="historial-list-rut"> - {tr.ruttrabajador_06}</span>}
                      </div>
                    ))
                  ) : (
                    <div className="historial-list-empty">
                      {trabajadores.length === 0 ? 'Cargando conductores...' : 'No se encontraron conductores con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="historial-buscador-col">
              <div className="form-group">
                <label htmlFor="buscarMaquina">Buscar Máquina</label>
                <input
                  type="text"
                  id="buscarMaquina"
                  className="form-input"
                  value={buscarMaquina}
                  onChange={(e) => setBuscarMaquina(e.target.value.toUpperCase())}
                  placeholder="INGRESE PATENTE, NÚMERO INTERNO O DESCRIPCIÓN"
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="historial-form-tip">💡 Tip: Busque por patente, número interno o descripción</small>
              </div>
              <div className="form-group">
                <label>Seleccionar Máquina</label>
                <div className="historial-list-box">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIdMaquina('')}
                    onKeyDown={(e) => e.key === 'Enter' && setIdMaquina('')}
                    className={!idMaquina ? 'historial-list-item selected' : 'historial-list-item historial-list-clear'}
                  >
                    — Sin máquina —
                  </div>
                  {maquinasFiltradas.length > 0 ? (
                    maquinasFiltradas.map((m) => (
                      <div
                        key={m.idmaquina_11}
                        role="button"
                        tabIndex={0}
                        onClick={() => setIdMaquina(String(m.idmaquina_11))}
                        onKeyDown={(e) => e.key === 'Enter' && setIdMaquina(String(m.idmaquina_11))}
                        className={idMaquina === String(m.idmaquina_11) ? 'historial-list-item selected' : 'historial-list-item'}
                      >
                        <strong>{m.ppu_11 || 'N/A'}</strong> - {m.numinterno_11 || 'N/A'}
                        {m.descripcion_11 && ` (${m.descripcion_11})`}
                      </div>
                    ))
                  ) : (
                    <div className="historial-list-empty">
                      {maquinas.length === 0 ? 'Cargando máquinas...' : 'No se encontraron máquinas con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>

            {/* Fila 2: Kilometraje, Técnico, Fecha, Balanceo */}
            <div className="historial-form-row">
              <div className="form-group">
                <label htmlFor="kilometraje">Kilometraje:</label>
                <input
                  type="number"
                  id="kilometraje"
                  className="form-input"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="idTecnico">Técnico:</label>
                <select
                  id="idTecnico"
                  className="form-input"
                  value={idTecnico}
                  onChange={(e) => setIdTecnico(e.target.value)}
                >
                  <option value="">Sin técnico</option>
                  {tecnicos.map((t) => (
                    <option key={t.id_tecnico_21} value={t.id_tecnico_21}>
                      {t.nombres_21} {t.a_paterno_21 || ''} {t.a_materno_21 || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="fechaMovimiento">Fecha y Hora:</label>
                <input
                  type="datetime-local"
                  id="fechaMovimiento"
                  className="form-input"
                  value={fechaMovimiento}
                  onChange={(e) => setFechaMovimiento(e.target.value)}
                />
              </div>
              <div className="form-group checkbox-group">
                <label htmlFor="balanceo" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="balanceo"
                    checked={balanceo}
                    onChange={(e) => setBalanceo(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    aria-label="Balanceo realizado"
                  />
                  Balanceo
                </label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="observaciones">Observaciones:</label>
              <textarea
                id="observaciones"
                className="form-input"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value.toUpperCase())}
                placeholder="Observaciones opcionales..."
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
            Mostrando {currentItems.length} de {filteredAndSorted.length} registros
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por neumático, conductor, máquina, técnico u observaciones..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da' }}
          aria-label="Buscar historial"
        />
      </div>

      <div className="table-container historial-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_historial_34')} className="sortable" style={{ cursor: 'pointer' }}>
                ID {getSortIndicator('id_historial_34')}
              </th>
              <th onClick={() => handleSort('cod_neumatico_34')} className="sortable" style={{ cursor: 'pointer' }}>
                NEUMÁTICO {getSortIndicator('cod_neumatico_34')}
              </th>
              <th onClick={() => handleSort('conductor_nombre')} className="sortable" style={{ cursor: 'pointer' }}>
                CONDUCTOR {getSortIndicator('conductor_nombre')}
              </th>
              <th onClick={() => handleSort('maquina_numinterno')} className="sortable" style={{ cursor: 'pointer' }}>
                MÁQUINA {getSortIndicator('maquina_numinterno')}
              </th>
              <th onClick={() => handleSort('kilometraje_34')} className="sortable" style={{ cursor: 'pointer' }}>
                KM {getSortIndicator('kilometraje_34')}
              </th>
              <th onClick={() => handleSort('tecnico_nombre')} className="sortable" style={{ cursor: 'pointer' }}>
                TÉCNICO {getSortIndicator('tecnico_nombre')}
              </th>
              <th onClick={() => handleSort('balanceo_34')} className="sortable" style={{ cursor: 'pointer' }}>
                BALANCEO {getSortIndicator('balanceo_34')}
              </th>
              <th onClick={() => handleSort('fecha_movimiento_34')} className="sortable" style={{ cursor: 'pointer' }}>
                FECHA {getSortIndicator('fecha_movimiento_34')}
              </th>
              <th>OBSERVACIONES</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && historial.length === 0 ? (
              <tr>
                <td colSpan={11}>Cargando...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="no-data">
                  {searchTerm ? `📋 No se encontraron registros con "${searchTerm}"` : '📋 No hay registros'}
                </td>
              </tr>
            ) : (
              currentItems.map((h) => (
                <tr key={h.id_historial_34}>
                  <td>{h.id_historial_34}</td>
                  <td className="historial-cod">{h.cod_neumatico_34}</td>
                  <td>{h.conductor_nombre || '-'}</td>
                  <td>{h.maquina_numinterno ? `${h.maquina_numinterno} (${h.maquina_ppu || ''})` : '-'}</td>
                  <td>{h.kilometraje_34 != null ? Number(h.kilometraje_34).toLocaleString('es-CL') : '-'}</td>
                  <td>{h.tecnico_nombre || '-'}</td>
                  <td>{h.balanceo_34 ? '✓' : '✗'}</td>
                  <td>{formatFecha(h.fecha_movimiento_34)}</td>
                  <td className="historial-obs">{h.observaciones_34 || '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => startEdit(h)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(h.id_historial_34)} title="Eliminar">
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
        totalItems={filteredAndSorted.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default HistorialNeumaticoView;
