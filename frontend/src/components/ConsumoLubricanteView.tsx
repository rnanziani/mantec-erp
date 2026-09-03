import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Maestro {
  idconsumo_71: number;
  folio_71?: string | null;
  idmaquina_71: number;
  idtrabajador_71: number;
  idtecnico_71: number;
  km_maquina_71: number;
  fecha_71: string;
  hora_71: string;
  observacion_71?: string | null;
  maquina_nombre?: string;
  trabajador_nombre?: string;
  tecnico_nombre?: string;
  total_lts?: number;
  lubricantes_resumen?: string | null;
}

interface Detalle {
  iddetalle_72?: number;
  idlubricante_72: number;
  consumo_lts_72: number;
  observacion_72?: string | null;
  lubricante_codigo?: string;
  lubricante_nombre?: string;
  lubricante_activo?: boolean;
}

interface Lubricante {
  idlubricante_70: number;
  cob_lubricante_70: string;
  descripcion_70: string;
  orden_aparicion_70: number;
  activo_70: boolean;
}

interface Maquina {
  idmaquina_11: number;
  numinterno_11?: string;
  ppu_11?: string;
  descripcion_11?: string;
  estado_11?: boolean;
}

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06?: string;
  nombre_06: string;
  apaterno_06?: string;
  amaterno_06?: string;
}

interface Tecnico {
  id_tecnico_21: number;
  nombres_21: string;
  a_paterno_21?: string;
  a_materno_21?: string;
  estado_21?: boolean;
}

interface LineaForm {
  idlubricante_72: number;
  consumo_lts_72: number;
  observacion_72: string;
  label: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const MAX_LINEAS = 4;

const ConsumoLubricanteView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<Maestro[]>([]);
  const [lubricantes, setLubricantes] = useState<Lubricante[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idMaquina, setIdMaquina] = useState('');
  const [idTrabajador, setIdTrabajador] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [km, setKm] = useState('0');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<LineaForm[]>([]);
  const [lubSel, setLubSel] = useState('');
  const [ltsSel, setLtsSel] = useState('');
  const [obsSel, setObsSel] = useState('');

  const [detalleModal, setDetalleModal] = useState<{ maestro: Maestro; detalles: Detalle[] } | null>(
    null
  );

