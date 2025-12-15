import React, { useState, useEffect } from 'react';
import './BodegaView.css';

const ChangePasswordForm: React.FC = () => {
  const [formData, setFormData] = useState({
    password_actual: '',
    password_nueva: '',
    confirmar_password: ''
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

  useEffect(() => {
    // Verificar si hay un token válido
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.hash = 'login';
    }
  }, []);

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

    if (name === 'password_nueva') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password_nueva !== formData.confirmar_password) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    const validation = validatePassword(formData.password_nueva);
    if (!validation.length || !validation.twoControls) {
      setError('La nueva contraseña no cumple con los requisitos de complejidad');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password_actual: formData.password_actual,
          password_nueva: formData.password_nueva
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message);
        setFormData({
          password_actual: '',
          password_nueva: '',
          confirmar_password: ''
        });
        setPasswordValidation({
          length: false,
          uppercase: false,
          lowercase: false,
          digits: false,
          special: false,
          twoControls: false
        });
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
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
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
            🔑 Cambiar Contraseña
          </h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Actualice su contraseña manteniendo los estándares de seguridad
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
            <label htmlFor="password_actual">Contraseña Actual:</label>
            <input
              type="password"
              id="password_actual"
              name="password_actual"
              required
              value={formData.password_actual}
              onChange={handleChange}
              placeholder="Ingrese su contraseña actual"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password_nueva">Nueva Contraseña:</label>
            <input
              type="password"
              id="password_nueva"
              name="password_nueva"
              required
              value={formData.password_nueva}
              onChange={handleChange}
              placeholder="Ingrese su nueva contraseña"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmar_password">Confirmar Nueva Contraseña:</label>
            <input
              type="password"
              id="confirmar_password"
              name="confirmar_password"
              required
              value={formData.confirmar_password}
              onChange={handleChange}
              placeholder="Confirme su nueva contraseña"
            />
          </div>

          {formData.password_nueva && (
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
            {loading ? '⏳ Cambiando contraseña...' : '💾 Cambiar Contraseña'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => window.location.hash = 'dashboard'}
            style={{ width: '100%' }}
          >
            🏠 Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordForm;





