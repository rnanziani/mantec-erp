import React, { useEffect, useState, useMemo } from 'react';
import './BodegaView.css';
import './ConsumoInsumoView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showSuccess, showError } from '../utils/swal';
import { exportToExcel } from '../utils/exportUtils';

interface MaestroConsumo {
  id_m_consumo_insumo_46: number;
  idtrabajador_46: number;
  id_responsableentrega_46: number;
  id_ccosto_46: number;
  id_insumo_46: number;
  cantidad_46: number;
  fecha_46: string;
  hora_46: string;
  observacion_46?: string;
  trabajador_nombre?: string;
  responsable_nombre?: string;
  ccosto_nombre?: string;
  insumo_descripcion?: string;
}

interface DetalleConsumo {
  id_d_consumo_insumo_47: number;
  id_m_consumo_insumo_47: number;
  id_insumo_47: number;
  cantidad_47: number;
  total_47: number;
  observacion_47?: string;
  insumo_descripcion?: string;
  precio_insumo?: number;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
  nombre_cargo?: string;
}

interface Responsable {
  idresponsableentrega_08: number;
  nombre_completo?: string;
  nombreresponsableentrega_08: string;
}

interface Ccosto {
  id_ccosto_45: number;
  ccosto_45: string;
}

interface Categoria {
  id_categoria_42: number;
  categoria_42: string;
}

interface Insumo {
  id_insumo_43: number;
  descripcion_43: string;
  precio_insumo_43: number;
  id_categoria_43?: number;
}

interface LineaItem {
  id_categoria: number;
  id_insumo: number;
  descripcion: string;
  cantidad: number;
  precio: number;
  total: number;
  observacion?: string;
  isMaster?: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

const API_URL = 'http://localhost:3001/api/consumo-insumos';
const TRABAJADORES_URL = 'http://localhost:3001/api/trabajadores';
const RESPONSABLES_URL = 'http://localhost:3001/api/responsables-entrega';
const CCOSTOS_URL = 'http://localhost:3001/api/ccostos';
const INSUMOS_URL = 'http://localhost:3001/api/insumos';
const CATEGORIAS_URL = 'http://localhost:3001/api/categorias';

const formatAmount = (value: number) =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const ConsumoInsumoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [consumos, setConsumos] = useState<MaestroConsumo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [ccostos, setCcostos] = useState<Ccosto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [diasFiltro] = useState(7);
  const [sortConfig, setSortConfig] = useState<{ key: keyof MaestroConsumo; direction: 'asc' | 'desc' } | null>(null);

  const [buscarApellido, setBuscarApellido] = useState('');
  const [idTrabajador, setIdTrabajador] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [idCcosto, setIdCcosto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [lineas, setLineas] = useState<LineaItem[]>([
    { id_categoria: 0, id_insumo: 0, descripcion: '', cantidad: 0, precio: 0, total: 0, observacion: '', isMaster: true }
  ]);


  useEffect(() => {
    fetchConsumos();
    fetchTrabajadores();
    fetchResponsables();
    fetchCcostos();
    fetchCategorias();
    fetchInsumos();
  }, []);

  const fetchConsumos = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const data: ApiResponse<MaestroConsumo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConsumos(data.data);
      } else {
        setError('Error al cargar consumos');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrabajadores = async () => {
    try {
      const res = await fetch(TRABAJADORES_URL);
      const data: ApiResponse<Trabajador[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTrabajadores(data.data);
      }
    } catch {}
  };

  const fetchResponsables = async () => {
    try {
      const res = await fetch(RESPONSABLES_URL);
      const data: ApiResponse<Responsable[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setResponsables(data.data);
      }
    } catch {}
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetch(CATEGORIAS_URL);
      const data: ApiResponse<Categoria[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategorias(data.data);
      }
    } catch {}
  };

  const fetchCcostos = async () => {
    try {
      const res = await fetch(`${CCOSTOS_URL}?activo=true`);
      const data: ApiResponse<Ccosto[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCcostos(data.data);
      }
    } catch {}
  };

  const fetchInsumos = async () => {
    try {
      const res = await fetch(INSUMOS_URL);
      const data: ApiResponse<Insumo[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInsumos(data.data);
      }
    } catch {}
  };

  const getTrabajadorNombre = (t: Trabajador) =>
    [t.nombre_06, t.apaterno_06, t.amaterno_06].filter(Boolean).join(' ').trim();
  const getResponsableNombre = (r: Responsable) =>
    r.nombre_completo || r.nombreresponsableentrega_08 || '';

