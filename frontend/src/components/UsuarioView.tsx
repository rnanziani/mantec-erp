import React, { useState, useEffect, useMemo } from 'react';
import './BodegaView.css';
import { useToast } from '../context/ToastContext';
import Pagination from './shared/Pagination';
import { showDeleteConfirm } from '../utils/swal';

interface Usuario {
  id_usuario_00: number;
  username: string;
  email: string;
  nombre_completo_00?: string;
  is_active: boolean;
  password_expires_at: string;
  last_password_change_at: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  id_nivel_04?: number | null;
  nombre_nivel_04?: string | null;
  descripcion_04?: string | null;
}

interface NivelUsuario {
  id_nivel_04: number;
  nombre_nivel_04: string;
  descripcion_04: string | null;
}

interface HistorialContrasena {
  id_historial_01: number;
  id_usuario_01: number;
  fecha_cambio_01: string;
  username?: string;
  email?: string;
}

interface IntentoLogin {
  id_intento_02: number;
  id_usuario_02?: number;
  attempted_email: string;
  ip_address_02?: string;
  exitoso_02: boolean;
  fecha_intento_02: string;
  username?: string;
}

interface Sesion {
  id_sesion_03: string;
  id_usuario_03: number;
  fecha_creacion_03: string;
  fecha_expiracion_03: string;
  ip_address_03?: string;
  user_agent_03?: string;
  username?: string;
  email?: string;
  activa: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  count?: number;
  message?: string;
  error?: string;
}

type SortConfig = {
  key: keyof Usuario;
  direction: 'asc' | 'desc';
};

