'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Shield, Lock, Mail, User, CheckCircle, XCircle } from 'lucide-react';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    nombre_usuario_00: '',
    email_00: '',
    password: '',
    confirmPassword: '',
    nombre_completo_00: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digits: false,
    special: false,
    twoControls: false
  });
  const router = useRouter();

  const validatePassword = (password: string) => {
    const validations = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digits: /\d/.test(password),
      special: /[!@#$%&*()/\][:";><?,.]/.test(password),
      twoControls: 0
    };

    // Contar controles cumplidos
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

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validar complejidad de contraseña
    const validation = validatePassword(formData.password);
    if (!validation.length || !validation.twoControls) {
      setError('La contraseña no cumple con los requisitos de complejidad');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_usuario_00: formData.nombre_usuario_00,
          email_00: formData.email_00,
          password: formData.password,
          nombre_completo_00: formData.nombre_completo_00
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Usuario creado exitosamente. Redirigiendo al login...');
        setTimeout(() => {
          router.push('/login');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Crear Cuenta Segura
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Regístrese con credenciales que cumplan nuestros estándares de seguridad
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Registro</CardTitle>
            <CardDescription className="text-center">
              Complete el formulario con sus datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="nombre_usuario_00" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre de Usuario
                </Label>
                <Input
                  id="nombre_usuario_00"
                  name="nombre_usuario_00"
                  type="text"
                  required
                  value={formData.nombre_usuario_00}
                  onChange={handleChange}
                  placeholder="usuario123"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_completo_00" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre Completo
                </Label>
                <Input
                  id="nombre_completo_00"
                  name="nombre_completo_00"
                  type="text"
                  value={formData.nombre_completo_00}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_00" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email_00"
                  name="email_00"
                  type="email"
                  required
                  value={formData.email_00}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Ingrese su contraseña"
                    className="w-full pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirme su contraseña"
                    className="w-full pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Validación de contraseña */}
              {formData.password && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Requisitos de contraseña:</p>
                  <ul className="space-y-1 text-xs">
                    <li className={`flex items-center gap-2 ${passwordValidation.length ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Mínimo 8 caracteres
                    </li>
                    <li className={`flex items-center gap-2 ${passwordValidation.uppercase && passwordValidation.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.uppercase && passwordValidation.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Mayúsculas y minúsculas
                    </li>
                    <li className={`flex items-center gap-2 ${passwordValidation.digits ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.digits ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Al menos un dígito
                    </li>
                    <li className={`flex items-center gap-2 ${passwordValidation.special ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Caracteres especiales
                    </li>
                    <li className={`flex items-center gap-2 ${passwordValidation.twoControls ? 'text-green-600' : 'text-orange-600'}`}>
                      {passwordValidation.twoControls ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Al menos 2 de los controles anteriores
                    </li>
                  </ul>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿Ya tiene una cuenta?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Inicie sesión aquí
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}