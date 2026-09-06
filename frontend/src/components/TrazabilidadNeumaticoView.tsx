import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { showDeleteConfirm, showError, showSuccess } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Maestro {
  idtrazabilidad_76: number;
  folio_76?: string | null;
  idmaquina_76: number;
  idconductor_76: number;
  idtecnico_76: number;
  km_maquina_76: number;
  fecha_76: string;
  hora_76: string;
  observacion_76?: string | null;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  conductor_nombre?: string;
  tecnico_nombre?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const TrazabilidadNeumaticoView: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<Maestro[]>([]);
  const [maquinas, setMaquinas] = useState<Array<{ idmaquina_11: number; numinterno_11?: string; ppu_11?: string }>>([]);
  const [trabajadores, setTrabajadores] = useState<Array<{ idtrabajador_06: number; nombre_06: string; apaterno_06?: string; amaterno_06?: string; ruttrabajador_06?: string }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id_tecnico_21: number; nombres_21: string; a_paterno_21?: string; a_materno_21?: string }>>([]);
  const [neumaticos, setNeumaticos] = useState<Array<{ id_neumatico_31: number; cod_neumatico_31: string }>>([]);
  const [posiciones, setPosiciones] = useState<Array<{ idposicion_73: number; codigo_73: string; numero_73?: number | null }>>([]);
  const [patrones, setPatrones] = useState<Array<{ id_patron_35: number; codigo_patron_35: string }>>([]);
  const [llantas, setLlantas] = useState<Array<{ id_llanta_36: number; descripcion_llanta_36: string; codigo_36?: string }>>([]);
  const [danosNeu, setDanosNeu] = useState<Array<{ iddano_neumatico_74: number; codigo_74: string }>>([]);
  const [danosLla, setDanosLla] = useState<Array<{ iddano_llanta_75: number; codigo_75: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [idMaquina, setIdMaquina] = useState('');
  const [idConductor, setIdConductor] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [km, setKm] = useState('0');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [obs, setObs] = useState('');
  const [montajes, setMontajes] = useState<Array<{ idneumatico_77: number; idposicion_77: number; observacion_77: string }>>([]);
  const [rotaciones, setRotaciones] = useState<Array<{ idneumatico_78: number; idposicion_origen_78: number; idposicion_destino_78: number; idpatron_78: string; observacion_78: string }>>([]);
  const [detLlantas, setDetLlantas] = useState<Array<{ idllanta_79: number; iddano_llanta_79: string; observacion_79: string }>>([]);
  const [bajas, setBajas] = useState<Array<{ idneumatico_80: number; iddano_neumatico_80: number; observacion_80: string }>>([]);

  const [selNeuM, setSelNeuM] = useState('');
  const [selPosM, setSelPosM] = useState('');
  const [selNeuR, setSelNeuR] = useState('');
  const [selOri, setSelOri] = useState('');
  const [selDes, setSelDes] = useState('');
  const [selPat, setSelPat] = useState('');
  const [selLla, setSelLla] = useState('');
  const [selDanoL, setSelDanoL] = useState('');
  const [selNeuB, setSelNeuB] = useState('');
  const [selDanoN, setSelDanoN] = useState('');

  const API = apiUrl('/trazabilidad-neumatico');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const urls = [
        API,
        apiUrl('/maquinas'),
        apiUrl('/trabajadores'),
        apiUrl('/tecnicos'),
        apiUrl('/neumaticos'),
        apiUrl('/posiciones-neumatico?activo=true'),
        apiUrl('/patrones-rotacion'),
        apiUrl('/llantas'),
        apiUrl('/tipos-dano-neumatico?activo=true'),
        apiUrl('/tipos-dano-llanta?activo=true'),
      ];
      const ress = await Promise.all(urls.map((u) => apiFetch(u)));
      const jsons = await Promise.all(ress.map((r) => r.json()));
      const [t, mq, tr, te, ne, po, pa, ll, dn, dl] = jsons as ApiResponse<unknown[]>[];
      if (t.success && Array.isArray(t.data)) setRegistros(t.data as Maestro[]);
      else setError(t.error || 'Error al cargar intervenciones');
      if (mq.success && Array.isArray(mq.data)) setMaquinas(mq.data as typeof maquinas);
      if (tr.success && Array.isArray(tr.data)) setTrabajadores(tr.data as typeof trabajadores);
      if (te.success && Array.isArray(te.data)) setTecnicos(te.data as typeof tecnicos);
      if (ne.success && Array.isArray(ne.data)) setNeumaticos(ne.data as typeof neumaticos);
      if (po.success && Array.isArray(po.data)) setPosiciones(po.data as typeof posiciones);
      if (pa.success && Array.isArray(pa.data)) setPatrones(pa.data as typeof patrones);
      if (ll.success && Array.isArray(ll.data)) setLlantas(ll.data as typeof llantas);
      if (dn.success && Array.isArray(dn.data)) setDanosNeu(dn.data as typeof danosNeu);
      if (dl.success && Array.isArray(dl.data)) setDanosLla(dl.data as typeof danosLla);
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
    return registros.filter((r) =>
      [r.folio_76, r.maquina_ppu, r.maquina_numinterno, r.conductor_nombre, r.tecnico_nombre]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [registros, searchTerm]);

  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const maquinaOptions = useMemo(
    () =>
      maquinas.map((m) => ({
        value: String(m.idmaquina_11),
        label: `${m.numinterno_11 || ''} ${m.ppu_11 || ''}`.trim(),
      })),
    [maquinas]
  );
  const tecnicoOptions = useMemo(
    () =>
      tecnicos.map((t) => ({
        value: String(t.id_tecnico_21),
        label: `${t.nombres_21} ${t.a_paterno_21 || ''} ${t.a_materno_21 || ''}`.replace(/\s+/g, ' ').trim(),
      })),
    [tecnicos]
  );
  const conductorOptions = useMemo(
    () =>
      trabajadores.map((t) => {
        const nombre = `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06 || ''}`.replace(/\s+/g, ' ').trim();
        return {
          value: String(t.idtrabajador_06),
          label: t.ruttrabajador_06 ? `${nombre} - ${t.ruttrabajador_06}` : nombre,
        };
      }),
    [trabajadores]
  );
  const neuOptions = useMemo(
    () => neumaticos.map((n) => ({ value: String(n.id_neumatico_31), label: n.cod_neumatico_31 })),
    [neumaticos]
  );
  const posOptions = useMemo(
    () =>
      posiciones.map((p) => ({
        value: String(p.idposicion_73),
        label: `${p.numero_73 ? `(${p.numero_73}) ` : ''}${p.codigo_73}`,
      })),
    [posiciones]
  );

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setIdMaquina('');
    setIdConductor('');
    setIdTecnico('');
    setKm('0');
    setFecha(new Date().toISOString().slice(0, 10));
    setHora(new Date().toTimeString().slice(0, 5));
    setObs('');
    setMontajes([]);
    setRotaciones([]);
    setDetLlantas([]);
    setBajas([]);
    setError('');
  };

  const startEdit = async (id: number) => {
    const res = await apiFetch(`${API}/${id}`);
    const data: ApiResponse<{
      maestro: Maestro;
      montajes: typeof montajes;
      rotaciones: Array<typeof rotaciones[number] & { idpatron_78?: number | null }>;
      llantas: Array<typeof detLlantas[number] & { iddano_llanta_79?: number | null }>;
      bajas: typeof bajas;
    }> = await res.json();
    if (!data.success || !data.data) {
      await showError('Error', data.error || 'No se pudo cargar');
      return;
    }
    const { maestro } = data.data;
    setEditingId(id);
    setIdMaquina(String(maestro.idmaquina_76));
    setIdConductor(String(maestro.idconductor_76));
    setIdTecnico(String(maestro.idtecnico_76));
    setKm(String(maestro.km_maquina_76 ?? 0));
    setFecha(String(maestro.fecha_76).slice(0, 10));
    setHora(String(maestro.hora_76 || '').slice(0, 5));
    setObs(maestro.observacion_76 || '');
    setMontajes(
      (data.data.montajes || []).map((x) => ({
        idneumatico_77: x.idneumatico_77,
        idposicion_77: x.idposicion_77,
        observacion_77: x.observacion_77 || '',
      }))
    );
    setRotaciones(
      (data.data.rotaciones || []).map((x) => ({
        idneumatico_78: x.idneumatico_78,
        idposicion_origen_78: x.idposicion_origen_78,
        idposicion_destino_78: x.idposicion_destino_78,
        idpatron_78: x.idpatron_78 ? String(x.idpatron_78) : '',
        observacion_78: x.observacion_78 || '',
      }))
    );
    setDetLlantas(
      (data.data.llantas || []).map((x) => ({
        idllanta_79: x.idllanta_79,
        iddano_llanta_79: x.iddano_llanta_79 ? String(x.iddano_llanta_79) : '',
        observacion_79: x.observacion_79 || '',
      }))
    );
    setBajas(
      (data.data.bajas || []).map((x) => ({
        idneumatico_80: x.idneumatico_80,
        iddano_neumatico_80: x.iddano_neumatico_80,
        observacion_80: x.observacion_80 || '',
      }))
    );
    setShowForm(true);
  };

  const payload = () => ({
    idmaquina_76: Number(idMaquina),
    idconductor_76: Number(idConductor),
    idtecnico_76: Number(idTecnico),
    km_maquina_76: Number(km),
    fecha_76: fecha,
    hora_76: hora.length === 5 ? `${hora}:00` : hora,
    observacion_76: obs.trim() || null,
    montajes,
    rotaciones: rotaciones.map((r) => ({
      ...r,
      idpatron_78: r.idpatron_78 ? Number(r.idpatron_78) : null,
    })),
    llantas: detLlantas.map((l) => ({
      ...l,
      iddano_llanta_79: l.iddano_llanta_79 ? Number(l.iddano_llanta_79) : null,
    })),
    bajas,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idMaquina || !idConductor || !idTecnico) {
      await showError('Validación', 'Máquina, conductor y técnico son requeridos');
      return;
    }
    if (montajes.length + rotaciones.length + detLlantas.length + bajas.length < 1) {
      await showError('Validación', 'Cargue al menos una línea en algún detalle');
      return;
    }
    try {
      setSaving(true);
      const res = await apiFetch(editingId ? `${API}/${editingId}` : API, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      const data: ApiResponse<Maestro> = await res.json();
      if (data.success) {
        await fetchAll();
        resetForm();
        await showSuccess('Listo', data.message || 'Intervención guardada');
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
    if (!(await showDeleteConfirm('esta intervención'))) return;
    const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    const data: ApiResponse = await res.json();
    if (data.success) {
      await fetchAll();
      await showSuccess('Listo', 'Eliminada');
    } else await showError('Error', data.error || 'No se pudo eliminar');
  };

  const neuLabel = (id: number) => neumaticos.find((n) => n.id_neumatico_31 === id)?.cod_neumatico_31 || id;
  const posLabel = (id: number) => posiciones.find((p) => p.idposicion_73 === id)?.codigo_73 || id;

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>📝 Trazabilidad de neumáticos</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>Nueva intervención</button>
          <button type="button" className="btn-primary" style={{ backgroundColor: '#28a745' }} disabled={!showForm || saving} onClick={() => formRef.current?.requestSubmit()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ backgroundColor: '#17a2b8' }}
            onClick={() =>
              exportToExcel(
                filtered.map((r) => ({
                  Folio: r.folio_76,
                  PPU: r.maquina_ppu,
                  Interno: r.maquina_numinterno,
                  KM: r.km_maquina_76,
                  Fecha: r.fecha_76,
                  Conductor: r.conductor_nombre,
                  Técnico: r.tecnico_nombre,
                })),
                'trazabilidad_neumatico',
                'Trazabilidad'
              )
            }
          >
            Exportar
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
        </div>
      </div>

      {error && <div role="alert" style={{ padding: '1rem', marginBottom: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 8 }}>{error}</div>}

      {showForm && (
        <form ref={formRef} className="form-container" onSubmit={handleSave}>
          <h3>{editingId ? 'Editar intervención' : 'Nueva intervención'}</h3>
          <div className="form-group">
            <label htmlFor="tz-maq">Máquina PPU *</label>
            <SearchableSelect id="tz-maq" value={idMaquina} onChange={setIdMaquina} options={maquinaOptions} placeholder="Buscar máquina..." emptyMessage="Sin máquinas" />
          </div>
          <div className="form-group">
            <label htmlFor="tz-cond">Conductor *</label>
            <SearchableSelect
              id="tz-cond"
              value={idConductor}
              onChange={setIdConductor}
              options={conductorOptions}
              placeholder="Buscar por apellido o RUT..."
              required
              aria-label="Buscar y seleccionar conductor"
              emptyMessage="No se encontraron conductores"
            />
          </div>
          <div className="form-group">
            <label htmlFor="tz-tec">Técnico *</label>
            <SearchableSelect id="tz-tec" value={idTecnico} onChange={setIdTecnico} options={tecnicoOptions} placeholder="Buscar técnico..." emptyMessage="Sin técnicos" />
          </div>
          <div className="form-group">
            <label htmlFor="tz-km">Odómetro</label>
            <input id="tz-km" type="number" min={0} step="0.1" className="form-input" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="tz-fecha">Fecha</label>
            <input id="tz-fecha" type="date" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="tz-hora">Hora</label>
            <input id="tz-hora" type="time" className="form-input" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="tz-obs">Observación</label>
            <textarea id="tz-obs" className="form-input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>

          <h4>Detalle posición (neumático nuevo)</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <SearchableSelect id="tz-nm" value={selNeuM} onChange={setSelNeuM} options={neuOptions} placeholder="Neumático" emptyMessage="Sin neumáticos" />
            <SearchableSelect id="tz-pm" value={selPosM} onChange={setSelPosM} options={posOptions} placeholder="Posición" emptyMessage="Sin posiciones" />
            <button type="button" className="btn-primary" onClick={() => {
              if (!selNeuM || !selPosM) return;
              setMontajes((p) => [...p, { idneumatico_77: Number(selNeuM), idposicion_77: Number(selPosM), observacion_77: '' }]);
              setSelNeuM('');
              setSelPosM('');
            }}>Agregar</button>
          </div>
          <ul>{montajes.map((x, i) => (
            <li key={`m-${i}`}>{neuLabel(x.idneumatico_77)} → {posLabel(x.idposicion_77)}
              <button type="button" onClick={() => setMontajes((p) => p.filter((_, j) => j !== i))}>Quitar</button>
            </li>
          ))}</ul>

          <h4>Detalle rotación (usado)</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <SearchableSelect id="tz-nr" value={selNeuR} onChange={setSelNeuR} options={neuOptions} placeholder="Neumático" emptyMessage="Sin neumáticos" />
            <SearchableSelect id="tz-ori" value={selOri} onChange={setSelOri} options={posOptions} placeholder="Origen" emptyMessage="Sin posiciones" />
            <SearchableSelect id="tz-des" value={selDes} onChange={setSelDes} options={posOptions} placeholder="Destino" emptyMessage="Sin posiciones" />
            <select className="form-select" value={selPat} onChange={(e) => setSelPat(e.target.value)} aria-label="Patrón opcional">
              <option value="">Patrón (opcional)</option>
              {patrones.map((p) => <option key={p.id_patron_35} value={p.id_patron_35}>{p.codigo_patron_35}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={() => {
              if (!selNeuR || !selOri || !selDes) return;
              setRotaciones((p) => [...p, {
                idneumatico_78: Number(selNeuR),
                idposicion_origen_78: Number(selOri),
                idposicion_destino_78: Number(selDes),
                idpatron_78: selPat,
                observacion_78: '',
              }]);
              setSelNeuR('');
              setSelOri('');
              setSelDes('');
              setSelPat('');
            }}>Agregar</button>
          </div>
          <ul>{rotaciones.map((x, i) => (
            <li key={`r-${i}`}>{neuLabel(x.idneumatico_78)} {posLabel(x.idposicion_origen_78)} → {posLabel(x.idposicion_destino_78)}
              <button type="button" onClick={() => setRotaciones((p) => p.filter((_, j) => j !== i))}>Quitar</button>
            </li>
          ))}</ul>

          <h4>Detalle llanta</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <select className="form-select" value={selLla} onChange={(e) => setSelLla(e.target.value)} aria-label="Llanta">
              <option value="">Llanta</option>
              {llantas.map((l) => <option key={l.id_llanta_36} value={l.id_llanta_36}>{l.codigo_36 || l.descripcion_llanta_36}</option>)}
            </select>
            <select className="form-select" value={selDanoL} onChange={(e) => setSelDanoL(e.target.value)} aria-label="Daño llanta opcional">
              <option value="">Daño (vacío = nueva)</option>
              {danosLla.map((d) => <option key={d.iddano_llanta_75} value={d.iddano_llanta_75}>{d.codigo_75}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={() => {
              if (!selLla) return;
              setDetLlantas((p) => [...p, { idllanta_79: Number(selLla), iddano_llanta_79: selDanoL, observacion_79: '' }]);
              setSelLla('');
              setSelDanoL('');
            }}>Agregar</button>
          </div>
          <ul>{detLlantas.map((x, i) => (
            <li key={`l-${i}`}>{llantas.find((l) => l.id_llanta_36 === x.idllanta_79)?.descripcion_llanta_36 || x.idllanta_79}
              <button type="button" onClick={() => setDetLlantas((p) => p.filter((_, j) => j !== i))}>Quitar</button>
            </li>
          ))}</ul>

          <h4>Detalle baja</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <SearchableSelect id="tz-nb" value={selNeuB} onChange={setSelNeuB} options={neuOptions} placeholder="Neumático" emptyMessage="Sin neumáticos" />
            <select className="form-select" value={selDanoN} onChange={(e) => setSelDanoN(e.target.value)} aria-label="Tipo daño neumático">
              <option value="">Tipo de daño</option>
              {danosNeu.map((d) => <option key={d.iddano_neumatico_74} value={d.iddano_neumatico_74}>{d.codigo_74}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={() => {
              if (!selNeuB || !selDanoN) return;
              setBajas((p) => [...p, { idneumatico_80: Number(selNeuB), iddano_neumatico_80: Number(selDanoN), observacion_80: '' }]);
              setSelNeuB('');
              setSelDanoN('');
            }}>Agregar</button>
          </div>
          <ul>{bajas.map((x, i) => (
            <li key={`b-${i}`}>{neuLabel(x.idneumatico_80)} / {danosNeu.find((d) => d.iddano_neumatico_74 === x.iddano_neumatico_80)?.codigo_74}
              <button type="button" onClick={() => setBajas((p) => p.filter((_, j) => j !== i))}>Quitar</button>
            </li>
          ))}</ul>
        </form>
      )}

      <div className="form-container">
        <input className="form-input" placeholder="Buscar folio, PPU, conductor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Buscar intervenciones" />
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th><th>PPU / MAQ</th><th>KM</th><th>Conductor</th><th>Fecha</th><th>Hora</th><th>Técnico</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={8} className="no-data">Sin intervenciones</td></tr>
              ) : pageItems.map((r) => (
                <tr key={r.idtrazabilidad_76}>
                  <td><strong>{r.folio_76}</strong></td>
                  <td>{r.maquina_numinterno} {r.maquina_ppu}</td>
                  <td>{r.km_maquina_76}</td>
                  <td>{r.conductor_nombre}</td>
                  <td>{String(r.fecha_76).slice(0, 10)}</td>
                  <td>{String(r.hora_76 || '').slice(0, 8)}</td>
                  <td>{r.tecnico_nombre}</td>
                  <td className="actions">
                    <button type="button" className="btn-edit" onClick={() => startEdit(r.idtrazabilidad_76)} aria-label={`Editar ${r.folio_76}`}>✏️</button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(r.idtrazabilidad_76)} aria-label={`Eliminar ${r.folio_76}`}>🚫</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
};

export default TrazabilidadNeumaticoView;
