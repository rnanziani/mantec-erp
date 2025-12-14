import React, { useState } from 'react';
import './BodegaView.css';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nombre_completo_00: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digits: false,
    special: false,
    twoControls: false
  });

  const validatePassword = (password: string) => {
    const validations = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digits: /\d/.test(password),
      special: /[!@#$%&*()/\][:";><?,.]/.test(password),
      twoControls: false
    };

    let controlsCount = 0;
    if (validations.uppercase && validations.lowercase) controlsCount++;
    if (validations.digits) controlsCount++;
    if (validations.special) controlsCount++;
    
    validations.twoControls = controlsCount >= 2;

    return validations;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const validation = validatePassword(formData.password);
    if (!validation.length || !validation.twoControls) {
      setError('La contraseña no cumple con los requisitos de complejidad');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          nombre_completo_00: formData.nombre_completo_00
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Usuario creado exitosamente. Redirigiendo al login...');
        setTimeout(() => {
          window.location.hash = 'login';
        }, 2000);
      } else {
        setError(data.error || 'Error en el registro');
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
        maxWidth: '500px', 
        width: '100%', 
        padding: '2rem',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>
            ✨ Crear Cuenta Segura
          </h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Regístrese con credenciales que cumplan nuestros estándares de seguridad
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

          {success && (
            <div style={{ 
              background: '#D1FAE5', 
              color: '#065F46', 
              padding: '0.75rem', 
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              ✅ {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario:</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="usuario123"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre_completo_00">Nombre Completo:</label>
            <input
              type="text"
              id="nombre_completo_00"
              name="nombre_completo_00"
              value={formData.nombre_completo_00}
              onChange={handleChange}
              placeholder="Juan Pérez"
            />
          </div>

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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirme su contraseña"
            />
          </div>

          {formData.password && (
            <div style={{ 
              padding: '1rem', 
              background: '#F3F4F6', 
              borderRadius: '5px',
              fontSize: '0.85rem'
            }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
                Requisitos de contraseña:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.8' }}>
                <li style={{ color: passwordValidation.length ? '#059669' : '#DC2626' }}>
                  {passwordValidation.length ? '✅' : '❌'} Mínimo 8 caracteres
                </li>
                <li style={{ color: passwordValidation.uppercase && passwordValidation.lowercase ? '#059669' : '#DC2626' }}>
                  {passwordValidation.uppercase && passwordValidation.lowercase ? '✅' : '❌'} Mayúsculas y minúsculas
                </li>
                <li style={{ color: passwordValidation.digits ? '#059669' : '#DC2626' }}>
                  {passwordValidation.digits ? '✅' : '❌'} Al menos un dígito
                </li>
                <li style={{ color: passwordValidation.special ? '#059669' : '#DC2626' }}>
                  {passwordValidation.special ? '✅' : '❌'} Caracteres especiales
                </li>
                <li style={{ color: passwordValidation.twoControls ? '#059669' : '#F59E0B' }}>
                  {passwordValidation.twoControls ? '✅' : '❌'} Al menos 2 de los controles anteriores
                </li>
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? '⏳ Creando cuenta...' : '✨ Crear Cuenta'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
          <p>
            ¿Ya tiene una cuenta?{' '}
            <a 
              href="#login" 
              style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Inicie sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;




