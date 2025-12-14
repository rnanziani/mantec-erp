'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Shield, Lock, CheckCircle, XCircle } from 'lucide-react';

export default function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    password_actual: '',
    password_nueva: '',
    confirmar_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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

  useEffect(() => {
    // Verificar si hay un token válido
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

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

    if (name === 'password_nueva') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validar que las contraseñas coincidan
    if (formData.password_nueva !== formData.confirmar_password) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    // Validar complejidad de contraseña
    const validation = validatePassword(formData.password_nueva);
    if (!validation.length || !validation.twoControls) {
      setError('La nueva contraseña no cumple con los requisitos de complejidad');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
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

      if (response.ok) {
        setSuccess(data.message);
        // Limpiar formulario
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-orange-100">
            <Shield className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Cambiar Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Actualice su contraseña manteniendo los estándares de seguridad
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Nueva Contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingrese su contraseña actual y la nueva
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
                <Label htmlFor="password_actual" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Contraseña Actual
                </Label>
                <div className="relative">
                  <Input
                    id="password_actual"
                    name="password_actual"
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={formData.password_actual}
                    onChange={handleChange}
                    placeholder="Ingrese su contraseña actual"
                    className="w-full pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_nueva" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password_nueva"
                    name="password_nueva"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={formData.password_nueva}
                    onChange={handleChange}
                    placeholder="Ingrese su nueva contraseña"
                    className="w-full pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar_password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirmar Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirmar_password"
                    name="confirmar_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmar_password}
                    onChange={handleChange}
                    placeholder="Confirme su nueva contraseña"
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
              {formData.password_nueva && (
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
                    Cambiando contraseña...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}