  const API_URL = apiUrl('/consumos-lubricante');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [cRes, lRes, mRes, tRes, tecRes] = await Promise.all([
        apiFetch(API_URL),
        apiFetch(apiUrl('/lubricantes')),
        apiFetch(apiUrl('/maquinas')),
        apiFetch(apiUrl('/trabajadores')),
        apiFetch(apiUrl('/tecnicos')),
      ]);
      const cData: ApiResponse<Maestro[]> = await cRes.json();
      const lData: ApiResponse<Lubricante[]> = await lRes.json();
      const mData: ApiResponse<Maquina[]> = await mRes.json();
      const tData: ApiResponse<Trabajador[]> = await tRes.json();
      const tecData: ApiResponse<Tecnico[]> = await tecRes.json();
      if (cData.success && Array.isArray(cData.data)) setRegistros(cData.data);
      else setError(cData.error || 'Error al cargar consumos');
      if (lData.success && Array.isArray(lData.data)) setLubricantes(lData.data);
      if (mData.success && Array.isArray(mData.data)) setMaquinas(mData.data);
      if (tData.success && Array.isArray(tData.data)) setTrabajadores(tData.data);
      if (tecData.success && Array.isArray(tecData.data)) setTecnicos(tecData.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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

  const trabajadorOptions = useMemo(
    () =>
      [...trabajadores]
        .sort((a, b) =>
          `${a.apaterno_06 || ''} ${a.nombre_06}`.localeCompare(
            `${b.apaterno_06 || ''} ${b.nombre_06}`,
            'es',
            { sensitivity: 'base' }
          )
        )
        .map((t) => ({
          value: String(t.idtrabajador_06),
          label:
            `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06}`.trim() +
            (t.ruttrabajador_06 ? ` — ${t.ruttrabajador_06}` : ''),
        })),
    [trabajadores]
  );

  /** Solo activos y aún no agregados (catálogo dinámico). */
  const lubricanteOptions = useMemo(() => {
    const usados = new Set(detalles.map((d) => d.idlubricante_72));
    return lubricantes
      .filter((l) => l.activo_70 && !usados.has(l.idlubricante_70))
      .sort(
        (a, b) =>
          a.orden_aparicion_70 - b.orden_aparicion_70 ||
          a.descripcion_70.localeCompare(b.descripcion_70, 'es', { sensitivity: 'base' })
      )
      .map((l) => ({
        value: String(l.idlubricante_70),
        label: `${l.cob_lubricante_70} — ${l.descripcion_70}`,
      }));
  }, [lubricantes, detalles]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter(
      (r) =>
        (r.folio_71 || '').toLowerCase().includes(q) ||
        (r.maquina_nombre || '').toLowerCase().includes(q) ||
        (r.trabajador_nombre || '').toLowerCase().includes(q) ||
        (r.tecnico_nombre || '').toLowerCase().includes(q) ||
        (r.lubricantes_resumen || '').toLowerCase().includes(q)
    );
  }, [registros, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setIdMaquina('');
    setIdTrabajador('');
    setIdTecnico('');
    setKm('0');
    setFecha(new Date().toISOString().slice(0, 10));
    setHora(new Date().toTimeString().slice(0, 5));
    setObservacion('');
    setDetalles([]);
    setLubSel('');
    setLtsSel('');
    setObsSel('');
    setShowForm(false);
  };

  const addLinea = () => {
    if (!lubSel) {
      void showError('Validación', 'Seleccione un lubricante');
      return;
    }
    const lts = Number(ltsSel);
    if (!lts || lts <= 0) {
      void showError('Validación', 'Ingrese litros mayores a 0');
      return;
    }
    if (detalles.length >= MAX_LINEAS) {
      void showError('Validación', `Máximo ${MAX_LINEAS} lubricantes por consumo`);
      return;
    }
    if (detalles.some((d) => d.idlubricante_72 === Number(lubSel))) {
      void showError('Validación', 'Ese lubricante ya está en el detalle');
      return;
    }
    const lub = lubricantes.find((l) => l.idlubricante_70 === Number(lubSel));
    if (!lub) return;
    if (!lub.activo_70 && !editingId) {
      void showError('Validación', 'No puede agregar un lubricante inactivo');
      return;
    }
    setDetalles((prev) => [
      ...prev,
      {
        idlubricante_72: lub.idlubricante_70,
        consumo_lts_72: lts,
        observacion_72: obsSel.trim().toUpperCase(),
        label: `${lub.cob_lubricante_70} — ${lub.descripcion_70}`,
      },
    ]);
    setLubSel('');
    setLtsSel('');
    setObsSel('');
  };

  const removeLinea = (idLub: number) => {
    setDetalles((prev) => prev.filter((d) => d.idlubricante_72 !== idLub));
  };

  const startEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: Maestro; detalles: Detalle[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar el consumo');
        return;
      }
      const { maestro, detalles: dets } = data.data;
      setEditingId(maestro.idconsumo_71);
      setIdMaquina(String(maestro.idmaquina_71));
      setIdTrabajador(String(maestro.idtrabajador_71));
      setIdTecnico(String(maestro.idtecnico_71));
      setKm(String(maestro.km_maquina_71 ?? 0));
      setFecha(String(maestro.fecha_71).slice(0, 10));
      setHora(String(maestro.hora_71).slice(0, 5));
      setObservacion(maestro.observacion_71 || '');
      setDetalles(
        dets.map((d) => ({
          idlubricante_72: d.idlubricante_72,
          consumo_lts_72: Number(d.consumo_lts_72),
          observacion_72: d.observacion_72 || '',
          label: `${d.lubricante_codigo || ''} — ${d.lubricante_nombre || ''}`,
        }))
      );
      setShowForm(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const verDetalle = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}/${id}`);
      const data: ApiResponse<{ maestro: Maestro; detalles: Detalle[] }> = await res.json();
      if (!data.success || !data.data) {
        await showError('Error', data.error || 'No se pudo cargar');
        return;
      }
      setDetalleModal(data.data);
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idMaquina || !idTrabajador || !idTecnico) {
      await showError('Validación', 'Máquina, trabajador y técnico son obligatorios');
      return;
    }
    const kmNum = Number(km);
    if (Number.isNaN(kmNum) || kmNum < 0) {
      await showError('Validación', 'KM máquina inválido');
      return;
    }
    if (!detalles.length) {
      await showError('Validación', 'Agregue al menos un lubricante');
      return;
    }
    if (detalles.length > MAX_LINEAS) {
      await showError('Validación', `Máximo ${MAX_LINEAS} lubricantes`);
      return;
    }

    const payload = {
      idmaquina_71: Number(idMaquina),
      idtrabajador_71: Number(idTrabajador),
      idtecnico_71: Number(idTecnico),
      km_maquina_71: kmNum,
      fecha_71: fecha,
      hora_71: hora,
      observacion_71: observacion.trim().toUpperCase() || null,
      detalles: detalles.map((d) => ({
        idlubricante_72: d.idlubricante_72,
        consumo_lts_72: d.consumo_lts_72,
        observacion_72: d.observacion_72 || null,
      })),
    };

    try {
      setSaving(true);
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
        await showError('Error', data.error || 'No se pudo guardar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showDeleteConfirm('este consumo de lubricante');
    if (!ok) return;
    try {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        await fetchAll();
        await showSuccess('Listo', data.message || 'Eliminado');
      } else {
        await showError('Error', data.error || 'No se pudo eliminar');
      }
    } catch {
      await showError('Error', 'Error de conexión');
    }
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((r) => ({
        Folio: r.folio_71 || '',
        Fecha: String(r.fecha_71).slice(0, 10),
        Hora: String(r.hora_71).slice(0, 5),
        Máquina: r.maquina_nombre || '',
        Trabajador: r.trabajador_nombre || '',
        Técnico: r.tecnico_nombre || '',
        KM: r.km_maquina_71,
        'Total L': r.total_lts ?? '',
        Lubricantes: r.lubricantes_resumen || '',
      })),
      'consumos-lubricante'
    );
  };

  if (loading) return <div className="loading">Cargando consumos de lubricante...</div>;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Consumo de lubricantes</h2>
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
          <button type="button" className="btn-info" onClick={handleExport}>
            Excel
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
        <div className="form-container">
          <h3>{editingId ? `Editar consumo #${editingId}` : 'Nuevo consumo'}</h3>
          <p style={{ marginTop: 0, color: '#555' }}>
            Una máquina/taller puede recibir hasta {MAX_LINEAS} tipos de lubricante. Solo aparecen los
            activos del catálogo.
          </p>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="idmaquina">Máquina / Taller *</label>
                <SearchableSelect
                  id="idmaquina"
                  value={idMaquina}
                  onChange={setIdMaquina}
                  options={maquinaOptions}
                  placeholder="Buscar máquina..."
                  aria-label="Buscar o seleccionar máquina"
                />
              </div>
              <div className="form-group">
                <label htmlFor="idtrabajador">Trabajador *</label>
                <SearchableSelect
                  id="idtrabajador"
                  value={idTrabajador}
                  onChange={setIdTrabajador}
                  options={trabajadorOptions}
                  placeholder="Buscar trabajador..."
                  aria-label="Buscar o seleccionar trabajador"
                />
              </div>
              <div className="form-group">
                <label htmlFor="idtecnico">Técnico *</label>
                <SearchableSelect
                  id="idtecnico"
                  value={idTecnico}
                  onChange={setIdTecnico}
                  options={tecnicoOptions}
                  placeholder="Buscar técnico..."
                  aria-label="Buscar o seleccionar técnico"
                />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="km_maquina">KM máquina *</label>
                <input
                  id="km_maquina"
                  type="number"
                  min={0}
                  step="0.1"
                  className="form-input"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="fecha_71">Fecha *</label>
                <input
                  id="fecha_71"
                  type="date"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="hora_71">Hora *</label>
                <input
                  id="hora_71"
                  type="time"
                  className="form-input"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="observacion_71">Observación general</label>
              <input
                id="observacion_71"
                className="form-input"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value.toUpperCase())}
                maxLength={500}
              />
            </div>

            <h4>Detalle lubricantes ({detalles.length}/{MAX_LINEAS})</h4>
            <div className="form-row form-row-3" style={{ alignItems: 'end' }}>
              <div className="form-group">
                <label htmlFor="lub_sel">Lubricante</label>
                <SearchableSelect
                  id="lub_sel"
                  value={lubSel}
                  onChange={setLubSel}
                  options={lubricanteOptions}
                  placeholder="Buscar lubricante..."
                  aria-label="Buscar lubricante activo"
                  emptyMessage="No hay lubricantes activos disponibles"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lts_sel">Litros</label>
                <input
                  id="lts_sel"
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="form-input"
                  value={ltsSel}
                  onChange={(e) => setLtsSel(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="obs_sel">Obs. línea</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="obs_sel"
                    className="form-input"
                    value={obsSel}
                    onChange={(e) => setObsSel(e.target.value.toUpperCase())}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={addLinea}
                    disabled={detalles.length >= MAX_LINEAS}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {detalles.length > 0 && (
              <div className="table-container" style={{ marginBottom: 16 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lubricante</th>
                      <th>Litros</th>
                      <th>Observación</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d) => (
                      <tr key={d.idlubricante_72}>
                        <td>{d.label}</td>
                        <td>{d.consumo_lts_72}</td>
                        <td>{d.observacion_72 || '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => removeLinea(d.idlubricante_72)}
                            title="Quitar"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        </div>
      )}

      <div className="filters-row" style={{ marginBottom: 12 }}>
        <input
          type="search"
          className="form-input"
          placeholder="Buscar folio, máquina, trabajador, técnico, lubricante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          aria-label="Buscar consumos"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Máquina</th>
              <th>Trabajador</th>
              <th>Técnico</th>
              <th>KM</th>
              <th>Litros</th>
              <th>Lubricantes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center' }}>
                  Sin registros
                </td>
              </tr>
            ) : (
              pageItems.map((r) => (
                <tr key={r.idconsumo_71}>
                  <td>{r.folio_71}</td>
                  <td>
                    {String(r.fecha_71).slice(0, 10)} {String(r.hora_71).slice(0, 5)}
                  </td>
                  <td>{r.maquina_nombre}</td>
                  <td>{r.trabajador_nombre}</td>
                  <td>{r.tecnico_nombre}</td>
                  <td>{r.km_maquina_71}</td>
                  <td>{r.total_lts ?? '-'}</td>
                  <td>{r.lubricantes_resumen || '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => verDetalle(r.idconsumo_71)}
                      title="Ver"
                    >
                      👁️
                    </button>
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => startEdit(r.idconsumo_71)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(r.idconsumo_71)}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
      />

      {detalleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-consumo-title"
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
            style={{ maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="modal-consumo-title">Consumo {detalleModal.maestro.folio_71}</h3>
            <p>
              <strong>Máquina:</strong> {detalleModal.maestro.maquina_nombre}
              <br />
              <strong>Trabajador:</strong> {detalleModal.maestro.trabajador_nombre}
              <br />
              <strong>Técnico:</strong> {detalleModal.maestro.tecnico_nombre}
              <br />
              <strong>KM:</strong> {detalleModal.maestro.km_maquina_71} ·{' '}
              <strong>Fecha:</strong> {String(detalleModal.maestro.fecha_71).slice(0, 10)}{' '}
              {String(detalleModal.maestro.hora_71).slice(0, 5)}
            </p>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Lubricante</th>
                    <th>Litros</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleModal.detalles.map((d) => (
                    <tr key={d.iddetalle_72 || d.idlubricante_72}>
                      <td>{d.lubricante_codigo}</td>
                      <td>{d.lubricante_nombre}</td>
                      <td>{d.consumo_lts_72}</td>
                      <td>{d.observacion_72 || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button type="button" className="btn-secondary" onClick={() => setDetalleModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumoLubricanteView;