  const processedConsumos = useMemo(() => {
    let data = [...consumos];

    if (diasFiltro > 0) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaLimite = new Date(hoy);
      fechaLimite.setDate(hoy.getDate() - diasFiltro);
      data = data.filter((c) => {
        if (!c.fecha_46) return false;
        const fechaConsumo = new Date(c.fecha_46);
        fechaConsumo.setHours(0, 0, 0, 0);
        return fechaConsumo >= fechaLimite && fechaConsumo <= hoy;
      });
    }

    if (searchTerm.trim()) {
      const st = searchTerm.toLowerCase();
      data = data.filter((c) => {
        const trabajador = (c.trabajador_nombre || '').toLowerCase();
        const responsable = (c.responsable_nombre || '').toLowerCase();
        const ccosto = (c.ccosto_nombre || '').toLowerCase();
        const insumo = (c.insumo_descripcion || '').toLowerCase();
        const fecha = (c.fecha_46 || '').toLowerCase();
        const id = String(c.id_m_consumo_insumo_46);
        return (
          trabajador.includes(st) ||
          responsable.includes(st) ||
          ccosto.includes(st) ||
          insumo.includes(st) ||
          fecha.includes(st) ||
          id.includes(st)
        );
      });
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      data.sort((a, b) => {
        const fechaA = new Date(a.fecha_46 + ' ' + a.hora_46);
        const fechaB = new Date(b.fecha_46 + ' ' + b.hora_46);
        return fechaB.getTime() - fechaA.getTime();
      });
    }

    return data;
  }, [consumos, searchTerm, diasFiltro, sortConfig]);

  const trabajadoresFiltrados = useMemo(() => {
    if (!buscarApellido || buscarApellido.trim() === '') return trabajadores;
    const busqueda = buscarApellido.trim();
    const apellidos = busqueda.split(/\s+/).map((a) => a.toLowerCase());
    if (apellidos.length === 1) {
      const word = apellidos[0];
      const paternoMatch = trabajadores.filter(
        (t) => t.apaterno_06 != null && t.apaterno_06.toLowerCase().startsWith(word)
      );
      const maternoMatch = trabajadores.filter(
        (t) =>
          t.amaterno_06 != null &&
          t.amaterno_06.toLowerCase().startsWith(word) &&
          !paternoMatch.some((p) => p.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paternoMatch, ...maternoMatch];
    }
    const [primer, segundo] = apellidos;
    return trabajadores
      .filter(
        (t) =>
          t.apaterno_06 != null &&
          t.apaterno_06.toLowerCase().startsWith(primer) &&
          t.amaterno_06 != null &&
          t.amaterno_06.toLowerCase().startsWith(segundo)
      )
      .sort((a, b) => {
        const cmpP = (a.apaterno_06 || '').localeCompare(b.apaterno_06 || '');
        return cmpP !== 0 ? cmpP : (a.amaterno_06 || '').localeCompare(b.amaterno_06 || '');
      });
  }, [trabajadores, buscarApellido]);

  const handleSort = (key: keyof MaestroConsumo) => {
    setSortConfig((prev) =>
      prev?.key === key && prev.direction === 'asc'
        ? { key, direction: 'desc' }
        : { key, direction: 'asc' }
    );
  };

  const handleExport = async () => {
    const dataToExport = processedConsumos.map((c) => ({
      ID: c.id_m_consumo_insumo_46,
      Fecha: c.fecha_46,
      Hora: c.hora_46.slice(0, 5),
      Trabajador: c.trabajador_nombre || '',
      Responsable: c.responsable_nombre || '',
      CentroCosto: c.ccosto_nombre || '',
      Insumo: c.insumo_descripcion || '',
      Cantidad: c.cantidad_46
    }));
    exportToExcel(dataToExport, 'consumo-insumos', 'Consumos');
    await showSuccess('¡Exportación exitosa!', 'Los datos han sido exportados correctamente.');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedConsumos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedConsumos.length / itemsPerPage);

  const addLinea = () => {
    setLineas((prev) => [
      ...prev,
      { id_categoria: 0, id_insumo: 0, descripcion: '', cantidad: 0, precio: 0, total: 0, observacion: '' }
    ]);
  };

  const removeLinea = (index: number) => {
    if (lineas.length <= 1) return;
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLinea = (index: number, field: keyof LineaItem, value: number | string) => {
    setLineas((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'id_categoria') {
        item.id_insumo = 0;
        item.descripcion = '';
        item.precio = 0;
        item.total = 0;
      } else if (field === 'id_insumo') {
        const ins = insumos.find((i) => i.id_insumo_43 === value);
        item.descripcion = ins?.descripcion_43 || '';
        item.precio = ins?.precio_insumo_43 || 0;
        item.total = item.cantidad * item.precio;
      } else if (field === 'cantidad') {
        item.total = Number(value) * item.precio;
      }
      next[index] = item;
      return next;
    });
  };

  const resetForm = () => {
    setBuscarApellido('');
    setIdTrabajador('');
    setIdResponsable('');
    setIdCcosto('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setLineas([
      { id_categoria: 0, id_insumo: 0, descripcion: '', cantidad: 0, precio: 0, total: 0, observacion: '', isMaster: true }
    ]);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const first = lineas[0];
    if (!first || first.id_categoria === 0 || first.id_insumo === 0 || first.cantidad <= 0) {
      await showError('Validación', 'Debe seleccionar categoría e insumo con cantidad mayor a 0');
      return;
    }
    if (!idTrabajador || !idResponsable || !idCcosto) {
      await showError('Validación', 'Trabajador, Responsable y Centro de Costo son requeridos');
      return;
    }
    const detalles = lineas.slice(1).filter((l) => l.id_insumo > 0 && l.cantidad > 0);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idtrabajador_46: parseInt(idTrabajador, 10),
          id_responsableentrega_46: parseInt(idResponsable, 10),
          id_ccosto_46: parseInt(idCcosto, 10),
          id_insumo_46: first.id_insumo,
          cantidad_46: first.cantidad,
          fecha_46: fecha,
          hora_46: hora,
          observacion_46: observacion.trim() || undefined,
          detalles: detalles.map((d) => ({
            id_insumo_47: d.id_insumo,
            cantidad_47: d.cantidad,
            observacion_47: d.observacion?.trim() || undefined
          }))
        })
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchConsumos();
        resetForm();
        await showSuccess('¡Consumo creado!', 'El consumo de insumos ha sido registrado correctamente.');
      } else {
        await showError('Error al crear', data.error || 'Error al crear consumo');
      }
    } catch {
      await showError('Error', 'Error al crear consumo');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    const first = lineas[0];
    if (!first || first.id_categoria === 0 || first.id_insumo === 0 || first.cantidad <= 0) {
      await showError('Validación', 'Debe seleccionar categoría e insumo con cantidad mayor a 0');
      return;
    }
    if (!idTrabajador || !idResponsable || !idCcosto) {
      await showError('Validación', 'Trabajador, Responsable y Centro de Costo son requeridos');
      return;
    }
    const detalles = lineas.slice(1).filter((l) => l.id_insumo > 0 && l.cantidad > 0);
    try {
      const res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idtrabajador_46: parseInt(idTrabajador, 10),
          id_responsableentrega_46: parseInt(idResponsable, 10),
          id_ccosto_46: parseInt(idCcosto, 10),
          id_insumo_46: first.id_insumo,
          cantidad_46: first.cantidad,
          fecha_46: fecha,
          hora_46: hora,
          observacion_46: observacion.trim() || undefined,
          detalles: detalles.map((d) => ({
            id_insumo_47: d.id_insumo,
            cantidad_47: d.cantidad,
            observacion_47: d.observacion?.trim() || undefined
          }))
        })
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchConsumos();
        resetForm();
        await showSuccess('¡Consumo actualizado!', 'El consumo de insumos ha sido actualizado correctamente.');
      } else {
        await showError('Error al actualizar', data.error || 'Error al actualizar consumo');
      }
    } catch {
      await showError('Error', 'Error al actualizar consumo');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este consumo de insumos');
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchConsumos();
        await showSuccess('¡Consumo eliminado!', 'El consumo ha sido eliminado correctamente.');
      } else {
        await showError('Error al eliminar', data.error || 'Error al eliminar consumo');
      }
    } catch {
      await showError('Error', 'Error al eliminar consumo');
    }
  };

  const startEdit = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: MaestroConsumo; detalles: DetalleConsumo[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', 'Error al cargar consumo');
        return;
      }
      const { maestro, detalles } = data.data;
      setBuscarApellido('');
      setIdTrabajador(String(maestro.idtrabajador_46));
      setIdResponsable(String(maestro.id_responsableentrega_46));
      setIdCcosto(String(maestro.id_ccosto_46));
      setFecha(maestro.fecha_46);
      setHora(maestro.hora_46.slice(0, 5));
      setObservacion(maestro.observacion_46 || '');
      const insumoMaster = insumos.find((i) => i.id_insumo_43 === maestro.id_insumo_46);
      const lineasInicial: LineaItem[] = [
        {
          id_categoria: insumoMaster?.id_categoria_43 || 0,
          id_insumo: maestro.id_insumo_46,
          descripcion: maestro.insumo_descripcion || '',
          cantidad: maestro.cantidad_46,
          precio: insumoMaster?.precio_insumo_43 || 0,
          total: insumoMaster ? maestro.cantidad_46 * insumoMaster.precio_insumo_43 : 0,
          isMaster: true
        }
      ];
      for (const d of detalles) {
        const insumoDet = insumos.find((i) => i.id_insumo_43 === d.id_insumo_47);
        lineasInicial.push({
          id_categoria: insumoDet?.id_categoria_43 || 0,
          id_insumo: d.id_insumo_47,
          descripcion: d.insumo_descripcion || '',
          cantidad: d.cantidad_47,
          precio: d.precio_insumo || 0,
          total: d.total_47,
          observacion: d.observacion_47
        });
      }
      setLineas(lineasInicial);
      setEditingId(id);
      setShowForm(true);
    } catch {
      await showError('Error', 'Error al cargar consumo');
    }
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📦 Consumo de Insumos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => { resetForm(); setShowForm(true); setEditingId(null); }}
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
            style={{ backgroundColor: '#dc3545' }}
          >
            📊 Generar Reporte
          </button>
          <button className="btn-secondary" onClick={resetForm}>
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
          <h3>{editingId ? '✏️ Editar Consumo' : '➕ Nuevo Consumo'}</h3>
          <form ref={formRef} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
              <div className="form-group">
                <label htmlFor="buscar-trabajador">Buscar Trabajador Por Apellido</label>
                <input
                  type="text"
                  id="buscar-trabajador"
                  className="form-input"
                  value={buscarApellido}
                  onChange={(e) => setBuscarApellido(e.target.value.toUpperCase())}
                  placeholder="EJ: GONZALEZ O GONZALEZ PEREZ"
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="form-tip" style={{ color: '#6c757d', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                  💡 Tip: Una palabra busca por apellido paterno primero, luego materno (empieza con). Dos palabras: paterno y materno en ese orden.
                </small>
              </div>
              <div className="form-group">
                <label>Seleccionar Trabajador *</label>
                <div
                  className="trabajador-list"
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    padding: '10px'
                  }}
                >
                  {trabajadoresFiltrados.length > 0 ? (
                    trabajadoresFiltrados.map((trab) => (
                      <div
                        key={trab.idtrabajador_06}
                        role="button"
                        tabIndex={0}
                        onClick={() => setIdTrabajador(String(trab.idtrabajador_06))}
                        onKeyDown={(e) => e.key === 'Enter' && setIdTrabajador(String(trab.idtrabajador_06))}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: idTrabajador === String(trab.idtrabajador_06) ? '#007bff' : 'transparent',
                          color: idTrabajador === String(trab.idtrabajador_06) ? 'white' : 'inherit',
                          marginBottom: '5px',
                          borderRadius: '4px',
                          border: idTrabajador === String(trab.idtrabajador_06) ? '2px solid #0056b3' : '1px solid #ced4da'
                        }}
                      >
                        <strong>{trab.apaterno_06 || ''} {trab.amaterno_06 || ''}</strong> {trab.nombre_06 || ''} -{' '}
                        <span style={{ fontSize: '0.9em', opacity: 0.8 }}>{trab.ruttrabajador_06 || ''}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#6c757d', padding: '10px' }}>
                      {trabajadores.length === 0 ? 'Cargando trabajadores...' : 'No se encontraron trabajadores con ese criterio'}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="responsable">Responsable Entrega *</label>
                <select
                  id="responsable"
                  className="form-input"
                  value={idResponsable}
                  onChange={(e) => setIdResponsable(e.target.value)}
                  required
                >
                  <option value="">Seleccione...</option>
                  {responsables.map((r) => (
                    <option key={r.idresponsableentrega_08} value={String(r.idresponsableentrega_08)}>
                      {getResponsableNombre(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ccosto">Centro de Costo *</label>
                <select
                  id="ccosto"
                  className="form-input"
                  value={idCcosto}
                  onChange={(e) => setIdCcosto(e.target.value)}
                  required
                >
                  <option value="">Seleccione...</option>
                  {ccostos.map((c) => (
                    <option key={c.id_ccosto_45} value={String(c.id_ccosto_45)}>
                      {c.ccosto_45}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="form-group">
                <label htmlFor="fecha">Fecha *</label>
                <input
                  type="date"
                  id="fecha"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="hora">Hora *</label>
                <input
                  type="time"
                  id="hora"
                  className="form-input"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                />
              </div>
              <div className="form-group form-group-flex">
                <label htmlFor="observacion">Observación</label>
                <input
                  type="text"
                  id="observacion"
                  className="form-input"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="detalle-section">
              <div className="detalle-header">
                <h4>Detalle de Insumos</h4>
                <button type="button" className="btn-add-line" onClick={addLinea}>
                  ➕ Agregar línea
                </button>
              </div>
              <div className="detalle-table-wrapper">
                <table className="detalle-table">
                  <thead>
                    <tr>
                      <th>Categoría *</th>
                      <th>Insumo *</th>
                      <th>Cantidad *</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                      <th>Obs.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea, idx) => {
                      const insumosFiltrados = linea.id_categoria
                        ? insumos.filter((i) => i.id_categoria_43 === linea.id_categoria)
                        : [];
                      return (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-input form-input-sm"
                            value={linea.id_categoria || ''}
                            onChange={(e) => updateLinea(idx, 'id_categoria', parseInt(e.target.value, 10) || 0)}
                            required={idx === 0}
                          >
                            <option value="">Seleccione...</option>
                            {categorias.map((c) => (
                              <option key={c.id_categoria_42} value={c.id_categoria_42}>
                                {c.categoria_42}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-input form-input-sm"
                            value={linea.id_insumo || ''}
                            onChange={(e) => updateLinea(idx, 'id_insumo', parseInt(e.target.value, 10) || 0)}
                            required={idx === 0}
                            disabled={!linea.id_categoria}
                          >
                            <option value="">Seleccione...</option>
                            {insumosFiltrados.map((i) => (
                              <option key={i.id_insumo_43} value={i.id_insumo_43}>
                                {i.descripcion_43} - ${formatAmount(i.precio_insumo_43)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input form-input-sm"
                            value={linea.cantidad || ''}
                            onChange={(e) => updateLinea(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            min="0.01"
                            step="0.01"
                            required={idx === 0}
                          />
                        </td>
                        <td className="td-precio">${formatAmount(linea.precio)}</td>
                        <td className="td-total">${formatAmount(linea.total)}</td>
                        <td>
                          <input
                            type="text"
                            className="form-input form-input-sm"
                            value={linea.observacion || ''}
                            onChange={(e) => updateLinea(idx, 'observacion', e.target.value)}
                            placeholder="-"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-delete-line"
                            onClick={() => removeLinea(idx)}
                            disabled={lineas.length <= 1}
                            title="Quitar línea"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador y tabla */}
      {!showForm && (
        <div className="form-container" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              📅 Mostrando consumos de los últimos {diasFiltro} días (Total: {processedConsumos.length})
            </div>
          </div>
          <input
            type="text"
            placeholder="🔍 Buscar consumo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {!showForm && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortConfig?.key === 'id_m_consumo_insumo_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('id_m_consumo_insumo_46')}
                  >
                    ID
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'fecha_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('fecha_46')}
                  >
                    FECHA
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'hora_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('hora_46')}
                  >
                    HORA
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'trabajador_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('trabajador_nombre' as keyof MaestroConsumo)}
                  >
                    TRABAJADOR
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'responsable_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('responsable_nombre' as keyof MaestroConsumo)}
                  >
                    RESPONSABLE
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'ccosto_nombre' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('ccosto_nombre' as keyof MaestroConsumo)}
                  >
                    C. COSTO
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'insumo_descripcion' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('insumo_descripcion' as keyof MaestroConsumo)}
                  >
                    INSUMO
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'cantidad_46' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('cantidad_46')}
                  >
                    CANT.
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron consumos con "${searchTerm}"`
                        : '📋 No hay consumos registrados'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((c) => (
                    <tr key={c.id_m_consumo_insumo_46} className="fade-in">
                      <td>{c.id_m_consumo_insumo_46}</td>
                      <td>{c.fecha_46}</td>
                      <td>{c.hora_46.slice(0, 5)}</td>
                      <td>{c.trabajador_nombre || '-'}</td>
                      <td>{c.responsable_nombre || '-'}</td>
                      <td>{c.ccosto_nombre || '-'}</td>
                      <td>{c.insumo_descripcion || '-'}</td>
                      <td className="td-cantidad">{formatAmount(c.cantidad_46)}</td>
                      <td className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(c.id_m_consumo_insumo_46)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(c.id_m_consumo_insumo_46)}
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
          {processedConsumos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedConsumos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
      {loading && !showForm && <div className="loading">⏳ Cargando...</div>}
    </div>
  );
};

export default ConsumoInsumoView;
