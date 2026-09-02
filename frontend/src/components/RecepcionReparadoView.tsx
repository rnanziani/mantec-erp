import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Registro {
  idrecepcion_65: number;
  iddetalle_entrega_65: number;
  idresponsable_65: number;
  estado_disponible_65: string;
  idtecnico_65?: number | null;
  idmaquina_65?: number | null;
  fecha_65?: string | null;
  hora_65?: string | null;
  responsable_nombre?: string;
  tecnico_nombre?: string;
  maquina_numinterno?: string;
  maquina_descripcion?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60?: number;
  folio_entrega?: string;
  proveedor_nombre?: string;
}

interface LineaDisponible {
  iddetalle_64: number;
  folio_entrega?: string;
  folio_recepcion?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60?: number;
  proveedor_nombre?: string;
  fecha_recepcion_64?: string | null;
}

interface LineaForm {
  iddetalle_entrega_65: number;
  estado_disponible_65: string;
  idtecnico_65: string;
  idmaquina_65: string;
  label: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const ESTADOS = [
  { value: 'DISPONIBLE', label: 'Disponible en bodega' },
  { value: 'INSTALADO', label: 'Instalado en máquina' },
] as const;

const RecepcionReparadoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [disponibles, setDisponibles] = useState<LineaDisponible[]>([]);
  const [responsables, setResponsables] = useState<
    Array<{
      idresponsableentrega_08: number;
      nombreresponsableentrega_08: string;
      apaternoresponsableentrega_08?: string;
      amaternoresponsableentrega_08?: string;
    }>
  >([]);
  const [tecnicos, setTecnicos] = useState<
    Array<{
      id_tecnico_21: number;
      nombres_21: string;
      a_paterno_21?: string;
      a_materno_21?: string;
      estado_21?: boolean;
    }>
  >([]);
  const [maquinas, setMaquinas] = useState<
    Array<{
      idmaquina_11: number;
      numinterno_11?: string;
      ppu_11?: string;
      descripcion_11?: string;
      estado_11?: boolean;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [idResponsable, setIdResponsable] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [lineaSel, setLineaSel] = useState('');

  // Edit single
  const [editDetalle, setEditDetalle] = useState('');
  const [editEstado, setEditEstado] = useState('DISPONIBLE');
  const [editTecnico, setEditTecnico] = useState('');
  const [editMaquina, setEditMaquina] = useState('');

  const API_URL = apiUrl('/recepciones-reparado');

  const responsableOptions = useMemo(
    () =>
      responsables.map((r) => ({
        value: String(r.idresponsableentrega_08),
        label: `${r.nombreresponsableentrega_08} ${r.apaternoresponsableentrega_08 || ''} ${r.amaternoresponsableentrega_08 || ''}`.trim(),
      })),
    [responsables]
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

  const maquinaOptions = useMemo(
    () =>
      maquinas
        .filter((m) => m.estado_11 !== false)
        .map((m) => ({
          value: String(m.idmaquina_11),
          label: [m.numinterno_11 || m.idmaquina_11, m.ppu_11 ? `(${m.ppu_11})` : null, m.descripcion_11 || '']
            .filter(Boolean)
            .join(' — '),
        })),
    [maquinas]
  );

  const disponiblesOptions = useMemo(
    () =>
      disponibles
        .filter((d) => !lineas.some((l) => l.iddetalle_entrega_65 === d.iddetalle_64))
        .map((d) => ({
          value: String(d.iddetalle_64),
          label: `${d.folio_entrega || ''} · ${d.repuesto_codigo || ''} ${d.repuesto_nombre || ''} (x${d.cantidad_60 || 1}) · ${d.proveedor_nombre || ''}`,
        })),
    [disponibles, lineas]
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [rReg, rDisp, rResp, rTec, rMaq] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(`${API_URL}/lineas-entrega-disponibles`),
        apiFetch(apiUrl('/responsables-entrega')),
        apiFetch(apiUrl('/tecnicos')),
        apiFetch(apiUrl('/maquinas')),
      ]);
      const [dReg, dDisp, dResp, dTec, dMaq] = await Promise.all([
        rReg.json(),
        rDisp.json(),
        rResp.json(),
        rTec.json(),
        rMaq.json(),
      ]);
      if (dReg.success && Array.isArray(dReg.data)) setRegistros(dReg.data);
      else setError(dReg.error || 'Error al cargar');
      if (dDisp.success && Array.isArray(dDisp.data)) setDisponibles(dDisp.data);
      if (dResp.success && Array.isArray(dResp.data)) setResponsables(dResp.data);
      if (dTec.success && Array.isArray(dTec.data)) setTecnicos(dTec.data);
      if (dMaq.success && Array.isArray(dMaq.data)) setMaquinas(dMaq.data);
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
    return registros.filter(
      (r) =>
        String(r.folio_entrega || '').toLowerCase().includes(q) ||
        (r.repuesto_codigo || '').toLowerCase().includes(q) ||
        (r.repuesto_nombre || '').toLowerCase().includes(q) ||
        (r.responsable_nombre || '').toLowerCase().includes(q) ||
        (r.estado_disponible_65 || '').toLowerCase().includes(q) ||
        (r.maquina_numinterno || '').toLowerCase().includes(q)
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
    setIdResponsable('');
    setFecha(new Date().toISOString().slice(0, 10));
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setLineas([]);
    setLineaSel('');
    setEditDetalle('');
    setEditEstado('DISPONIBLE');
    setEditTecnico('');
    setEditMaquina('');
  };

  const addLinea = () => {
    const id = Number(lineaSel);
    if (!id) {
      showError('Validación', 'Seleccione una línea de entrega (etapa 2)');
      return;
    }
    if (lineas.some((l) => l.iddetalle_entrega_65 === id)) {
      showError('Validación', 'Esa línea ya está en el detalle');
      return;
    }
    const d = disponibles.find((x) => x.iddetalle_64 === id);
    if (!d) {
      showError('Validación', 'Línea no encontrada');
      return;
    }
    setLineas((prev) => [
      ...prev,
      {
        iddetalle_entrega_65: id,
        estado_disponible_65: 'DISPONIBLE',
        idtecnico_65: '',
        idmaquina_65: '',
        label: `${d.folio_entrega || ''} · ${d.repuesto_codigo || ''} ${d.repuesto_nombre || ''} (x${d.cantidad_60 || 1})`,
      },
    ]);
    setLineaSel('');
  };

  const startEdit = (r: Registro) => {
    setEditingId(r.idrecepcion_65);
    setIdResponsable(String(r.idresponsable_65));
    setFecha(r.fecha_65 ? String(r.fecha_65).slice(0, 10) : '');
    setHora(r.hora_65 ? String(r.hora_65).slice(0, 5) : '');
    setObservacion('');
    setEditDetalle(String(r.iddetalle_entrega_65));
    setEditEstado(r.estado_disponible_65 || 'DISPONIBLE');
    setEditTecnico(r.idtecnico_65 ? String(r.idtecnico_65) : '');
    setEditMaquina(r.idmaquina_65 ? String(r.idmaquina_65) : '');
    setLineas([]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idResponsable) {
      await showError('Validación', 'Responsable que recibe es requerido');
      return;
    }

    if (editingId) {
      if (editEstado === 'INSTALADO' && !editMaquina) {
        await showError('Validación', 'Si está INSTALADO debe indicar la máquina');
        return;
      }
      const payload = {
        idresponsable_65: Number(idResponsable),
        estado_disponible_65: editEstado,
        idtecnico_65: editTecnico ? Number(editTecnico) : null,
        idmaquina_65: editMaquina ? Number(editMaquina) : null,
        fecha_65: fecha || null,
        hora_65: hora || null,
        observacion_65: observacion.trim() || null,
      };
      setSaving(true);
      try {
        const res = await apiFetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const data: ApiResponse = await res.json();
        if (data.success) {
          await fetchAll();
          resetForm();
          await showSuccess('Actualizado', data.message || 'OK');
        } else {
          await showError('Error', data.error || 'No se pudo guardar');
        }
      } catch {
        await showError('Error', 'Error de conexión');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!lineas.length) {
      await showError('Validación', 'Agregue al menos un repuesto de entrega (etapa 2)');
      return;
    }
    for (const l of lineas) {
      if (l.estado_disponible_65 === 'INSTALADO' && !l.idmaquina_65) {
        await showError('Validación', `Línea "${l.label}": INSTALADO requiere máquina`);
        return;
      }
    }

    const payload = {
      idresponsable_65: Number(idResponsable),
      fecha_65: fecha || null,
      hora_65: hora || null,
      observacion_65: observacion.trim() || null,
      lineas: lineas.map((l) => ({
        iddetalle_entrega_65: l.iddetalle_entrega_65,
        estado_disponible_65: l.estado_disponible_65,
        idtecnico_65: l.idtecnico_65 ? Number(l.idtecnico_65) : null,
        idmaquina_65: l.idmaquina_65 ? Number(l.idmaquina_65) : null,
      })),
    };

    setSaving(true);
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('Creado', data.message || 'OK');
      } else {
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('este cierre de reparación');
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

  if (loading) return <div className="loading">Cargando recepción de reparados...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Recepción reparado</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Nuevo
          </button>
          <button
            type="button"
            className="btn-success"
            disabled={!showForm || saving}
            onClick={() => formRef.current?.requestSubmit()}
          >
            Guardar
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              window.location.hash = 'dashboard';
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-container" style={{ overflow: 'visible' }}>
          <h3>{editingId ? `Editar cierre #${editingId}` : 'Nuevo cierre de reparación'}</h3>
          <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
            Solo aparecen líneas de <strong>entrega (etapa 2)</strong> con fecha de recepción del proveedor.
            Estados: <strong>Disponible en bodega</strong> o <strong>Instalado en máquina</strong> (requiere máquina).
            Puede agregar varios repuestos (ej. 2 calipers) a la misma máquina.
          </p>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idresponsable_65">Responsable que recibe *</label>
                <SearchableSelect
                  id="idresponsable_65"
                  value={idResponsable}
                  onChange={setIdResponsable}
                  options={responsableOptions}
                  required
                  placeholder="Buscar responsable..."
                  aria-label="Responsable que recibe"
                />
              </div>
              <div className="form-group">
                <label htmlFor="fecha_65">Fecha (cierre)</label>
                <input
                  id="fecha_65"
                  type="date"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hora_65">Hora</label>
                <input
                  id="hora_65"
                  type="time"
                  className="form-input"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
            </div>

            {editingId ? (
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label>Repuesto (entrega)</label>
                  <input className="form-input" value={`Línea #${editDetalle}`} disabled readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="estado_edit">Estado disponible *</label>
                  <select
                    id="estado_edit"
                    className="form-input"
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value)}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="tecnico_edit">Técnico que instala</label>
                  <SearchableSelect
                    id="tecnico_edit"
                    value={editTecnico}
                    onChange={setEditTecnico}
                    options={tecnicoOptions}
                    placeholder="Opcional..."
                    aria-label="Técnico que instala"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="maquina_edit">Máquina{editEstado === 'INSTALADO' ? ' *' : ''}</label>
                  <SearchableSelect
                    id="maquina_edit"
                    value={editMaquina}
                    onChange={setEditMaquina}
                    options={maquinaOptions}
                    required={editEstado === 'INSTALADO'}
                    placeholder="Buscar máquina..."
                    aria-label="Máquina donde se instala"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="form-row form-row-3" style={{ alignItems: 'end' }}>
                  <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                    <label htmlFor="linea_entrega">Agregar línea de entrega (etapa 2)</label>
                    <SearchableSelect
                      id="linea_entrega"
                      value={lineaSel}
                      onChange={setLineaSel}
                      options={disponiblesOptions}
                      placeholder="Buscar folio / código / proveedor..."
                      aria-label="Línea de entrega disponible"
                      emptyMessage="No hay líneas con recepción del proveedor pendientes de cierre"
                    />
                  </div>
                  <div className="form-group">
                    <button type="button" className="btn-primary" onClick={addLinea}>
                      + Agregar
                    </button>
                  </div>
                </div>

                <div className="table-container table-container--combos" style={{ marginBottom: 12 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Repuesto (entrega)</th>
                        <th>Estado *</th>
                        <th>Técnico instala</th>
                        <th>Máquina</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.length === 0 ? (
                        <tr>
                          <td colSpan={5}>Sin líneas. Agregue al menos un repuesto reparado.</td>
                        </tr>
                      ) : (
                        lineas.map((l) => (
                          <tr key={l.iddetalle_entrega_65}>
                            <td>{l.label}</td>
                            <td>
                              <select
                                className="form-input"
                                value={l.estado_disponible_65}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineas((prev) =>
                                    prev.map((x) =>
                                      x.iddetalle_entrega_65 === l.iddetalle_entrega_65
                                        ? { ...x, estado_disponible_65: v }
                                        : x
                                    )
                                  );
                                }}
                                aria-label="Estado disponible"
                              >
                                {ESTADOS.map((e) => (
                                  <option key={e.value} value={e.value}>
                                    {e.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <SearchableSelect
                                value={l.idtecnico_65}
                                onChange={(v) =>
                                  setLineas((prev) =>
                                    prev.map((x) =>
                                      x.iddetalle_entrega_65 === l.iddetalle_entrega_65
                                        ? { ...x, idtecnico_65: v }
                                        : x
                                    )
                                  )
                                }
                                options={tecnicoOptions}
                                placeholder="Opcional..."
                                aria-label="Técnico"
                              />
                            </td>
                            <td>
                              <SearchableSelect
                                value={l.idmaquina_65}
                                onChange={(v) =>
                                  setLineas((prev) =>
                                    prev.map((x) =>
                                      x.iddetalle_entrega_65 === l.iddetalle_entrega_65
                                        ? { ...x, idmaquina_65: v }
                                        : x
                                    )
                                  )
                                }
                                options={maquinaOptions}
                                required={l.estado_disponible_65 === 'INSTALADO'}
                                placeholder="Opcional / requerida si instalado"
                                aria-label="Máquina"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() =>
                                  setLineas((prev) =>
                                    prev.filter((x) => x.iddetalle_entrega_65 !== l.iddetalle_entrega_65)
                                  )
                                }
                                aria-label="Quitar"
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
              </>
            )}

            <div className="form-group">
              <label htmlFor="obs_65">Observación</label>
              <input
                id="obs_65"
                className="form-input"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success" disabled={saving}>
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          placeholder="🔍 BUSCAR FOLIO, REPUESTO, ESTADO, MÁQUINA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar cierres"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Folio entrega</th>
              <th>Repuesto</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Técnico</th>
              <th>Máquina</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={9}>No hay registros</td>
              </tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.idrecepcion_65}>
                  <td>{r.idrecepcion_65}</td>
                  <td>
                    <strong>{r.folio_entrega || '-'}</strong>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{r.proveedor_nombre}</div>
                  </td>
                  <td>
                    <strong>{r.repuesto_codigo || '-'}</strong> {r.repuesto_nombre}
                    {r.cantidad_60 != null ? ` (x${r.cantidad_60})` : ''}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: r.estado_disponible_65 === 'INSTALADO' ? '#dbeafe' : '#dcfce7',
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {r.estado_disponible_65 === 'INSTALADO' ? 'Instalado' : 'Disponible'}
                    </span>
                  </td>
                  <td>{r.responsable_nombre}</td>
                  <td>{r.tecnico_nombre || '—'}</td>
                  <td>
                    {r.idmaquina_65
                      ? `${r.maquina_numinterno || r.idmaquina_65} — ${r.maquina_descripcion || ''}`
                      : '—'}
                  </td>
                  <td>
                    {r.fecha_65 ? String(r.fecha_65).slice(0, 10) : '—'}
                    {r.hora_65 ? (
                      <div style={{ fontSize: 12 }}>{String(r.hora_65).slice(0, 5)}</div>
                    ) : null}
                  </td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(r)} aria-label="Editar">
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(r.idrecepcion_65)}
                      aria-label="Eliminar"
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default RecepcionReparadoView;