const UsuarioView: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [niveles, setNiveles] = useState<NivelUsuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Form fields
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [nombreCompleto, setNombreCompleto] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [idNivel, setIdNivel] = useState<number | ''>('');

  // Modales de información
  const [showHistorial, setShowHistorial] = useState<boolean>(false);
  const [showIntentos, setShowIntentos] = useState<boolean>(false);
  const [showSesiones, setShowSesiones] = useState<boolean>(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [historialData, setHistorialData] = useState<HistorialContrasena[]>([]);
  const [intentosData, setIntentosData] = useState<IntentoLogin[]>([]);
  const [sesionesData, setSesionesData] = useState<Sesion[]>([]);

  // Búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const { showToast } = useToast();
  const API_URL = 'http://localhost:3001/api/usuarios';
  const NIVELES_URL = 'http://localhost:3001/api/niveles-usuario';

  useEffect(() => {
    fetchUsuarios();
    fetchNiveles();
  }, []);

  const fetchNiveles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(NIVELES_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setNiveles(data.data);
      }
    } catch (err) {
      console.error('Error al cargar niveles:', err);
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setUsuarios(data.data);
      } else {
        setError(data.error || 'Error al cargar usuarios');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${id}/historial-contrasenas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setHistorialData(data.data);
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    }
  };

  const fetchIntentos = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${id}/intentos-login`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setIntentosData(data.data);
      }
    } catch (err) {
      console.error('Error al cargar intentos:', err);
    }
  };

  const fetchSesiones = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${id}/sesiones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setSesionesData(data.data);
      }
    } catch (err) {
      console.error('Error al cargar sesiones:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      showToast('Username, email y password son requeridos', 'error');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          password,
          nombre_completo_00: nombreCompleto || null,
          is_active: isActive,
          id_nivel_04: idNivel || null
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchUsuarios();
        resetForm();
        showToast('Usuario creado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear usuario', 'error');
      }
    } catch (err) {
      showToast('Error al crear usuario', 'error');
      console.error('Error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || editingId === null) {
      showToast('Username y email son requeridos', 'error');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          nombre_completo_00: nombreCompleto || null,
          is_active: isActive,
          id_nivel_04: idNivel || null
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchUsuarios();
        resetForm();
        showToast('Usuario actualizado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al actualizar usuario', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar usuario', 'error');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm(
        'este usuario',
        'Se eliminarán también todos sus datos relacionados.'
    );
    if (!confirmed) return;

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchUsuarios();
        showToast('Usuario eliminado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al eliminar usuario', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar usuario', 'error');
      console.error('Error:', err);
    }
  };

  const startEdit = (usuario: Usuario) => {
    setEditingId(usuario.id_usuario_00);
    setUsername(usuario.username);
    setEmail(usuario.email);
    setNombreCompleto(usuario.nombre_completo_00 || '');
    setIsActive(usuario.is_active);
    setIdNivel(usuario.id_nivel_04 || '');
    setPassword('');
    setShowForm(true);
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setNombreCompleto('');
    setIsActive(true);
    setIdNivel('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleVerHistorial = async (id: number) => {
    setUsuarioSeleccionado(id);
    setShowHistorial(true);
    await fetchHistorial(id);
  };

  const handleVerIntentos = async (id: number) => {
    setUsuarioSeleccionado(id);
    setShowIntentos(true);
    await fetchIntentos(id);
  };

  const handleVerSesiones = async (id: number) => {
    setUsuarioSeleccionado(id);
    setShowSesiones(true);
    await fetchSesiones(id);
  };

  // Filtrado y ordenamiento
  const processedUsuarios = useMemo(() => {
    let filtered = usuarios.filter(usuario => {
      const matchesSearch = !searchTerm ||
        usuario.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (usuario.nombre_completo_00 && usuario.nombre_completo_00.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEstado = filterEstado === 'all' ||
        (filterEstado === 'active' && usuario.is_active) ||
        (filterEstado === 'inactive' && !usuario.is_active);

      return matchesSearch && matchesEstado;
    });

    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [usuarios, searchTerm, filterEstado, sortConfig]);

  const usuariosPaginados = useMemo(() => {
    const inicio = (currentPage - 1) * itemsPerPage;
    const fin = inicio + itemsPerPage;
    return processedUsuarios.slice(inicio, fin);
  }, [processedUsuarios, currentPage]);

  const totalPaginas = Math.ceil(processedUsuarios.length / itemsPerPage);

  const handleSort = (key: keyof Usuario) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bodega-view">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>👥</span>
          <span>👥</span>
          <span>Gestión de Usuarios</span>
        </h2>
        {!showForm && (
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Nuevo Usuario
          </button>
        )}
      </div>

      {error && (
        <div className="form-container" style={{ background: '#FEE2E2', color: '#991B1B', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <button
              type="button"
              className="btn-primary"
              onClick={resetForm}
              style={{ padding: '8px 16px' }}
            >
              ✕ Cancelar
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="usuario123"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="correo@ejemplo.com"
                />
              </div>

              {!editingId && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              )}
            </div>

            {!editingId && (
              <div style={{ marginBottom: '15px' }}>
                <small style={{ color: '#6c757d', fontSize: '0.85em' }}>
                  La contraseña debe cumplir: mínimo 8 caracteres y al menos 2 de: mayúsculas/minúsculas, dígitos, caracteres especiales
                </small>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="form-group">
                <label>Nivel de Acceso</label>
                <select
                  value={idNivel}
                  onChange={(e) => setIdNivel(e.target.value ? parseInt(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">Sin nivel asignado</option>
                  {niveles.map(nivel => (
                    <option key={nivel.id_nivel_04} value={nivel.id_nivel_04}>
                      {nivel.nombre_nivel_04} {nivel.descripcion_04 ? `- ${nivel.descripcion_04}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <small style={{ color: '#6c757d', fontSize: '0.85em' }}>
                💡 El usuario heredará los permisos asignados a este nivel. También puedes asignar permisos directos adicionales.
              </small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Usuario Activo</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <div className="form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Buscar:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por username, email o nombre..."
            />
          </div>
          <div className="form-group">
            <label>Estado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ Cargando usuarios...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id_usuario_00')} className={`sortable ${sortConfig.key === 'id_usuario_00' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                    ID
                  </th>
                  <th onClick={() => handleSort('username')} className={`sortable ${sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                    USERNAME
                  </th>
                  <th onClick={() => handleSort('email')} className={`sortable ${sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                    EMAIL
                  </th>
                  <th onClick={() => handleSort('nombre_completo_00')} className={`sortable ${sortConfig.key === 'nombre_completo_00' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                    NOMBRE COMPLETO
                  </th>
                  <th>NIVEL DE ACCESO</th>
                  <th onClick={() => handleSort('is_active')} className={`sortable ${sortConfig.key === 'is_active' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                    ESTADO
                  </th>
                  <th onClick={() => handleSort('last_login_at')} className={`sortable ${sortConfig.key === 'last_login_at' ? (sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                    ÚLTIMO LOGIN
                  </th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {usuariosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                      {searchTerm || filterEstado !== 'all'
                        ? '📋 No se encontraron usuarios con los filtros aplicados'
                        : '📋 No hay usuarios registrados'}
                    </td>
                  </tr>
                ) : (
                  usuariosPaginados.map((usuario) => (
                    <tr key={usuario.id_usuario_00}>
                      <td>{usuario.id_usuario_00}</td>
                      <td>{usuario.username}</td>
                      <td>{usuario.email}</td>
                      <td>{usuario.nombre_completo_00 || '-'}</td>
                      <td>
                        {usuario.nombre_nivel_04 ? (
                          <span style={{ 
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            backgroundColor: '#E0E7FF',
                            color: '#3730A3',
                            fontSize: '0.85em',
                            fontWeight: '500'
                          }}>
                            {usuario.nombre_nivel_04}
                          </span>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9em' }}>Sin nivel</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${usuario.is_active ? 'active' : 'inactive'}`}>
                          {usuario.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{formatDate(usuario.last_login_at || '')}</td>
                      <td className="actions">
                        <button
                          onClick={() => startEdit(usuario)}
                          title="Editar"
                          style={{ 
                            background: '#FF6B35', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 10px', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            fontSize: '14px'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => window.location.hash = `usuario-permisos`}
                          title="Permisos"
                          style={{ 
                            background: '#3B82F6', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 10px', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            fontSize: '14px'
                          }}
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => {
                            handleVerHistorial(usuario.id_usuario_00);
                            handleVerIntentos(usuario.id_usuario_00);
                            handleVerSesiones(usuario.id_usuario_00);
                          }}
                          title="Ver Detalles"
                          style={{ 
                            background: '#3B82F6', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 10px', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            fontSize: '14px'
                          }}
                        >
                          📁
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id_usuario_00)}
                          title="Eliminar"
                          style={{ 
                            background: '#9CA3AF', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 10px', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
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

          {totalPaginas > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPaginas}
              totalItems={processedUsuarios.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Modal Historial de Contraseñas */}
      {showHistorial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>🔑 Historial de Contraseñas</h3>
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha de Cambio</th>
                </tr>
              </thead>
              <tbody>
                {historialData.map((h) => (
                  <tr key={h.id_historial_01}>
                    <td>{h.id_historial_01}</td>
                    <td>{formatDate(h.fecha_cambio_01)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-secondary" onClick={() => setShowHistorial(false)} style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Intentos de Login */}
      {showIntentos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>🔐 Intentos de Login</h3>
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Email Intentado</th>
                  <th>IP Address</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {intentosData.map((i) => (
                  <tr key={i.id_intento_02}>
                    <td>{formatDate(i.fecha_intento_02)}</td>
                    <td>{i.attempted_email}</td>
                    <td>{i.ip_address_02 || '-'}</td>
                    <td>
                      <span className={`status-badge ${i.exitoso_02 ? 'active' : 'inactive'}`}>
                        {i.exitoso_02 ? 'Exitoso' : 'Fallido'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-secondary" onClick={() => setShowIntentos(false)} style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Sesiones */}
      {showSesiones && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '1000px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>📱 Sesiones del Usuario</h3>
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Fecha Creación</th>
                  <th>Fecha Expiración</th>
                  <th>IP Address</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sesionesData.map((s) => (
                  <tr key={s.id_sesion_03}>
                    <td>{formatDate(s.fecha_creacion_03)}</td>
                    <td>{formatDate(s.fecha_expiracion_03)}</td>
                    <td>{s.ip_address_03 || '-'}</td>
                    <td>
                      <span className={`status-badge ${s.activa ? 'active' : 'inactive'}`}>
                        {s.activa ? 'Activa' : 'Expirada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-secondary" onClick={() => setShowSesiones(false)} style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuarioView;

