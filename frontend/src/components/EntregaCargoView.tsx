import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { filtrarTrabajadoresPorApellido } from '../utils/trabajadorSearch';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl, openAuthenticatedBlob } from '../lib/apiClient';

interface Maestro {
  identrega_67: number;
  folio_67?: string | null;
  idtrabajador_67: number;
  idresponsable_67: number;
  idccosto_67: number;
  fecha_67: string;
  hora_67: string;
  estado_67: string;
  observacion_67?: string | null;
  trabajador_nombre?: string;
  trabajador_rut?: string;
  responsable_nombre?: string;
  ccosto_nombre?: string;
}

interface Detalle {
  iddetalle_68: number;
  identrega_68: number;
  idherramienta_68: number;
  cantidad_68: number;
  cantidad_devuelta_68: number;
  estado_entrega_68: string;
  pendiente?: number;
  herramienta_codigo?: string;
  herramienta_nombre?: string;
  herramienta_serie?: string | null;
}

interface HerramientaCargo {
  idherramienta_66: number;
  codigo_66: string;
  nombre_66: string;
  serie_66?: string | null;
  stock_disponible_66: number;
  estado_66: string;
  activo_66: boolean;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06?: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
}

interface Responsable {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
}

interface Ccosto {
  id_ccosto_45: number;
  ccosto_45: string;
}

