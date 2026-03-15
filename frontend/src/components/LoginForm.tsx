import React, { useState } from 'react';
import './BodegaView.css';

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordExpiredForm, setShowPasswordExpiredForm] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({
    password_nueva: '',
    confirmar_password: ''
  });
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPasswordData({
      ...newPasswordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setChangePasswordSuccess(false);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        window.location.href = (window.location.pathname || '/') + '#dashboard';
      } else {
        setError(data.error || 'Error en el login');
        if (data.requiereCambioPassword) {
          setShowPasswordExpiredForm(true);
        }
      }
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordExpired = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordData.password_nueva !== newPasswordData.confirmar_password) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPasswordData.password_nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/auth/change-password-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password_actual: formData.password,
          password_nueva: newPasswordData.password_nueva
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setChangePasswordSuccess(true);
        setShowPasswordExpiredForm(false);
        setError('');
        setFormData((prev) => ({ ...prev, password: '' }));
        setNewPasswordData({ password_nueva: '', confirmar_password: '' });
      } else {
        setError(data.error || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bodega-view" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        width: '100%', 
        padding: '3rem',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ color: '#333', marginBottom: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>
            🔐 Sistema de Autenticación
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Ingrese sus credenciales para acceder
          </p>
        </div>

        {changePasswordSuccess && (
          <div style={{ 
            background: '#D1FAE5', 
            color: '#065F46', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '1rem'
          }}>
            ✅ Contraseña actualizada. Ya puede iniciar sesión con su nueva contraseña.
          </div>
        )}

        {showPasswordExpiredForm ? (
          <form onSubmit={handleChangePasswordExpired} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              background: '#FEF3C7', 
              color: '#92400E', 
              padding: '1rem', 
              borderRadius: '8px',
              fontSize: '1rem'
            }}>
              Su contraseña ha expirado. Ingrese su contraseña actual y una nueva para continuar.
            </div>
            {error && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '1rem', borderRadius: '8px' }}>
                ⚠️ {error}
              </div>
            )}
            <div className="form-group">
              <label style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Correo Electrónico:
              </label>
              <input
                type="email"
                value={formData.email}
                readOnly
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: '#f3f4f6'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Contraseña actual:
              </label>
              <input
                type="password"
                value={formData.password}
                readOnly
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: '#f3f4f6'
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password_nueva" style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Nueva contraseña:
              </label>
              <input
                type="password"
                id="password_nueva"
                name="password_nueva"
                required
                minLength={8}
                value={newPasswordData.password_nueva}
                onChange={handleNewPasswordChange}
                placeholder="Mín. 8 caracteres, mayúsculas, minúsculas, números y especiales"
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmar_password" style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Confirmar nueva contraseña:
              </label>
              <input
                type="password"
                id="confirmar_password"
                name="confirmar_password"
                required
                value={newPasswordData.confirmar_password}
                onChange={handleNewPasswordChange}
                placeholder="Repita la nueva contraseña"
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '1.5rem', padding: '1.2rem', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '⏳ Actualizando...' : '🔑 Actualizar contraseña'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setShowPasswordExpiredForm(false); setError(''); }}
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#f3f4f6', cursor: 'pointer' }}
            >
              ← Volver al login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div style={{ 
                background: '#FEE2E2', 
                color: '#991B1B', 
                padding: '1rem', 
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Correo Electrónico:
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Contraseña:
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Ingrese su contraseña"
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ 
                width: '100%', 
                marginTop: '1.5rem',
                padding: '1.2rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? '⏳ Iniciando sesión...' : '🚀 Iniciar Sesión'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '1rem', color: '#666' }}>
          <p>
            ¿No tiene una cuenta?{' '}
            <a 
              href="#register" 
              style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem' }}
            >
              Regístrese aquí
            </a>
          </p>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: '#F3F4F6', 
          borderRadius: '10px',
          fontSize: '0.95rem',
          color: '#666'
        }}>
          <p style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
            Controles de seguridad:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '2' }}>
            <li style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Bloqueo después de 10 intentos fallidos</li>
            <li style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Expiración de sesión: 30 minutos</li>
            <li style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Requisitos de complejidad de contraseña</li>
            <li style={{ fontSize: '1rem' }}>Caducidad de contraseña: 91 días</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

