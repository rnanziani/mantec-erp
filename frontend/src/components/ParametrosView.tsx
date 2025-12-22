import React, { useState, useEffect } from 'react';
import './BodegaView.css';
import { useToast } from '../context/ToastContext';

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
  const API_URL = 'http://localhost:3001/api/parametros';

  useEffect(() => {
    fetchParametros();
  }, []);

  const fetchParametros = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener parámetros');
      }

      const data: ApiResponse = await response.json();
      if (data.success && data.data) {
        setParametros(data.data);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar parámetros');
      showToast('Error al cargar parámetros: ' + err.message, 'error');
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valor_parametro: editValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar parámetro');
      }

      const data: ApiResponse = await response.json();
      if (data.success) {
        showToast('Parámetro actualizado exitosamente', 'success');
        fetchParametros(); // Recargar lista
        handleCancel();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      showToast('Error al actualizar parámetro: ' + err.message, 'error');
    }
  };

  const getTipoDatoLabel = (tipo: string): string => {
    const tipos: { [key: string]: string } = {
      'NUMERO': 'Número',
      'TEXTO': 'Texto',
      'BOOLEANO': 'Booleano',
      'FECHA': 'Fecha'
    };
    return tipos[tipo] || tipo;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="mantec-container">
        <div className="mantec-header">
          <h2>⚙️ Parámetros del Sistema</h2>
        </div>
        <div className="loading">Cargando parámetros...</div>
      </div>
    );
  }

  return (
    <div className="mantec-container">
      <div className="mantec-header">
        <h2>⚙️ Parámetros del Sistema</h2>
        <p className="mantec-subtitle">
          Gestiona los parámetros configurables del sistema como tiempo de sesión y caducidad de contraseñas
        </p>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="mantec-table-container">
        <table className="mantec-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Última Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {parametros.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  No hay parámetros configurados
                </td>
              </tr>
            ) : (
              parametros.map((parametro) => (
                <tr key={parametro.id_parametro_000}>
                  <td>
                    <strong>{parametro.codigo_parametro_000}</strong>
                  </td>
                  <td>{parametro.nombre_parametro_000}</td>
                  <td>
                    {editingId === parametro.id_parametro_000 ? (
                      <input
                        type={parametro.tipo_dato_000 === 'NUMERO' ? 'number' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="mantec-input"
                        style={{ width: '150px' }}
                      />
                    ) : (
                      <span>{parametro.valor_parametro_000}</span>
                    )}
                  </td>
                  <td>
                    <span className="badge">{getTipoDatoLabel(parametro.tipo_dato_000)}</span>
                  </td>
                  <td style={{ maxWidth: '300px', fontSize: '0.9em', color: '#666' }}>
                    {parametro.descripcion_000}
                  </td>
                  <td>{formatDate(parametro.fecha_actualizacion_000)}</td>
                  <td>
                    {editingId === parametro.id_parametro_000 ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleSave(parametro.id_parametro_000)}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '0.85em' }}
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancel}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.85em' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(parametro)}
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '0.85em' }}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mantec-info-box" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '5px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>ℹ️ Información</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>SESSION_TIMEOUT_MINUTES:</strong> Tiempo en minutos que dura una sesión antes de expirar.</li>
          <li><strong>PASSWORD_EXPIRATION_DAYS:</strong> Número de días antes de que una contraseña expire.</li>
          <li><strong>JWT_EXPIRATION_MINUTES:</strong> Tiempo en minutos que dura un token JWT antes de expirar.</li>
        </ul>
        <p style={{ marginTop: '10px', marginBottom: 0, fontSize: '0.9em', color: '#666' }}>
          <strong>Nota:</strong> Los cambios en estos parámetros afectarán a nuevas sesiones y usuarios creados. 
          Las sesiones existentes mantendrán su tiempo de expiración original.
        </p>
      </div>
    </div>
  );
};

export default ParametrosView;







