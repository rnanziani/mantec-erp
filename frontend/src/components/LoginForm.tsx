import React, { useState } from 'react';
import './BodegaView.css';

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        // Guardar token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        
        // Redirigir al dashboard
        window.location.hash = 'dashboard';
      } else {
        setError(data.error || 'Error en el login');
        
        // Si requiere cambio de contraseña, redirigir a esa página
        if (data.requiereCambioPassword) {
          window.location.hash = 'change-password';
        }
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%', 
        padding: '2rem',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>
            🔐 Sistema de Autenticación
          </h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Ingrese sus credenciales para acceder
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ 
              background: '#FEE2E2', 
              color: '#991B1B', 
              padding: '0.75rem', 
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingrese su contraseña"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? '⏳ Iniciando sesión...' : '🚀 Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
          <p>
            ¿No tiene una cuenta?{' '}
            <a 
              href="#register" 
              style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Regístrese aquí
            </a>
          </p>
        </div>

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          background: '#F3F4F6', 
          borderRadius: '5px',
          fontSize: '0.8rem',
          color: '#666'
        }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Controles de seguridad:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
            <li>Bloqueo después de 10 intentos fallidos</li>
            <li>Expiración de sesión: 30 minutos</li>
            <li>Requisitos de complejidad de contraseña</li>
            <li>Caducidad de contraseña: 91 días</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

