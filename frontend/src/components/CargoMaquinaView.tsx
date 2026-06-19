import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './BodegaView.css';
import './ConsumoInsumoView.css';
import Pagination from './shared/Pagination';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { exportToExcel } from '../utils/exportUtils';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface MaestroCargoMaquina {
  idmcargomaquina_38: number;
  idmaquina_38: number;
  idtrabajador_38: number;
  fecha_38: string;
  observacion_38?: string | null;
  maquina_ppu?: string;
  maquina_numinterno?: string;
  maquina_descripcion?: string;
  trabajador_nombre?: string;
}

interface DetalleCargoMaquina {
  iddcargomaquina_39?: number;
  idinsumo_39: number;
  cantstd_39: number;
  cantreal_39: number;
  diferencia_39?: number;
  insumo_descripcion?: string;
}

interface Maquina {
  idmaquina_11: number;
  ppu_11: string;
  numinterno_11: string;
  descripcion_11: string;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06?: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
}

interface Categoria {
  id_categoria_42: number;
  categoria_42: string;
}

interface Insumo {
  id_insumo_43: number;
  descripcion_43: string;
  id_categoria_43?: number;
}

interface DetalleLinea {
  id_categoria: number;
  idinsumo_39: number;
  cantstd_39: number;
  cantreal_39: number;
  diferencia_39: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const API_URL = apiUrl('/cargo-maquinas');
const MAQUINAS_URL = apiUrl('/maquinas');
const TRABAJADORES_URL = apiUrl('/trabajadores');
const INSUMOS_URL = apiUrl('/insumos');
const CATEGORIAS_URL = apiUrl('/categorias');

const parseCantidad = (raw: string): number => {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
};

const CargoMaquinaView: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<MaestroCargoMaquina[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MaestroCargoMaquina;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [filtroFechaDesde, setFiltroFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(() =>
    new Date().toISOString().split('T')[0]
  );

  const [buscarPatente, setBuscarPatente] = useState('');
  const [buscarApellido, setBuscarApellido] = useState('');
  const [idMaquina, setIdMaquina] = useState('');
  const [idTrabajador, setIdTrabajador] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<DetalleLinea[]>([]);

  const [selectedRegistroId, setSelectedRegistroId] = useState<number | null>(null);
  const [detalleRegistro, setDetalleRegistro] = useState<{
    maestro: MaestroCargoMaquina;
    detalles: DetalleCargoMaquina[];
  } | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const categoriasOrdenadas = useMemo(
    () =>
      [...categorias].sort((a, b) =>
        a.categoria_42.localeCompare(b.categoria_42, 'es', { sensitivity: 'base' })
      ),
    [categorias]
  );

  const fetchRegistros = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(API_URL);
      const data: ApiResponse<MaestroCargoMaquina[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRegistros(data.data);
      } else {
        setError(data.error || 'Error al cargar registros');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
    Promise.all([
      apiFetch(MAQUINAS_URL).then((r) => r.json()),
      apiFetch(TRABAJADORES_URL).then((r) => r.json()),
      apiFetch(INSUMOS_URL).then((r) => r.json()),
      apiFetch(CATEGORIAS_URL).then((r) => r.json()),
    ])
      .then(([maq, trab, ins, cat]) => {
        if (maq.success) setMaquinas(maq.data);
        if (trab.success) setTrabajadores(trab.data);
        if (ins.success) setInsumos(ins.data);
        if (cat.success) {
          setCategorias(
            [...cat.data].sort((a: Categoria, b: Categoria) =>
              a.categoria_42.localeCompare(b.categoria_42, 'es', { sensitivity: 'base' })
            )
          );
        }
      })
      .catch(() => {});
  }, [fetchRegistros]);

  const maquinasFiltradas = useMemo(() => {
    if (!buscarPatente.trim()) return maquinas;
    const q = buscarPatente.toLowerCase();
    return maquinas.filter(
      (m) =>
        m.ppu_11?.toLowerCase().includes(q) ||
        m.numinterno_11?.toLowerCase().includes(q) ||
        m.descripcion_11?.toLowerCase().includes(q)
    );
  }, [maquinas, buscarPatente]);

  const trabajadoresFiltrados = useMemo(() => {
    if (!buscarApellido.trim()) return trabajadores;
    const apellidos = buscarApellido.trim().split(/\s+/).map((a) => a.toLowerCase());
    if (apellidos.length === 1) {
      const word = apellidos[0];
      const paterno = trabajadores.filter((t) =>
        t.apaterno_06?.toLowerCase().startsWith(word)
      );
      const materno = trabajadores.filter(
        (t) =>
          t.amaterno_06?.toLowerCase().startsWith(word) &&
          !paterno.some((p) => p.idtrabajador_06 === t.idtrabajador_06)
      );
      return [...paterno, ...materno];
    }
    const [primer, segundo] = apellidos;
    return trabajadores
      .filter(
        (t) =>
          t.apaterno_06?.toLowerCase().startsWith(primer) &&
          t.amaterno_06?.toLowerCase().startsWith(segundo)
      )
      .sort((a, b) => (a.apaterno_06 || '').localeCompare(b.apaterno_06 || ''));
  }, [trabajadores, buscarApellido]);

  const processedRegistros = useMemo(() => {
    let data = [...registros];
    const q = searchTerm.toLowerCase();

    if (filtroFechaDesde) {
      data = data.filter((r) => {
        const f = r.fecha_38?.split('T')[0] || '';
        return !f || f >= filtroFechaDesde;
      });
    }
    if (filtroFechaHasta) {
      data = data.filter((r) => {
        const f = r.fecha_38?.split('T')[0] || '';
        return !f || f <= filtroFechaHasta;
      });
    }

    if (q) {
      data = data.filter((r) => {
        const maq = `${r.maquina_ppu || ''} ${r.maquina_numinterno || ''} ${r.maquina_descripcion || ''}`.toLowerCase();
        const trab = (r.trabajador_nombre || '').toLowerCase();
        const obs = (r.observacion_38 || '').toLowerCase();
        return (
          String(r.idmcargomaquina_38).includes(q) ||
          maq.includes(q) ||
          trab.includes(q) ||
          obs.includes(q)
        );
      });
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      data.sort(
        (a, b) => new Date(b.fecha_38).getTime() - new Date(a.fecha_38).getTime()
      );
    }
    return data;
  }, [registros, searchTerm, filtroFechaDesde, filtroFechaHasta, sortConfig]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRegistros.slice(start, start + itemsPerPage);
  }, [processedRegistros, currentPage]);