interface LineaForm {
  idherramienta_68: number;
  cantidad_68: number;
  estado_entrega_68: string;
  label: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const ESTADOS_ENTREGA = ['BUENA', 'REGULAR', 'DANADA'] as const;
const ESTADOS_DEV = ['BUENA', 'REGULAR', 'DANADA', 'PERDIDA'] as const;

const EntregaCargoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<Maestro[]>([]);
  const [herramientas, setHerramientas] = useState<HerramientaCargo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [ccostos, setCcostos] = useState<Ccosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idTrabajador, setIdTrabajador] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [idCcosto, setIdCcosto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<LineaForm[]>([]);
  const [herrSel, setHerrSel] = useState('');
  const [cantSel, setCantSel] = useState('1');
  const [estadoSel, setEstadoSel] = useState('BUENA');

  const [detalleModal, setDetalleModal] = useState<{ maestro: Maestro; detalles: Detalle[] } | null>(null);
  const [devCant, setDevCant] = useState('1');
  const [devEstado, setDevEstado] = useState('BUENA');
  const [devObs, setDevObs] = useState('');
  const [devLineaId, setDevLineaId] = useState<number | null>(null);

  const API_URL = apiUrl('/entregas-cargo');

  const loadList = async () => {
    const res = await apiFetch(API_URL);
    const data: ApiResponse<Maestro[]> = await res.json();
    if (data.success && Array.isArray(data.data)) setRegistros(data.data);
    else setError(data.error || 'Error al cargar entregas');
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [eRes, hRes, tRes, rRes, cRes] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(apiUrl('/herramientas-cargo')),
        apiFetch(apiUrl('/trabajadores')),
        apiFetch(apiUrl('/responsables-entrega')),
        apiFetch(apiUrl('/ccostos')),
      ]);
      const eData: ApiResponse<Maestro[]> = await eRes.json();
      const hData: ApiResponse<HerramientaCargo[]> = await hRes.json();
      const tData: ApiResponse<Trabajador[]> = await tRes.json();
      const rData: ApiResponse<Responsable[]> = await rRes.json();
      const cData: ApiResponse<Ccosto[]> = await cRes.json();
      if (eData.success && Array.isArray(eData.data)) setRegistros(eData.data);
      else setError(eData.error || 'Error al cargar entregas');
      if (hData.success && Array.isArray(hData.data)) setHerramientas(hData.data);
      if (tData.success && Array.isArray(tData.data)) setTrabajadores(tData.data);
      if (rData.success && Array.isArray(rData.data)) setResponsables(rData.data);
      if (cData.success && Array.isArray(cData.data)) setCcostos(cData.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const trabajadorOptions = useMemo(
    () =>
      filtrarTrabajadoresPorApellido(trabajadores, '').map((t) => ({
        value: String(t.idtrabajador_06),
        label: `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06}`.trim() +
          (t.ruttrabajador_06 ? ` — ${t.ruttrabajador_06}` : ''),
      })),
    [trabajadores]
  );

  const responsableOptions = useMemo(
    () =>
      responsables.map((r) => ({
        value: String(r.idresponsableentrega_08),
        label: `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''} ${r.amaternoresponsableentrega_08 || ''}`.trim(),
      })),
    [responsables]
  );

  const ccostoOptions = useMemo(
    () => ccostos.map((c) => ({ value: String(c.id_ccosto_45), label: c.ccosto_45 })),
    [ccostos]
  );

  const herramientaOptions = useMemo(
    () =>
      herramientas
        .filter((h) => h.activo_66 && Number(h.stock_disponible_66) > 0)
        .filter((h) => !['PERDIDA', 'DANADA', 'DE_BAJA', 'EN_MANTENCION'].includes(h.estado_66))
        .map((h) => ({
          value: String(h.idherramienta_66),
          label: `${h.codigo_66} — ${h.nombre_66}${h.serie_66 ? ` (S:${h.serie_66})` : ''} [disp:${h.stock_disponible_66}]`,
        })),
    [herramientas]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return registros.filter((r) => {
      if (filtroEstado && r.estado_67 !== filtroEstado) return false;
      if (!q) return true;
      return (
        (r.folio_67 || '').toLowerCase().includes(q) ||
        (r.trabajador_nombre || '').toLowerCase().includes(q) ||
        (r.ccosto_nombre || '').toLowerCase().includes(q)
      );
    });
  }, [registros, searchTerm, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado]);

  const resetForm = () => {
    setIdTrabajador('');
    setIdResponsable('');
    setIdCcosto('');
    setFecha(new Date().toISOString().slice(0, 10));
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setDetalles([]);
    setHerrSel('');
    setCantSel('1');
    setEstadoSel('BUENA');
    setShowForm(false);
  };

  const addLinea = () => {
    const idH = Number(herrSel);
    if (!idH) {
      showError('Validación', 'Seleccione una herramienta');
      return;
    }
    if (detalles.some((d) => d.idherramienta_68 === idH)) {
      showError('Validación', 'Esa herramienta ya está en el detalle');
      return;
    }
    const h = herramientas.find((x) => x.idherramienta_66 === idH);
    if (!h) return;
    let cant = Number(cantSel) || 1;
    if (h.serie_66) cant = 1;
    if (cant < 1 || cant > Number(h.stock_disponible_66)) {
      showError('Validación', `Cantidad inválida (máx. ${h.stock_disponible_66})`);
      return;
    }
    setDetalles((prev) => [
      ...prev,
      {
        idherramienta_68: idH,
        cantidad_68: cant,
        estado_entrega_68: estadoSel,
        label: `${h.codigo_66} — ${h.nombre_66}`,
      },
    ]);
    setHerrSel('');
    setCantSel('1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idTrabajador || !idResponsable || !idCcosto) {
      await showError('Validación', 'Trabajador, responsable y centro de costo son obligatorios');
      return;
    }
    if (!detalles.length) {
      await showError('Validación', 'Agregue al menos una herramienta');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          idtrabajador_67: Number(idTrabajador),
          idresponsable_67: Number(idResponsable),
          idccosto_67: Number(idCcosto),
          fecha_67: fecha,
          hora_67: hora,
          observacion_67: observacion.trim() || null,
          detalles: detalles.map((d) => ({
            idherramienta_68: d.idherramienta_68,
            cantidad_68: d.cantidad_68,
            estado_entrega_68: d.estado_entrega_68,
          })),
        }),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('Entrega creada', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo crear');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const openDetalle = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: Maestro; detalles: Detalle[] }> = await res.json();
      if (data.success && data.data) {
        setDetalleModal(data.data);
        setDevLineaId(null);
        setDevCant('1');
        setDevEstado('BUENA');
        setDevObs('');
      } else {
        await showError('Error', data.error || 'No se pudo cargar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const devolverLinea = async () => {
    if (!devLineaId) return;
    const cant = Number(devCant);
    if (!cant || cant < 1) {
      await showError('Validación', 'Cantidad inválida');
      return;
    }
    try {
      const res = await apiFetch(`${API_URL}/devoluciones`, {
        method: 'POST',
        body: JSON.stringify({
          iddetalle_69: devLineaId,
          cantidad_69: cant,
          estado_herramienta_69: devEstado,
          idresponsable_69: idResponsable ? Number(idResponsable) : null,
          observacion_69: devObs.trim() || null,
        }),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('Devolución', data.message || 'Registrada');
        const mid = detalleModal?.maestro.identrega_67;
        await loadList();
        if (mid) await openDetalle(mid);
      } else {
        await showError('Error', data.error || 'No se pudo devolver');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const devolverTodo = async (id: number) => {
    const ok = await showDeleteConfirm('devolver TODO lo pendiente de esta entrega');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}/devolver-todo`, {
        method: 'POST',
        body: JSON.stringify({
          estado_herramienta_69: 'BUENA',
          idresponsable_69: idResponsable ? Number(idResponsable) : null,
        }),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('Devolución total', data.message || 'OK');
        await loadList();
        if (detalleModal?.maestro.identrega_67 === id) await openDetalle(id);
      } else {
        await showError('Error', data.error || 'No se pudo devolver');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const anular = async (id: number) => {
    const ok = await showDeleteConfirm('anular esta entrega (restaura stock pendiente)');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}/anular`, { method: 'POST' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await showSuccess('Anulada', data.message || 'OK');
        setDetalleModal(null);
        await loadList();
      } else {
        await showError('Error', data.error || 'No se pudo anular');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const pdfActa = (id: number) => {
    openAuthenticatedBlob(`/entregas-cargo/${id}/acta-pdf`).catch(() =>
      showError('Error', 'No se pudo abrir el PDF')
    );
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((r) => ({
        ID: r.identrega_67,
        Folio: r.folio_67 || '',
        Fecha: String(r.fecha_67).slice(0, 10),
        Trabajador: r.trabajador_nombre || '',
        RUT: r.trabajador_rut || '',
        CCosto: r.ccosto_nombre || '',
        Responsable: r.responsable_nombre || '',
        Estado: r.estado_67,
      })),
      'entregas-herramienta-cargo'
    );
  };

  if (loading) return <div className="loading">Cargando entregas...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Herramientas a cargo — Entregas</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + Nueva entrega
          </button>
          <button type="button" className="btn-success" disabled={!showForm || saving} onClick={() => formRef.current?.requestSubmit()}>
            Guardar
          </button>
          <button type="button" className="btn-info" onClick={handleExport}>Excel</button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>Nueva entrega a cargo</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="trabajador">Trabajador *</label>
                <SearchableSelect
                  id="trabajador"
                  value={idTrabajador}
                  onChange={setIdTrabajador}
                  options={trabajadorOptions}
                  placeholder="Buscar trabajador..."
                  aria-label="Trabajador"
                />
              </div>
              <div className="form-group">
                <label htmlFor="responsable">Responsable *</label>
                <SearchableSelect
                  id="responsable"
                  value={idResponsable}
                  onChange={setIdResponsable}
                  options={responsableOptions}
                  placeholder="Buscar responsable..."
                  aria-label="Responsable"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ccosto">Centro de costo *</label>
                <SearchableSelect
                  id="ccosto"
                  value={idCcosto}
                  onChange={setIdCcosto}
                  options={ccostoOptions}
                  placeholder="Buscar ccosto..."
                  aria-label="Centro de costo"
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="fecha">Fecha</label>
                <input id="fecha" type="date" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="hora">Hora</label>
                <input id="hora" type="time" className="form-input" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="obs">Observación</label>
                <input id="obs" className="form-input" value={observacion} onChange={(e) => setObservacion(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="form-row form-row-3" style={{ alignItems: 'end' }}>
              <div className="form-group">
                <label htmlFor="herr">Herramienta</label>
                <SearchableSelect
                  id="herr"
                  value={herrSel}
                  onChange={(v) => {
                    setHerrSel(v);
                    const h = herramientas.find((x) => String(x.idherramienta_66) === v);
                    if (h?.serie_66) setCantSel('1');
                  }}
                  options={herramientaOptions}
                  placeholder="Buscar herramienta disponible..."
                  aria-label="Herramienta"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cant">Cantidad</label>
                <input
                  id="cant"
                  type="number"
                  min={1}
                  className="form-input"
                  value={cantSel}
                  onChange={(e) => setCantSel(e.target.value)}
                  disabled={Boolean(herramientas.find((h) => String(h.idherramienta_66) === herrSel)?.serie_66)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="est">Estado entrega</label>
                <select id="est" className="form-input" value={estadoSel} onChange={(e) => setEstadoSel(e.target.value)}>
                  {ESTADOS_ENTREGA.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={addLinea} style={{ marginBottom: 12 }}>
              + Agregar línea
            </button>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Herramienta</th>
                    <th>Cant.</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr><td colSpan={4}>Sin líneas</td></tr>
                  ) : (
                    detalles.map((d) => (
                      <tr key={d.idherramienta_68}>
                        <td>{d.label}</td>
                        <td>{d.cantidad_68}</td>
                        <td>{d.estado_entrega_68}</td>
                        <td>
                          <button type="button" className="btn-delete" onClick={() => setDetalles((p) => p.filter((x) => x.idherramienta_68 !== d.idherramienta_68))}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </form>
        </div>
      )}

      <div className="filters-row" style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar folio, trabajador, ccosto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar entregas"
        />
        <select className="form-input" style={{ maxWidth: 180 }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          <option value="ACTIVA">ACTIVA</option>
          <option value="PARCIAL">PARCIAL</option>
          <option value="DEVUELTA">DEVUELTA</option>
          <option value="ANULADA">ANULADA</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Trabajador</th>
              <th>CCosto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={6}>Sin registros</td></tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.identrega_67}>
                  <td>{r.folio_67 || r.identrega_67}</td>
                  <td>{String(r.fecha_67).slice(0, 10)}</td>
                  <td>{r.trabajador_nombre}</td>
                  <td>{r.ccosto_nombre}</td>
                  <td>{r.estado_67}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn-edit" onClick={() => openDetalle(r.identrega_67)}>Ver / Devolver</button>
                    <button type="button" className="btn-info" onClick={() => pdfActa(r.identrega_67)}>PDF</button>
                    {(r.estado_67 === 'ACTIVA' || r.estado_67 === 'PARCIAL') && (
                      <button type="button" className="btn-success" onClick={() => devolverTodo(r.identrega_67)}>Devolver todo</button>
                    )}
                    {r.estado_67 !== 'ANULADA' && r.estado_67 !== 'DEVUELTA' && (
                      <button type="button" className="btn-delete" onClick={() => anular(r.identrega_67)}>Anular</button>
                    )}
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
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {detalleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle entrega"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setDetalleModal(null)}
        >
          <div
            className="form-container"
            style={{ maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto', background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Entrega {detalleModal.maestro.folio_67} — {detalleModal.maestro.estado_67}</h3>
            <p>
              {detalleModal.maestro.trabajador_nombre} · {detalleModal.maestro.ccosto_nombre} ·{' '}
              {String(detalleModal.maestro.fecha_67).slice(0, 10)}
            </p>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Herramienta</th>
                    <th>Cant.</th>
                    <th>Dev.</th>
                    <th>Pend.</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleModal.detalles.map((d) => {
                    const pend = Number(d.pendiente ?? d.cantidad_68 - d.cantidad_devuelta_68);
                    return (
                      <tr key={d.iddetalle_68}>
                        <td>{d.herramienta_codigo}</td>
                        <td>{d.herramienta_nombre}{d.herramienta_serie ? ` (${d.herramienta_serie})` : ''}</td>
                        <td>{d.cantidad_68}</td>
                        <td>{d.cantidad_devuelta_68}</td>
                        <td>{pend}</td>
                        <td>
                          {pend > 0 && detalleModal.maestro.estado_67 !== 'ANULADA' && (
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => {
                                setDevLineaId(d.iddetalle_68);
                                setDevCant(String(pend));
                              }}
                            >
                              Devolver
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {devLineaId != null && (
              <div className="form-row form-row-3" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label htmlFor="dev-cant">Cantidad a devolver</label>
                  <input id="dev-cant" type="number" min={1} className="form-input" value={devCant} onChange={(e) => setDevCant(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="dev-est">Estado herramienta</label>
                  <select id="dev-est" className="form-input" value={devEstado} onChange={(e) => setDevEstado(e.target.value)}>
                    {ESTADOS_DEV.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="dev-obs">Obs.</label>
                  <input id="dev-obs" className="form-input" value={devObs} onChange={(e) => setDevObs(e.target.value.toUpperCase())} />
                </div>
                <div className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                  <button type="button" className="btn-success" onClick={devolverLinea}>Confirmar devolución</button>
                  <button type="button" className="btn-secondary" onClick={() => setDevLineaId(null)}>Cancelar</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" className="btn-info" onClick={() => pdfActa(detalleModal.maestro.identrega_67)}>PDF acta</button>
              <button type="button" className="btn-secondary" onClick={() => setDetalleModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntregaCargoView;
