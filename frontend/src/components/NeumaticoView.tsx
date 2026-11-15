import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import './BodegaView.css';
import './NeumaticoView.css';
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal';
import SearchBar from './shared/SearchBar';
import Pagination from './shared/Pagination';
import SearchableSelect from './shared/SearchableSelect';
import { exportToExcel } from '../utils/exportUtils';
import { apiUrl } from '../lib/apiClient';
import { changeKeepingCaret } from '../hooks/useCaretTransform';
import { etiquetaNeumatico } from '../utils/neumaticoEtiqueta';

interface Neumatico {
  id_neumatico_31: number;
  cod_neumatico_31: string;
  id_marca_31: number;
  id_estado_31?: number | null;
  fecha_ingreso_31?: string;
  observaciones_31?: string;
  codigo_proveedor_31?: string | null;
  modelo_31?: string | null;
  medida_31?: string | null;
  marca_32?: string;
  diametro_32?: number;
  estado_33?: string;
}

interface MarcaNeumatico {
  id_marca_32: number;
  marca_32: string;
  diametro_32: number;
  estado_32: boolean;
}

interface FilaExcel {
  fuego: string;
  codigo: string;
  marcaExcel: string;
  modelo: string;
  medida: string;
  idMarca: number;
  error: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Neumatico;
  direction: 'asc' | 'desc';
};

const FUEGO_RE = /^T[0-9]{2}[0-9]+$/;

