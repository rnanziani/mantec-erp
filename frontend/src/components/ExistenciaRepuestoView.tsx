import React, { useEffect, useMemo, useState } from 'react';
import './BodegaView.css';
import { showError } from '../utils/swal';
import { apiFetch, apiUrl } from '../lib/apiClient';

interface Existencia {
  idexistencia_85: number;
  codigo_81?: string;
  nombre_tipo_57?: string;
  ubicacion_descripcion?: string;
  cantidad_85: number;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  proveedor_nombre?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ExistenciaRepuestoView: React.FC = () => {
  const [items, setItems] = useState<Existencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(apiUrl('/existencias-repuesto'));
        const data: ApiResponse<Existencia[]> = await res.json();
        if (data.success && Array.isArray(data.data)) setItems(data.data);
        else await showError('Error', data.error || 'No se pudo cargar el stock');
      } catch {
        await showError('Error', 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const processed = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) =>
      [e.codigo_81, e.nombre_tipo_57, e.ubicacion_descripcion, e.maquina_numinterno, e.maquina_ppu, e.proveedor_nombre]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, filtro]);

  const detalle = (e: Existencia) => {
    if (e.maquina_numinterno) return `${e.maquina_numinterno}${e.maquina_ppu ? ` (${e.maquina_ppu})` : ''}`;
    if (e.proveedor_nombre) return e.proveedor_nombre;
    return '—';
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <h2>Stock actual de unidades</h2>
      </div>
      <div className="form-container" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Buscar código, tipo, ubicación…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          aria-label="Buscar stock"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ced4da' }}
        />
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Ubicación</th>
              <th>Detalle</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Cargando...</td>
              </tr>
            ) : processed.length === 0 ? (
              <tr>
                <td colSpan={5}>Sin stock. Las unidades aparecen al registrar el primer movimiento.</td>
              </tr>
            ) : (
              processed.map((e) => (
                <tr key={e.idexistencia_85}>
                  <td>
                    <strong>{e.codigo_81}</strong>
                  </td>
                  <td>{e.nombre_tipo_57}</td>
                  <td>{e.ubicacion_descripcion}</td>
                  <td>{detalle(e)}</td>
                  <td>{e.cantidad_85}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExistenciaRepuestoView;
