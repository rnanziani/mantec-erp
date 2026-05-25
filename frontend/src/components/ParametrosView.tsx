import React, { useState, useEffect } from 'react';
import './BodegaView.css';
import { useToast } from '../context/ToastContext';
import { apiUrl } from '../lib/apiClient';

interface Parametro {
  id_parametro_000: number;
  codigo_parametro_000: string;
  nombre_parametro_000: string;
  valor_parametro_000: string;
  descripcion_000: string;
  tipo_dato_000: string;
  activo_000: boolean;
  fecha_creacion_000: string;
  fecha_actualizacion_000: string;
  usuario_actualizacion_000?: number;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  count?: number;
  message?: string;
  error?: string;
}

const ParametrosView: React.FC = () => {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { showToast } = useToast();
  const API_URL = apiUrl('/parametros');

  useEffect(() => {
    fetchParametros();
  }, []);

  const fetchParametros = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = 'No hay token de autenticación. Por favor, inicia sesión.';
        setError(errorMsg);
        showToast(errorMsg, 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      if (data.success && data.data) {
        setParametros(data.data);
        setError('');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar parámetros';

      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        const networkError =
          'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el servidor API';
        setError(networkError);
        showToast(networkError, 'error');
      } else {
        setError(message);
        showToast('Error al cargar parámetros: ' + message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (parametro: Parametro) => {
    setEditingId(parametro.id_parametro_000);
    setEditValue(parametro.valor_parametro_000);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valor_parametro: editValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar parámetro');
      }

      const data: ApiResponse = await response.json();
      if (data.success) {
        showToast('Parámetro actualizado exitosamente', 'success');
        fetchParametros();
        handleCancel();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      showToast('Error al actualizar parámetro: ' + message, 'error');
    }
  };

  const getTipoDatoLabel = (tipo: string): string => {
    const tipos: Record<string, string> = {
      NUMERO: 'Número',
      TEXTO: 'Texto',
      BOOLEANO: 'Booleano',
      FECHA: 'Fecha',
    };
    return tipos[tipo] || tipo;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bodega-view">
      <div className="view-header">
        <div>
          <h2>⚙️ Parámetros del Sistema</h2>
          <p style={{ margin: '6px 0 0', color: '#6c757d', fontSize: '0.95rem' }}>
            Gestiona los parámetros configurables del sistema como tiempo de sesión y caducidad de
            contraseñas
          </p>
        </div>
      </div>

      {error && (
        <div
          className="form-container"
          style={{ background: '#FEE2E2', color: '#991B1B', marginBottom: '20px' }}
          role="alert"
        >
          ⚠️ <strong>Error:</strong> {error}
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Última actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  ⏳ Cargando parámetros...
                </td>
              </tr>
            ) : parametros.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay parámetros configurados
                </td>
              </tr>
            ) : (
              parametros.map((parametro) => (
                <tr key={parametro.id_parametro_000}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {parametro.codigo_parametro_000}
                    </strong>
                  </td>
                  <td>{parametro.nombre_parametro_000}</td>
                  <td>
                    {editingId === parametro.id_parametro_000 ? (
                      <input
                        type={parametro.tipo_dato_000 === 'NUMERO' ? 'number' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{
                          width: '120px',
                          padding: '6px 10px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                        aria-label={`Valor de ${parametro.codigo_parametro_000}`}
                      />
                    ) : (
                      <strong>{parametro.valor_parametro_000}</strong>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-success">{getTipoDatoLabel(parametro.tipo_dato_000)}</span>
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '0.9em', color: '#495057' }}>
                    {parametro.descripcion_000}
                  </td>
                  <td>{formatDate(parametro.fecha_actualizacion_000)}</td>
                  <td className="actions">
                    {editingId === parametro.id_parametro_000 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSave(parametro.id_parametro_000)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEdit(parametro)}
                        className="btn-edit"
                        title="Editar valor"
                        aria-label={`Editar ${parametro.codigo_parametro_000}`}
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className="form-container"
        style={{ marginTop: '20px', background: '#f0f7ff', borderColor: '#b8d4f0' }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#1e3a5f', fontSize: '1rem' }}>
          ℹ️ Información
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', lineHeight: 1.6 }}>
          <li>
            <strong>SESSION_TIMEOUT_SECONDS:</strong> Tiempo en segundos que dura una sesión antes de
            expirar. Si no existe, se usa SESSION_TIMEOUT_MINUTES × 60.
          </li>
          <li>
            <strong>PASSWORD_EXPIRATION_DAYS:</strong> Número de días antes de que una contraseña
            expire.
          </li>
          <li>
            <strong>JWT_EXPIRATION_MINUTES:</strong> Tiempo en minutos que dura un token JWT antes de
            expirar.
          </li>
        </ul>
        <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '0.9em', color: '#6c757d' }}>
          <strong>Nota:</strong> Los cambios en estos parámetros afectarán a nuevas sesiones y usuarios
          creados. Las sesiones existentes mantendrán su tiempo de expiración original.
        </p>
      </div>
    </div>
  );
};

export default ParametrosView;
