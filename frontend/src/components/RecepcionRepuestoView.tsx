import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Maestro {
  idrecepcion_59: number;
  folio_59?: string | null;
  idmaquina_59: number;
  idtecnico_59: number;
  idresponsable_59: number;
  idproveedor_59: number;
  fecha_59: string;
  hora_59: string;
  observacion_59?: string | null;
  maquina_descripcion?: string;
  maquina_numinterno?: string;
  tecnico_nombre?: string;
  responsable_nombre?: string;
  proveedor_nombre?: string;
}

interface DetalleLinea {
  idrepuestodanado_60: number;
  cantidad_60: number;
  estado_60: string;
  observacion_60?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const ESTADOS = ['PENDIENTE', 'ENVIADO_PROVEEDOR', 'RECIBIDO', 'ANULADO'] as const;

const RecepcionRepuestoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<Maestro[]>([]);
  const [maquinas, setMaquinas] = useState<Array<{
    idmaquina_11: number;
    numinterno_11?: string;
    ppu_11?: string;
    descripcion_11?: string;
    estado_11?: boolean;
  }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id_tecnico_21: number; nombres_21: string; a_paterno_21?: string; a_materno_21?: string; estado_21?: boolean }>>([]);
  const [responsables, setResponsables] = useState<Array<{ idresponsableentrega_08: number; nombreresponsableentrega_08: string; apaternoresponsableentrega_08?: string; amaternoresponsableentrega_08?: string }>>([]);
  const [proveedores, setProveedores] = useState<Array<{ idproveedor_58: number; nombre_58: string; activo_58: boolean }>>([]);
  const [repuestos, setRepuestos] = useState<Array<{ idrepuestodanado_57: number; codigo_57?: string | null; nombre_57: string; activo_57: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idMaquina, setIdMaquina] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [idResponsable, setIdResponsable] = useState('');
  const [idProveedor, setIdProveedor] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<DetalleLinea[]>([]);
  const [repuestoSel, setRepuestoSel] = useState('');
  const [cantidadSel, setCantidadSel] = useState('1');
  const [estadoSel, setEstadoSel] = useState<string>('PENDIENTE');

  const API_URL = apiUrl('/recepciones-repuestos');

  const maquinaOptions = useMemo(
    () =>
      maquinas
        .filter((m) => m.estado_11 !== false)
        .map((m) => ({
          value: String(m.idmaquina_11),
          label: [
            m.numinterno_11 || m.idmaquina_11,
            m.ppu_11 ? `(${m.ppu_11})` : null,
            m.descripcion_11 || '',
          ]
            .filter(Boolean)
            .join(' — '),
        })),
    [maquinas]
  );

  const tecnicoOptions = useMemo(
    () =>
      tecnicos
        .filter((t) => t.estado_21 !== false)
        .map((t) => ({
          value: String(t.id_tecnico_21),
          label: `${t.nombres_21} ${t.a_paterno_21 || ''} ${t.a_materno_21 || ''}`.trim(),
        })),
    [tecnicos]
  );

  const responsableOptions = useMemo(
    () =>
      responsables.map((r) => ({
        value: String(r.idresponsableentrega_08),
        label: `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''} ${r.amaternoresponsableentrega_08 || ''}`.trim(),
      })),
    [responsables]
  );

  const proveedorOptions = useMemo(
    () =>
      proveedores
        .filter((p) => p.activo_58)
        .map((p) => ({
          value: String(p.idproveedor_58),
          label: p.nombre_58,
        })),
    [proveedores]
  );

  const repuestoOptions = useMemo(
    () =>
      repuestos
        .filter(
          (r) =>
            r.activo_57 &&
            !detalles.some((d) => d.idrepuestodanado_60 === r.idrepuestodanado_57)
        )
        .map((r) => ({
          value: String(r.idrepuestodanado_57),
          label: `${r.codigo_57 ? `${r.codigo_57} - ` : ''}${r.nombre_57}`,
        })),
    [repuestos, detalles]
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [rRec, rMaq, rTec, rResp, rProv, rRep] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(apiUrl('/maquinas')),
        apiFetch(apiUrl('/tecnicos')),
        apiFetch(apiUrl('/responsables-entrega')),
        apiFetch(apiUrl('/proveedores')),
        apiFetch(apiUrl('/repuestos-danados')),
      ]);
      const [dRec, dMaq, dTec, dResp, dProv, dRep] = await Promise.all([
        rRec.json(), rMaq.json(), rTec.json(), rResp.json(), rProv.json(), rRep.json(),
      ]);
      if (dRec.success && Array.isArray(dRec.data)) setRegistros(dRec.data);
      else setError(dRec.error || 'Error al cargar recepciones');
      if (dMaq.success && Array.isArray(dMaq.data)) setMaquinas(dMaq.data);
      if (dTec.success && Array.isArray(dTec.data)) setTecnicos(dTec.data);
      if (dResp.success && Array.isArray(dResp.data)) setResponsables(dResp.data);
      if (dProv.success && Array.isArray(dProv.data)) setProveedores(dProv.data);
      if (dRep.success && Array.isArray(dRep.data)) setRepuestos(dRep.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter((r) =>
      String(r.folio_59 || '').toLowerCase().includes(q) ||
      (r.maquina_descripcion || '').toLowerCase().includes(q) ||
      (r.tecnico_nombre || '').toLowerCase().includes(q) ||
      (r.proveedor_nombre || '').toLowerCase().includes(q) ||
      String(r.idrecepcion_59).includes(q)
    );
  }, [registros, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setIdMaquina('');
    setIdTecnico('');
    setIdResponsable('');
    setIdProveedor('');
    setFecha(new Date().toISOString().slice(0, 10));
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setDetalles([]);
    setRepuestoSel('');
    setCantidadSel('1');
    setEstadoSel('PENDIENTE');
  };

  const addDetalle = () => {
    const idR = Number(repuestoSel);
    const cant = Number(cantidadSel);
    if (!idR || !cant || cant < 1) {
      showError('Validación', 'Seleccione repuesto y cantidad válida');
      return;
    }
    if (detalles.some((d) => d.idrepuestodanado_60 === idR)) {
      showError('Validación', 'Ese repuesto ya está en el detalle');
      return;
    }
    setDetalles((prev) => [
      ...prev,
      { idrepuestodanado_60: idR, cantidad_60: cant, estado_60: estadoSel, observacion_60: '' },
    ]);
    setRepuestoSel('');
    setCantidadSel('1');
    setEstadoSel('PENDIENTE');
  };

  const startEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: Maestro; detalles: Array<DetalleLinea & { observacion_60?: string }> }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar');
        return;
      }
      const { maestro, detalles: dets } = data.data;
      setEditingId(id);
      setIdMaquina(String(maestro.idmaquina_59));
      setIdTecnico(String(maestro.idtecnico_59));
      setIdResponsable(String(maestro.idresponsable_59));
      setIdProveedor(String(maestro.idproveedor_59));
      setFecha(String(maestro.fecha_59).slice(0, 10));
      setHora(String(maestro.hora_59).slice(0, 5));
      setObservacion(maestro.observacion_59 || '');
      setDetalles(
        (dets || []).map((d) => ({
          idrepuestodanado_60: d.idrepuestodanado_60,
          cantidad_60: d.cantidad_60,
          estado_60: d.estado_60 || 'PENDIENTE',
          observacion_60: d.observacion_60 || '',
        }))
      );
      setShowForm(true);
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idMaquina || !idTecnico || !idResponsable || !idProveedor) {
      await showError('Validación', 'Complete máquina, técnico, responsable y proveedor');
      return;
    }
    if (!detalles.length) {
      await showError('Validación', 'Agregue al menos un repuesto en el detalle');
      return;
    }
    const payload = {
      idmaquina_59: Number(idMaquina),
      idtecnico_59: Number(idTecnico),
      idresponsable_59: Number(idResponsable),
      idproveedor_59: Number(idProveedor),
      fecha_59: fecha || null,
      hora_59: hora || null,
      observacion_59: observacion.trim() || null,
      detalles: detalles.map((d) => ({
        idrepuestodanado_60: d.idrepuestodanado_60,
        cantidad_60: d.cantidad_60,
        estado_60: d.estado_60,
        observacion_60: d.observacion_60 || null,
      })),
    };
    setSaving(true);
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess(editingId ? 'Actualizado' : 'Creado', data.message || 'OK');
      } else {
        await showError('Error', data.error || data.message || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('esta recepción');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Eliminado', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const nombreRepuesto = (id: number) => {
    const r = repuestos.find((x) => x.idrepuestodanado_57 === id);
    return r ? `${r.codigo_57 ? `${r.codigo_57} - ` : ''}${r.nombre_57}` : String(id);
  };

  if (loading) return <div className="loading">Cargando recepciones...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Recepción de Repuestos Dañados</h2>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Nuevo</button>
          <button type="button" className="btn-success" disabled={!showForm || saving} onClick={() => formRef.current?.requestSubmit()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => { window.location.hash = 'dashboard'; }}>Salir</button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? `Editar recepción #${editingId}` : 'Nueva recepción'}</h3>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idmaquina">Máquina *</label>
                <SearchableSelect
                  id="idmaquina"
                  value={idMaquina}
                  onChange={setIdMaquina}
                  options={maquinaOptions}
                  required
                  placeholder="Buscar por Nº interno, PPU o descripción..."
                  aria-label="Buscar o seleccionar máquina"
                  emptyMessage="No se encontraron máquinas"
                />
              </div>
              <div className="form-group">
                <label htmlFor="idtecnico">Técnico *</label>
                <SearchableSelect
                  id="idtecnico"
                  value={idTecnico}
                  onChange={setIdTecnico}
                  options={tecnicoOptions}
                  required
                  placeholder="Buscar técnico..."
                  aria-label="Buscar o seleccionar técnico"
                  emptyMessage="No se encontraron técnicos"
                />
              </div>
              <div className="form-group">
                <label htmlFor="idresponsable">Responsable bodega *</label>
                <SearchableSelect
                  id="idresponsable"
                  value={idResponsable}
                  onChange={setIdResponsable}
                  options={responsableOptions}
                  required
                  placeholder="Buscar responsable..."
                  aria-label="Buscar o seleccionar responsable"
                  emptyMessage="No se encontraron responsables"
                />
              </div>
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idproveedor">Proveedor *</label>
                <SearchableSelect
                  id="idproveedor"
                  value={idProveedor}
                  onChange={setIdProveedor}
                  options={proveedorOptions}
                  required
                  placeholder="Buscar proveedor..."
                  aria-label="Buscar o seleccionar proveedor"
                  emptyMessage="No se encontraron proveedores"
                />
              </div>
              <div className="form-group">
                <label htmlFor="fecha">Fecha *</label>
                <input id="fecha" type="date" className="form-input" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="hora">Hora *</label>
                <input id="hora" type="time" className="form-input" required value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="obs">Observación</label>
              <textarea id="obs" className="form-input" rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>

            <h4>Detalle de repuestos (estado por línea)</h4>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="repuesto">Repuesto</label>
                <SearchableSelect
                  id="repuesto"
                  value={repuestoSel}
                  onChange={setRepuestoSel}
                  options={repuestoOptions}
                  placeholder="Buscar código o nombre..."
                  aria-label="Buscar o seleccionar repuesto"
                  emptyMessage="No hay repuestos disponibles"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cant">Cantidad</label>
                <input id="cant" type="number" min={1} className="form-input" value={cantidadSel} onChange={(e) => setCantidadSel(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="estado-linea">Estado línea</label>
                <select id="estado-linea" className="form-input" value={estadoSel} onChange={(e) => setEstadoSel(e.target.value)}>
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={addDetalle} style={{ marginBottom: 12 }}>+ Agregar línea</button>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Repuesto</th>
                    <th>Cant.</th>
                    <th>Estado</th>
                    <th>Obs.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr><td colSpan={5}>Sin líneas</td></tr>
                  ) : (
                    detalles.map((d, idx) => (
                      <tr key={`${d.idrepuestodanado_60}-${idx}`}>
                        <td>{nombreRepuesto(d.idrepuestodanado_60)}</td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            className="form-input"
                            value={d.cantidad_60}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setDetalles((prev) => prev.map((x, i) => (i === idx ? { ...x, cantidad_60: v } : x)));
                            }}
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-input"
                            value={d.estado_60}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDetalles((prev) => prev.map((x, i) => (i === idx ? { ...x, estado_60: v } : x)));
                            }}
                          >
                            {ESTADOS.map((est) => <option key={est} value={est}>{est}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={d.observacion_60 || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDetalles((prev) => prev.map((x, i) => (i === idx ? { ...x, observacion_60: v } : x)));
                            }}
                          />
                        </td>
                        <td>
                          <button type="button" className="btn-delete" onClick={() => setDetalles((prev) => prev.filter((_, i) => i !== idx))} aria-label="Quitar">🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success" disabled={saving}>{editingId ? 'Actualizar' : 'Crear'}</button>
              <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <input type="search" className="form-input" placeholder="🔍 BUSCAR FOLIO, MÁQUINA, TÉCNICO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} aria-label="Buscar recepciones" />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Máquina</th>
              <th>Técnico</th>
              <th>Proveedor</th>
              <th>Responsable</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={8}>No hay recepciones</td></tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.idrecepcion_59}>
                  <td>{r.idrecepcion_59}</td>
                  <td><strong>{r.folio_59 || '-'}</strong></td>
                  <td>{String(r.fecha_59).slice(0, 10)} {String(r.hora_59).slice(0, 5)}</td>
                  <td>{r.maquina_numinterno || r.idmaquina_59} — {r.maquina_descripcion || ''}</td>
                  <td>{r.tecnico_nombre || '-'}</td>
                  <td>{r.proveedor_nombre || '-'}</td>
                  <td>{r.responsable_nombre || '-'}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(r.idrecepcion_59)} aria-label="Editar">✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(r.idrecepcion_59)} aria-label="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default RecepcionRepuestoView;