function fechaChileHoy(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function claveCol(h: string): string {
  return String(h || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function campoDeClave(k: string): keyof Omit<FilaExcel, 'idMarca' | 'error'> | null {
  if (!k) return null;
  if (k.includes('fuego') || k === 'nfuego' || k === 'numerofuego' || k === 'nrofuego') return 'fuego';
  if (k.includes('marca')) return 'marcaExcel';
  if (k.includes('modelo')) return 'modelo';
  if (k.includes('medida')) return 'medida';
  if (k.includes('codigo') || k === 'sku' || k === 'cod') {
    if (k.includes('fuego') || k.includes('neumatico')) return 'fuego';
    return 'codigo';
  }
  return null;
}

function claveMarca(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Ancho del Excel: 315/80 R22.5 → 315. Así está el catálogo (GOODYEAR 315, BRIDGESTONE 315). */
function anchoDesdeMedida(medida: string): number | null {
  const m = String(medida || '')
    .trim()
    .match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function aroDesdeMedida(medida: string): number | null {
  const m = String(medida || '')
    .toUpperCase()
    .match(/R\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function cruzarMarcaCatalogo(
  catalogo: MarcaNeumatico[],
  marcaExcel: string,
  medida: string
): MarcaNeumatico | undefined {
  const q = marcaExcel.trim().toUpperCase();
  if (!q) return undefined;
  const qn = claveMarca(q);
  const ancho = anchoDesdeMedida(medida);
  const aro = aroDesdeMedida(medida);
  const activas = catalogo.filter((m) => m.estado_32 !== false);

  const candidatas = activas.filter((m) => {
    const nombre = m.marca_32.trim().toUpperCase();
    const kn = claveMarca(nombre);
    if (nombre === q || kn === qn) return true;
    if (ancho != null && (nombre === `${q} ${ancho}` || kn === `${qn}${ancho}`)) return true;
    if (kn.startsWith(qn) && (kn.length === qn.length || /^\d/.test(kn.slice(qn.length)))) return true;
    return false;
  });
  if (candidatas.length === 0) return undefined;
  if (candidatas.length === 1) return candidatas[0];

  const porDiametro = (d: number | null) => {
    if (d == null) return undefined;
    const hits = candidatas.filter((m) => Math.abs(Number(m.diametro_32) - d) < 0.001);
    return hits.length === 1 ? hits[0] : undefined;
  };
  return porDiametro(ancho) || porDiametro(aro);
}

const NeumaticoView: React.FC = () => {
  const [neumaticos, setNeumaticos] = useState<Neumatico[]>([]);
  const [marcas, setMarcas] = useState<MarcaNeumatico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [nFuego, setNFuego] = useState<string>('');
  const [codigoProveedor, setCodigoProveedor] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [medida, setMedida] = useState<string>('');
  const [fechaIngreso, setFechaIngreso] = useState<string>(fechaChileHoy());
  const [observaciones, setObservaciones] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [modoAlta, setModoAlta] = useState<'uno' | 'masiva'>('uno');
  const [filasExcel, setFilasExcel] = useState<FilaExcel[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMarca, setFilterMarca] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id_neumatico_31', direction: 'asc' });

  const API_URL = apiUrl('/neumaticos');
  const MARCAS_URL = apiUrl('/marcas-neumatico?activo=true');

  useEffect(() => {
    fetchNeumaticos();
    fetchMarcas();
  }, []);

  const fetchNeumaticos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_URL);
      const data: ApiResponse<Neumatico[]> = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setNeumaticos(data.data);
      } else {
        setError('Error al cargar los neumáticos');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcas = async () => {
    try {
      const response = await fetch(MARCAS_URL);
      const data: ApiResponse<MarcaNeumatico[]> = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data);
      }
    } catch (err) {
      console.error('Error al cargar marcas:', err);
    }
  };

  const marcaOptions = useMemo(
    () =>
      marcas.map((m) => ({
        value: String(m.id_marca_32),
        label: `${m.marca_32} (${m.diametro_32}")`,
      })),
    [marcas]
  );

  const filterMarcaOptions = useMemo(
    () => [{ value: '', label: 'TODAS LAS MARCAS' }, ...marcaOptions],
    [marcaOptions]
  );

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let filtered = neumaticos.filter((n) => {
      const matchesSearch =
        !q ||
        n.cod_neumatico_31?.toLowerCase().includes(q) ||
        n.marca_32?.toLowerCase().includes(q) ||
        n.modelo_31?.toLowerCase().includes(q) ||
        n.medida_31?.toLowerCase().includes(q) ||
        n.codigo_proveedor_31?.toLowerCase().includes(q) ||
        n.observaciones_31?.toLowerCase().includes(q);
      const matchesMarca = !filterMarca || n.id_marca_31 === Number(filterMarca);
      return matchesSearch && matchesMarca;
    });
    filtered.sort((a, b) => {
      const aRaw = a[sortConfig.key];
      const bRaw = b[sortConfig.key];
      const aVal = aRaw == null ? '' : String(aRaw);
      const bVal = bRaw == null ? '' : String(bRaw);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [neumaticos, searchTerm, filterMarca, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMarca]);

  const handleSort = (key: keyof Neumatico) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const payloadUno = () => ({
    id_marca_31: Number(selectedMarca),
    fecha_ingreso_31: fechaIngreso || undefined,
    observaciones_31: observaciones.trim() || undefined,
    cod_neumatico_31: nFuego.trim() || undefined,
    codigo_proveedor_31: codigoProveedor.trim() || undefined,
    modelo_31: modelo.trim() || undefined,
    medida_31: medida.trim() || undefined,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoAlta === 'masiva') {
      await handleImportarExcel();
      return;
    }
    if (!selectedMarca) {
      await showError('Validación', 'Debe seleccionar una marca del catálogo');
      return;
    }
    if (nFuego.trim() && !FUEGO_RE.test(nFuego.trim())) {
      await showError(
        'N° Fuego',
        'Debe ser T + año + secuencia, sin guion ni ceros. Ejemplos: T261, T2612'
      );
      return;
    }
    try {
      setError('');
      setSaving(true);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadUno()),
      });
      const data: ApiResponse<Neumatico> = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        resetForm();
        const creado = data.data?.cod_neumatico_31 || '';
        await showSuccess(
          '¡Éxito!',
          creado ? `Neumático ${creado} creado` : 'Neumático creado exitosamente'
        );
      } else {
        await showError('Error', data.error || data.message || 'Error al crear el neumático');
      }
    } catch (err) {
      await showError('Error', 'Error al crear el neumático');
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleImportarExcel = async () => {
    if (filasExcel.length === 0) {
      await showError('Excel', 'Cargue el archivo del proveedor (N° Fuego, Código, Marca, Modelo, Medida)');
      return;
    }
    const malas = filasExcel.filter((f) => f.error);
    if (malas.length > 0) {
      await showError(
        'Catálogo / N° Fuego',
        malas
          .slice(0, 8)
          .map((f) => `${f.fuego || '(sin fuego)'}: ${f.error}`)
          .join('\n')
      );
      return;
    }
    try {
      setError('');
      setSaving(true);
      const items = filasExcel.map((f) => ({
        id_marca_31: f.idMarca,
        cod_neumatico_31: f.fuego,
        codigo_proveedor_31: f.codigo || undefined,
        modelo_31: f.modelo || undefined,
        medida_31: f.medida || undefined,
        fecha_ingreso_31: fechaIngreso || undefined,
        observaciones_31: observaciones.trim() || undefined,
      }));
      const response = await fetch(`${API_URL}/lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data: ApiResponse<Neumatico[]> = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        resetForm();
        const lista = Array.isArray(data.data) ? data.data.map((n) => n.cod_neumatico_31).join(', ') : '';
        await showSuccess('Lote creado', data.message || `N° Fuego: ${lista}`);
      } else {
        await showError('Error', data.error || data.message || 'Error al importar el lote');
      }
    } catch (err) {
      await showError('Error', 'Error al importar el lote');
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarca || editingId === null) return;
    try {
      setError('');
      setSaving(true);
      const body = payloadUno();
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_marca_31: body.id_marca_31,
          fecha_ingreso_31: body.fecha_ingreso_31,
          observaciones_31: body.observaciones_31,
          codigo_proveedor_31: body.codigo_proveedor_31,
          modelo_31: body.modelo_31,
          medida_31: body.medida_31,
        }),
      });
      const data: ApiResponse<Neumatico> = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        resetForm();
        await showSuccess('¡Éxito!', 'Neumático actualizado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al actualizar el neumático');
      }
    } catch (err) {
      await showError('Error', 'Error al actualizar el neumático');
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('este neumático');
    if (!confirmed) return;
    try {
      setError('');
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data: ApiResponse = await response.json();
      if (data.success) {
        await fetchNeumaticos();
        await showSuccess('¡Éxito!', 'Neumático eliminado exitosamente');
      } else {
        await showError('Error', data.error || 'Error al eliminar el neumático');
      }
    } catch (err) {
      await showError('Error', 'Error al eliminar el neumático');
      console.error('Error:', err);
    }
  };

  const startEdit = (n: Neumatico) => {
    setEditingId(n.id_neumatico_31);
    setSelectedMarca(String(n.id_marca_31));
    setNFuego(n.cod_neumatico_31 || '');
    setCodigoProveedor(n.codigo_proveedor_31 || '');
    setModelo(n.modelo_31 || '');
    setMedida(n.medida_31 || '');
    setFechaIngreso(n.fecha_ingreso_31 ? String(n.fecha_ingreso_31).slice(0, 10) : fechaChileHoy());
    setObservaciones(n.observaciones_31 || '');
    setModoAlta('uno');
    setFilasExcel([]);
    setNombreArchivo('');
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setSelectedMarca('');
    setNFuego('');
    setCodigoProveedor('');
    setModelo('');
    setMedida('');
    setFechaIngreso(fechaChileHoy());
    setObservaciones('');
    setEditingId(null);
    setShowForm(false);
    setModoAlta('uno');
    setFilasExcel([]);
    setNombreArchivo('');
    setError('');
  };

  const showCreateForm = (modo: 'uno' | 'masiva') => {
    resetForm();
    setModoAlta(modo);
    setShowForm(true);
  };

  const cancelForm = () => resetForm();

  const parseExcel = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    if (!Array.isArray(raw) || raw.length === 0) {
      setFilasExcel([]);
      await showError('Excel', 'La primera hoja no tiene filas');
      return;
    }

    const mapCampos = new Map<string, keyof Omit<FilaExcel, 'idMarca' | 'error'>>();
    Object.keys(raw[0]).forEach((h) => {
      const campo = campoDeClave(claveCol(h));
      if (campo) mapCampos.set(h, campo);
    });

    const vistos = new Set<string>();
    const filas: FilaExcel[] = [];
    for (const row of raw) {
      const leido: Record<string, string> = { fuego: '', codigo: '', marcaExcel: '', modelo: '', medida: '' };
      for (const [h, val] of Object.entries(row)) {
        const campo = mapCampos.get(h) || campoDeClave(claveCol(h));
        if (!campo) continue;
        leido[campo] = String(val ?? '').trim().toUpperCase();
      }
      if (!leido.fuego && !leido.marcaExcel && !leido.codigo) continue;

      let errorFila = '';
      if (!FUEGO_RE.test(leido.fuego)) {
        errorFila = 'N° Fuego inválido (ej. T261, T2612)';
      } else if (vistos.has(leido.fuego)) {
        errorFila = `N° Fuego ${leido.fuego} repetido en el archivo`;
      }
      vistos.add(leido.fuego);

      const marca = cruzarMarcaCatalogo(marcas, leido.marcaExcel, leido.medida);
      if (!errorFila && !marca) {
        const ancho = anchoDesdeMedida(leido.medida);
        errorFila = ancho
          ? `No coincide con Marcas. El catálogo usa el nombre completo (ej. ${leido.marcaExcel} ${ancho})`
          : `Falta ${leido.marcaExcel || 'MARCA'} en Neumáticos → Marcas`;
      }

      filas.push({
        fuego: leido.fuego,
        codigo: leido.codigo,
        marcaExcel: leido.marcaExcel,
        modelo: leido.modelo,
        medida: leido.medida,
        idMarca: marca?.id_marca_32 || 0,
        error: errorFila,
      });
    }
    setFilasExcel(filas);
    setNombreArchivo(file.name);
    if (filas.length === 0) {
      await showError('Excel', 'No se leyeron filas. Columnas: N° Fuego, Código, Marca, Modelo, Medida');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await parseExcel(file);
    } catch (err) {
      console.error(err);
      await showError('Excel', 'No se pudo leer el archivo');
    }
  };

  const handleExport = async () => {
    const dataToExport = filteredAndSorted.map((n) => ({
      ID: n.id_neumatico_31,
      'N° Fuego': n.cod_neumatico_31,
      Estado: n.estado_33 || '',
      Marca: n.marca_32 || '',
      Modelo: n.modelo_31 || '',
      Medida: n.medida_31 || '',
      'Código proveedor': n.codigo_proveedor_31 || '',
      'Fecha Ingreso': n.fecha_ingreso_31 ? String(n.fecha_ingreso_31).slice(0, 10) : '-',
      Observaciones: n.observaciones_31 || '',
    }));
    exportToExcel(dataToExport, 'neumaticos', 'Neumaticos');
    await showSuccess('¡Éxito!', 'Datos exportados exitosamente');
  };

  const filasConError = filasExcel.filter((f) => f.error).length;

  return (
    <div className="bodega-view neumatico-view">
      <header className="view-header">
        <h2>🛞 Gestión de Neumáticos</h2>
        <div className="header-actions">
          {!showForm && (
            <>
              <button
                type="button"
                className="btn-export"
                onClick={handleExport}
                title="Exportar a Excel"
                aria-label="Exportar neumáticos a Excel"
              >
                📊 Exportar
              </button>
              <button
                type="button"
                className="btn-primary neumatico-btn-new"
                onClick={() => showCreateForm('uno')}
                aria-label="Crear un neumático"
              >
                ➕ Uno a uno
              </button>
              <button
                type="button"
                className="btn-primary neumatico-btn-masiva"
                onClick={() => showCreateForm('masiva')}
                aria-label="Cargar Excel de N° Fuego"
              >
                ➕ Carga masiva
              </button>
            </>
          )}
        </div>
      </header>

      {!showForm && (
        <div className="form-container neumatico-search-section">
          <div className="neumatico-filters-row">
            <div className="neumatico-search-wrap">
              <SearchBar
                placeholder="Buscar por N° Fuego, marca, modelo o medida..."
                value={searchTerm}
                onChange={setSearchTerm}
                ariaLabel="Buscar neumáticos por N° Fuego, marca, modelo o medida"
              />
            </div>
            <div className="neumatico-filter-wrap">
              <label htmlFor="filter-marca" className="neumatico-filter-label">
                Filtrar por Marca:
              </label>
              <SearchableSelect
                id="filter-marca"
                value={filterMarca}
                onChange={setFilterMarca}
                options={filterMarcaOptions}
                placeholder="TODAS LAS MARCAS"
                aria-label="Filtrar neumáticos por marca"
              />
            </div>
            <div className="neumatico-results-info">
              Mostrando {currentItems.length} de {filteredAndSorted.length} registros
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="neumatico-alert-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container neumatico-form-card">
          <h3>
            {editingId
              ? '✏️ Editar Neumático'
              : modoAlta === 'masiva'
                ? '➕ Carga masiva desde Excel'
                : '➕ Nuevo Neumático (uno a uno)'}
          </h3>
          {!editingId && modoAlta === 'masiva' && (
            <p className="form-help-text">
              Cada fila del Excel es una cubierta. Columnas: N° Fuego (T261), Código (5202), Marca
              (BRIDGESTONE), Modelo (R152), Medida (315/80 R22.5). La marca debe existir en el
              catálogo; no se inventan códigos TS-.
            </p>
          )}
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            {modoAlta === 'masiva' && !editingId ? (
              <>
                <div className="neumatico-form-grid">
                  <div className="form-group">
                    <label htmlFor="excelNeumaticos">Archivo Excel *</label>
                    <input
                      id="excelNeumaticos"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="form-input"
                      onChange={handleFile}
                      aria-describedby="excel-hint"
                    />
                    <small id="excel-hint" className="form-hint">
                      {nombreArchivo
                        ? `${nombreArchivo}: ${filasExcel.length} filas`
                        : 'Primera hoja. Encabezados como en el Excel del proveedor.'}
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="fechaIngresoMasiva">Fecha de Ingreso:</label>
                    <input
                      id="fechaIngresoMasiva"
                      type="date"
                      className="form-input"
                      value={fechaIngreso}
                      onChange={(e) => setFechaIngreso(e.target.value)}
                    />
                  </div>
                  <div className="form-group form-group-span">
                    <label htmlFor="observacionesMasiva">Observaciones (opcional, para todo el lote):</label>
                    <textarea
                      id="observacionesMasiva"
                      className="form-input form-textarea"
                      value={observaciones}
                      onChange={(e) => changeKeepingCaret(e, setObservaciones)}
                      placeholder="OPCIONAL"
                      rows={2}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
                {filasExcel.length > 0 && (
                  <div className="table-container neumatico-excel-preview">
                    <p className={filasConError ? 'neumatico-preview-error' : 'form-help-text'}>
                      {filasConError
                        ? `${filasConError} fila(s) con error. Corrija el Excel o cree la marca en el catálogo.`
                        : `${filasExcel.length} filas listas para grabar.`}
                    </p>
                    <table className="data-table neumatico-table" role="grid" aria-label="Vista previa del Excel">
                      <thead>
                        <tr>
                          <th scope="col">N° FUEGO</th>
                          <th scope="col">CÓDIGO</th>
                          <th scope="col">MARCA EXCEL</th>
                          <th scope="col">MODELO</th>
                          <th scope="col">MEDIDA</th>
                          <th scope="col">CATÁLOGO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasExcel.map((f, i) => (
                          <tr key={`${f.fuego}-${i}`} className={f.error ? 'neumatico-fila-error' : undefined}>
                            <td className="codigo-neumatico">{f.fuego || '—'}</td>
                            <td>{f.codigo || '—'}</td>
                            <td>{f.marcaExcel || '—'}</td>
                            <td>{f.modelo || '—'}</td>
                            <td>{f.medida || '—'}</td>
                            <td>
                              {f.error
                                ? f.error
                                : marcaOptions.find((o) => o.value === String(f.idMarca))?.label || 'OK'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="neumatico-form-grid">
                <div className="form-group">
                  <label htmlFor="nFuego">N° Fuego {editingId ? '' : '(opcional)'}</label>
                  <input
                    id="nFuego"
                    className="form-input"
                    value={nFuego}
                    onChange={(e) => changeKeepingCaret(e, setNFuego)}
                    placeholder="T261"
                    style={{ textTransform: 'uppercase' }}
                    disabled={Boolean(editingId)}
                    maxLength={20}
                    aria-describedby="fuego-hint"
                  />
                  <small id="fuego-hint" className="form-hint">
                    T + año + secuencia, sin ceros. 2026: T261 … T2612. 2027: T271. Si lo deja vacío,
                    el sistema asigna el siguiente.
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="marca">Marca *</label>
                  <SearchableSelect
                    id="marca"
                    value={selectedMarca}
                    onChange={setSelectedMarca}
                    options={marcaOptions}
                    placeholder="BRIDGESTONE..."
                    required
                    emptyMessage="No está en el catálogo. Créala en Neumáticos → Marcas"
                    aria-label="Marca del neumático"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="codigoProveedor">Código proveedor</label>
                  <input
                    id="codigoProveedor"
                    className="form-input"
                    value={codigoProveedor}
                    onChange={(e) => changeKeepingCaret(e, setCodigoProveedor)}
                    placeholder="5202"
                    style={{ textTransform: 'uppercase' }}
                    maxLength={30}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modelo">Modelo</label>
                  <input
                    id="modelo"
                    className="form-input"
                    value={modelo}
                    onChange={(e) => changeKeepingCaret(e, setModelo)}
                    placeholder="R152"
                    style={{ textTransform: 'uppercase' }}
                    maxLength={40}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="medida">Medida</label>
                  <input
                    id="medida"
                    className="form-input"
                    value={medida}
                    onChange={(e) => changeKeepingCaret(e, setMedida)}
                    placeholder="315/80 R22.5"
                    style={{ textTransform: 'uppercase' }}
                    maxLength={30}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fechaIngreso">Fecha de Ingreso:</label>
                  <input
                    id="fechaIngreso"
                    type="date"
                    className="form-input"
                    value={fechaIngreso}
                    onChange={(e) => setFechaIngreso(e.target.value)}
                  />
                </div>
                <div className="form-group form-group-span">
                  <label htmlFor="observaciones">Observaciones:</label>
                  <textarea
                    id="observaciones"
                    className="form-input form-textarea"
                    value={observaciones}
                    onChange={(e) => changeKeepingCaret(e, setObservaciones)}
                    placeholder="OPCIONAL"
                    rows={2}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            )}
            <div className="form-actions">
              <button
                type="submit"
                className="btn-success"
                disabled={saving}
                aria-label={
                  editingId
                    ? 'Guardar cambios del neumático'
                    : modoAlta === 'masiva'
                      ? 'Importar filas del Excel'
                      : 'Crear un neumático'
                }
              >
                {saving
                  ? 'Guardando...'
                  : editingId
                    ? '💾 Actualizar'
                    : modoAlta === 'masiva'
                      ? '➕ Importar filas'
                      : '➕ Crear'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelForm}
                aria-label="Cancelar y cerrar formulario"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ Cargando neumáticos...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table neumatico-table" role="grid" aria-label="Lista de neumáticos">
              <thead>
                <tr>
                  <th onClick={() => handleSort('cod_neumatico_31')} className="sortable" scope="col">
                    N° FUEGO
                  </th>
                  <th onClick={() => handleSort('estado_33')} className="sortable" scope="col">
                    ESTADO
                  </th>
                  <th onClick={() => handleSort('marca_32')} className="sortable" scope="col">
                    MARCA
                  </th>
                  <th onClick={() => handleSort('modelo_31')} className="sortable" scope="col">
                    MODELO
                  </th>
                  <th onClick={() => handleSort('medida_31')} className="sortable" scope="col">
                    MEDIDA
                  </th>
                  <th onClick={() => handleSort('codigo_proveedor_31')} className="sortable" scope="col">
                    CÓD. PROV.
                  </th>
                  <th onClick={() => handleSort('fecha_ingreso_31')} className="sortable" scope="col">
                    FECHA
                  </th>
                  <th scope="col">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-data">
                      {searchTerm || filterMarca
                        ? '📋 No se encontraron neumáticos con los filtros aplicados'
                        : '📋 No hay neumáticos registrados'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((n) => (
                    <tr key={n.id_neumatico_31}>
                      <td className="codigo-neumatico" title={etiquetaNeumatico(n)}>
                        {n.cod_neumatico_31}
                      </td>
                      <td>{n.estado_33 || '-'}</td>
                      <td className="marca-name">{n.marca_32}</td>
                      <td>{n.modelo_31 || '-'}</td>
                      <td>{n.medida_31 || '-'}</td>
                      <td>{n.codigo_proveedor_31 || '-'}</td>
                      <td>{n.fecha_ingreso_31 ? String(n.fecha_ingreso_31).slice(0, 10) : '-'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => startEdit(n)}
                          title="Editar neumático"
                          aria-label={`Editar neumático ${n.cod_neumatico_31}`}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDelete(n.id_neumatico_31)}
                          title="Eliminar neumático"
                          aria-label={`Eliminar neumático ${n.cod_neumatico_31}`}
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

          {filteredAndSorted.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSorted.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default NeumaticoView;