  const totalPages = Math.max(1, Math.ceil(processedRegistros.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroFechaDesde, filtroFechaHasta]);

  const resetForm = () => {
    setEditingId(null);
    setBuscarPatente('');
    setBuscarApellido('');
    setIdMaquina('');
    setIdTrabajador('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setDetalles([]);
    setShowForm(false);
    setError('');
  };

  const lineaVacia = (): DetalleLinea => ({
    id_categoria: 0,
    idinsumo_39: 0,
    cantstd_39: 0,
    cantreal_39: 0,
    diferencia_39: 0,
  });

  const handleNuevo = () => {
    setSelectedRegistroId(null);
    setDetalleRegistro(null);
    resetForm();
    setShowForm(true);
    setDetalles([lineaVacia()]);
  };

  const handleExport = () => {
    const dataToExport = processedRegistros.map((r) => ({
      ID: r.idmcargomaquina_38,
      Fecha: r.fecha_38?.split('T')[0] || '',
      Maquina: r.maquina_ppu || r.maquina_numinterno || '',
      Trabajador: r.trabajador_nombre || '',
      Observacion: r.observacion_38 || '',
    }));
    exportToExcel(dataToExport, 'cargo-maquina', 'Cargo Maquina');
  };

  const fillFormFromMaestro = (
    maestro: MaestroCargoMaquina,
    dets: DetalleCargoMaquina[]
  ) => {
    setEditingId(maestro.idmcargomaquina_38);
    setIdMaquina(String(maestro.idmaquina_38));
    setIdTrabajador(String(maestro.idtrabajador_38));
    const d = new Date(maestro.fecha_38);
    setFecha(d.toISOString().split('T')[0]);
    setHora(d.toTimeString().slice(0, 5));
    setObservacion(maestro.observacion_38 || '');
    const maq = maquinas.find((m) => m.idmaquina_11 === maestro.idmaquina_38);
    if (maq) setBuscarPatente(maq.ppu_11 || maq.numinterno_11 || '');
    const trab = trabajadores.find((t) => t.idtrabajador_06 === maestro.idtrabajador_38);
    if (trab) setBuscarApellido(trab.apaterno_06 || '');
    setDetalles(
      dets.length
        ? dets.map((det) => {
            const ins = insumos.find((i) => i.id_insumo_43 === det.idinsumo_39);
            return {
              id_categoria: ins?.id_categoria_43 || 0,
              idinsumo_39: det.idinsumo_39,
              cantstd_39: det.cantstd_39,
              cantreal_39: det.cantreal_39,
              diferencia_39: det.diferencia_39 ?? det.cantreal_39 - det.cantstd_39,
            };
          })
        : [lineaVacia()]
    );
  };

  const startEdit = async (id: number) => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: MaestroCargoMaquina; detalles: DetalleCargoMaquina[] }> =
        await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar el registro');
        return;
      }
      fillFormFromMaestro(data.data.maestro, data.data.detalles);
      setShowForm(true);
    } catch {
      await showError('Error', 'Error de conexión al cargar el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRegistro = async (id: number) => {
    if (selectedRegistroId === id) {
      setSelectedRegistroId(null);
      setDetalleRegistro(null);
      return;
    }
    setSelectedRegistroId(id);
    setLoadingDetalle(true);
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: MaestroCargoMaquina; detalles: DetalleCargoMaquina[] }> =
        await res.json();
      if (data.success && data.data) {
        setDetalleRegistro(data.data);
      } else {
        setDetalleRegistro(null);
      }
    } catch {
      setDetalleRegistro(null);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleAgregarLinea = () => {
    setDetalles((prev) => [...prev, lineaVacia()]);
  };

  const handleQuitarLinea = (index: number) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLinea = (index: number, field: keyof DetalleLinea, value: number) => {
    setDetalles((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, [field]: value };
        if (field === 'id_categoria') {
          next.idinsumo_39 = 0;
        }
        next.diferencia_39 = Number(next.cantreal_39) - Number(next.cantstd_39);
        return next;
      })
    );
  };

  const handleGuardar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!idMaquina || !idTrabajador) {
      await showError('Validación', 'Seleccione máquina y trabajador');
      return;
    }
    const lineasValidas = detalles.filter((d) => d.idinsumo_39 > 0);
    if (!lineasValidas.length) {
      await showError('Validación', 'Agregue al menos un insumo en el detalle');
      return;
    }

    const fechaIso = new Date(`${fecha}T${hora}:00`).toISOString();
    const payload = {
      idmaquina_38: parseInt(idMaquina, 10),
      idtrabajador_38: parseInt(idTrabajador, 10),
      fecha_38: fechaIso,
      observacion_38: observacion.trim() || null,
      detalles: lineasValidas.map((d) => ({
        idinsumo_39: d.idinsumo_39,
        cantstd_39: Number(d.cantstd_39),
        cantreal_39: Number(d.cantreal_39),
      })),
    };

    try {
      setLoading(true);
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('¡Éxito!', data.message || 'Registro guardado');
        await fetchRegistros();
        resetForm();
        setSelectedRegistroId(null);
        setDetalleRegistro(null);
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    const ok = await showDeleteConfirm('este cargo de máquina');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('Eliminado', data.message || 'Registro eliminado');
        await fetchRegistros();
        if (editingId === id) resetForm();
        if (selectedRegistroId === id) {
          setSelectedRegistroId(null);
          setDetalleRegistro(null);
        }
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión al eliminar');
    }
  };

  const handleSort = (key: keyof MaestroCargoMaquina) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>🚛 Cargo Máquina</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleNuevo}
            style={{ backgroundColor: '#007bff' }}
          >
            ✏️ Nuevo
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!showForm}
            style={{ backgroundColor: '#28a745' }}
          >
            💾 Guardar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleExport}
            style={{ backgroundColor: '#dc3545' }}
          >
            📊 Exportar Excel
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>
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
            borderRadius: '8px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Editar Cargo Máquina' : '➕ Nuevo Cargo Máquina'}</h3>
          <form ref={formRef} onSubmit={handleGuardar}>
            <div className="form-row consumo-form-row-4">
              <div className="form-group">
                <label htmlFor="buscar-patente">Buscar Por Patente</label>
                <input
                  type="text"
                  id="buscar-patente"
                  className="form-input"
                  value={buscarPatente}
                  onChange={(e) => setBuscarPatente(e.target.value.toUpperCase())}
                  placeholder="PATENTE O NÚM. INTERNO"
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="form-tip">
                  💡 Tip: Escriba patente, número interno o descripción para filtrar máquinas.
                </small>
              </div>
              <div className="form-group">
                <label>Seleccionar Máquina *</label>
                <div className="ccosto-list" role="listbox" aria-label="Lista de máquinas">
                  {maquinasFiltradas.length > 0 ? (
                    maquinasFiltradas.map((m) => (
                      <div
                        key={m.idmaquina_11}
                        role="option"
                        tabIndex={0}
                        aria-selected={idMaquina === String(m.idmaquina_11)}
                        onClick={() => setIdMaquina(String(m.idmaquina_11))}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setIdMaquina(String(m.idmaquina_11))
                        }
                        className={`ccosto-list-item ${idMaquina === String(m.idmaquina_11) ? 'selected' : ''}`}
                      >
                        <strong>{m.ppu_11 || m.numinterno_11}</strong>
                        {m.descripcion_11 ? ` — ${m.descripcion_11}` : ''}
                      </div>
                    ))
                  ) : (
                    <div className="ccosto-list-empty">
                      {maquinas.length === 0 ? 'Cargando máquinas...' : 'No se encontraron máquinas'}
                    </div>
                  )}
                </div>
              </div>
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
                <small className="form-tip">
                  💡 Tip: Una palabra busca por apellido paterno primero, luego materno.
                </small>
              </div>
              <div className="form-group">
                <label>Seleccionar Trabajador *</label>
                <div className="ccosto-list" role="listbox" aria-label="Lista de trabajadores">
                  {trabajadoresFiltrados.length > 0 ? (
                    trabajadoresFiltrados.map((trab) => (
                      <div
                        key={trab.idtrabajador_06}
                        role="option"
                        tabIndex={0}
                        aria-selected={idTrabajador === String(trab.idtrabajador_06)}
                        onClick={() => setIdTrabajador(String(trab.idtrabajador_06))}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setIdTrabajador(String(trab.idtrabajador_06))
                        }
                        className={`ccosto-list-item ${idTrabajador === String(trab.idtrabajador_06) ? 'selected' : ''}`}
                      >
                        <strong>
                          {trab.apaterno_06 || ''} {trab.amaterno_06 || ''}
                        </strong>{' '}
                        {trab.nombre_06 || ''}
                        {trab.ruttrabajador_06 ? (
                          <span style={{ fontSize: '0.9em', opacity: 0.85 }}>
                            {' '}
                            — {trab.ruttrabajador_06}
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="ccosto-list-empty">
                      {trabajadores.length === 0
                        ? 'Cargando trabajadores...'
                        : 'No se encontraron trabajadores'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-row consumo-form-row-fecha">
              <div className="form-group">
                <label htmlFor="cargo-fecha">Fecha *</label>
                <input
                  type="date"
                  id="cargo-fecha"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="cargo-hora">Hora *</label>
                <input
                  type="time"
                  id="cargo-hora"
                  className="form-input"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                />
              </div>
              <div className="form-group form-group-flex">
                <label htmlFor="cargo-obs">Observación</label>
                <input
                  type="text"
                  id="cargo-obs"
                  className="form-input"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="detalle-section">
              <div className="detalle-header">
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                  Insumos del Cargo
                </label>
                <button type="button" className="btn-add-line" onClick={handleAgregarLinea}>
                  ➕ Agregar línea
                </button>
              </div>
              <div className="table-container detalle-insumos-grid">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Categoría *</th>
                      <th>Insumo *</th>
                      <th>Cant. Estándar *</th>
                      <th>Cant. Real *</th>
                      <th>Diferencia</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>
                          No hay insumos. Use &quot;Agregar línea&quot; para comenzar.
                        </td>
                      </tr>
                    ) : (
                      detalles.map((line, idx) => {
                        const insumosFiltrados = line.id_categoria
                          ? insumos.filter((i) => i.id_categoria_43 === line.id_categoria)
                          : [];
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-input form-input-sm"
                                value={line.id_categoria || ''}
                                onChange={(e) =>
                                  updateLinea(idx, 'id_categoria', parseInt(e.target.value, 10) || 0)
                                }
                                required={idx === 0}
                                aria-label="Seleccionar categoría"
                              >
                                <option value="">Seleccione...</option>
                                {categoriasOrdenadas.map((c) => (
                                  <option key={c.id_categoria_42} value={c.id_categoria_42}>
                                    {c.categoria_42}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-input form-input-sm"
                                value={line.idinsumo_39 || ''}
                                onChange={(e) =>
                                  updateLinea(idx, 'idinsumo_39', parseInt(e.target.value, 10) || 0)
                                }
                                required={idx === 0}
                                disabled={!line.id_categoria}
                                aria-label="Seleccionar insumo"
                              >
                                <option value="">Seleccione...</option>
                                {insumosFiltrados.map((ins) => (
                                  <option key={ins.id_insumo_43} value={ins.id_insumo_43}>
                                    {ins.descripcion_43}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-input form-input-sm input-cantidad-centrado"
                                value={line.cantstd_39 || ''}
                                onChange={(e) =>
                                  updateLinea(idx, 'cantstd_39', parseCantidad(e.target.value))
                                }
                                min={0}
                                step={1}
                                required={idx === 0}
                                aria-label="Cantidad estándar"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-input form-input-sm input-cantidad-centrado"
                                value={line.cantreal_39 || ''}
                                onChange={(e) =>
                                  updateLinea(idx, 'cantreal_39', parseCantidad(e.target.value))
                                }
                                min={0}
                                step={1}
                                required={idx === 0}
                                aria-label="Cantidad real"
                              />
                            </td>
                            <td
                              className="td-cantidad"
                              style={{
                                textAlign: 'center',
                                color: line.diferencia_39 !== 0 ? '#dc3545' : '#007bff',
                              }}
                            >
                              {line.diferencia_39}
                            </td>
                            <td className="actions">
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() => handleQuitarLinea(idx)}
                                disabled={detalles.length <= 1}
                                title="Quitar línea"
                                aria-label="Eliminar línea"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="form-actions"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '20px',
              }}
            >
              <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                💡 La diferencia se calcula automáticamente (Real − Estándar).
              </span>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="form-container" style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              📅 Período: {filtroFechaDesde || '…'} — {filtroFechaHasta || '…'} (Total:{' '}
              {processedRegistros.length})
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 240px)',
              gap: '10px',
            }}
          >
            <input
              type="text"
              placeholder="🔍 Buscar cargo máquina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px',
                textTransform: 'uppercase',
              }}
              aria-label="Buscar cargo máquina"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                }}
                aria-label="Filtrar desde fecha"
              />
              <input
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                }}
                aria-label="Filtrar hasta fecha"
              />
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortConfig?.key === 'idmcargomaquina_38' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('idmcargomaquina_38')}
                  >
                    ID
                  </th>
                  <th
                    className={`sortable ${sortConfig?.key === 'fecha_38' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                    onClick={() => handleSort('fecha_38')}
                  >
                    FECHA
                  </th>
                  <th>MAQUINA</th>
                  <th>TRABAJADOR</th>
                  <th>OBSERVACIÓN</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      {searchTerm
                        ? `📋 No se encontraron registros con "${searchTerm}"`
                        : '📋 No hay cargos de máquina registrados'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((row) => {
                    const isSelected = selectedRegistroId === row.idmcargomaquina_38;
                    return (
                      <tr
                        key={row.idmcargomaquina_38}
                        className={`fade-in consumo-maestro-row ${isSelected ? 'consumo-row-selected' : ''}`}
                        onClick={() => handleSelectRegistro(row.idmcargomaquina_38)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleSelectRegistro(row.idmcargomaquina_38)
                        }
                        aria-label={`Ver detalle del cargo ${row.idmcargomaquina_38}`}
                      >
                        <td>{row.idmcargomaquina_38}</td>
                        <td>{row.fecha_38 ? row.fecha_38.split('T')[0] : '-'}</td>
                        <td>
                          {row.maquina_ppu || row.maquina_numinterno || '-'}
                          {row.maquina_descripcion ? ` (${row.maquina_descripcion})` : ''}
                        </td>
                        <td>{row.trabajador_nombre || '-'}</td>
                        <td>{row.observacion_38 || '-'}</td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => startEdit(row.idmcargomaquina_38)}
                            title="Editar"
                            aria-label="Editar cargo"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleEliminar(row.idmcargomaquina_38)}
                            title="Eliminar"
                            aria-label="Eliminar cargo"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {processedRegistros.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedRegistros.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}

          {loadingDetalle && (
            <div className="detalle-loading">⏳ Cargando detalle...</div>
          )}

          {detalleRegistro && !loadingDetalle && (
            <div className="detalle-grid-container">
              <div className="detalle-grid-header">
                <h4>
                  Detalle cargo #{detalleRegistro.maestro.idmcargomaquina_38} —{' '}
                  {detalleRegistro.maestro.maquina_ppu || detalleRegistro.maestro.maquina_numinterno}
                </h4>
                <button
                  type="button"
                  className="btn-secondary btn-cerrar-detalle"
                  onClick={() => {
                    setSelectedRegistroId(null);
                    setDetalleRegistro(null);
                  }}
                >
                  ✕ Cerrar detalle
                </button>
              </div>
              <div className="table-container detalle-insumos-grid">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>INSUMO</th>
                      <th>CANT. ESTÁNDAR</th>
                      <th>CANT. REAL</th>
                      <th>DIFERENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleRegistro.detalles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="no-data">
                          Sin líneas de detalle
                        </td>
                      </tr>
                    ) : (
                      detalleRegistro.detalles.map((d) => (
                        <tr key={d.iddcargomaquina_39} className="consumo-detalle-row">
                          <td>{d.insumo_descripcion || d.idinsumo_39}</td>
                          <td className="td-cantidad">{d.cantstd_39}</td>
                          <td className="td-cantidad">{d.cantreal_39}</td>
                          <td
                            className="td-cantidad"
                            style={{ color: d.diferencia_39 !== 0 ? '#dc3545' : '#007bff' }}
                          >
                            {d.diferencia_39}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {loading && !showForm && <div className="loading">⏳ Cargando...</div>}
    </div>
  );
};

export default CargoMaquinaView;
