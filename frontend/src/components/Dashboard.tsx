'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Clock, 
  AlertTriangle,
  LogOut,
  Key,
  Activity,
  Settings
} from 'lucide-react';

interface Usuario {
  id_usuario_00: number;
  nombre_usuario_00: string;
  email_00: string;
  nombre_completo_00?: string;
  activo_00: boolean;
  fecha_caducidad_pwd_00: string;
  ultimo_cambio_pwd_00: string;
  ultimo_login_00?: string;
  creado_en_00: string;
  diasParaExpiracion?: number;
  passwordExpirada: boolean;
}

export default function Dashboard() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsuario(data.usuario);
      } else {
        // Token inválido, redirigir al login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (err) {
      setError('Error al cargar información del usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Error en logout:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPasswordStatusColor = (dias?: number, expirada?: boolean) => {
    if (expirada) return 'destructive';
    if (!dias) return 'secondary';
    if (dias <= 7) return 'destructive';
    if (dias <= 15) return 'secondary';
    return 'default';
  };

  const getPasswordStatusText = (dias?: number, expirada?: boolean) => {
    if (expirada) return 'Expirada';
    if (!dias) return 'Desconocido';
    if (dias <= 1) return 'Expira hoy';
    if (dias <= 7) return `Expira en ${dias} días`;
    if (dias <= 15) return `Expira en ${dias} días`;
    return `${dias} días restantes`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'No se pudo cargar la información del usuario'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard de Usuario</h1>
                <p className="text-gray-600">Panel de control del sistema de autenticación segura</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Administración
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/change-password')}
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                Cambiar Contraseña
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>

        {/* Alerta de contraseña expirada */}
        {usuario.passwordExpirada && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Su contraseña ha expirado. Por favor, cámbiela inmediatamente para continuar usando el sistema.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de contraseña por expirar */}
        {usuario.diasParaExpiracion && usuario.diasParaExpiracion <= 15 && !usuario.passwordExpirada && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 text-orange-800">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Su contraseña expirará en {usuario.diasParaExpiracion} días. Le recomendamos cambiarla pronto.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Información Personal */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Datos básicos de su cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID de Usuario</label>
                  <p className="text-lg font-semibold">#{usuario.id_usuario_00}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre de Usuario</label>
                  <p className="text-lg font-semibold">{usuario.nombre_usuario_00}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre Completo</label>
                  <p className="text-lg">{usuario.nombre_completo_00 || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Correo Electrónico</label>
                  <p className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {usuario.email_00}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Estado de Cuenta</label>
                <div className="mt-1">
                  <Badge variant={usuario.activo_00 ? "default" : "destructive"}>
                    {usuario.activo_00 ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado de Contraseña */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Estado de Contraseña
              </CardTitle>
              <CardDescription>
                Información de seguridad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Estado</label>
                <div className="mt-1">
                  <Badge variant={getPasswordStatusColor(usuario.diasParaExpiracion, usuario.passwordExpirada)}>
                    {getPasswordStatusText(usuario.diasParaExpiracion, usuario.passwordExpirada)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Último Cambio</label>
                <p className="text-sm">{formatDate(usuario.ultimo_cambio_pwd_00)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Expiración</label>
                <p className="text-sm">{formatDate(usuario.fecha_caducidad_pwd_00)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actividad de la Cuenta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Actividad de la Cuenta
              </CardTitle>
              <CardDescription>
                Registro de actividad reciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Último Login</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {usuario.ultimo_login_00 ? formatDate(usuario.ultimo_login_00) : 'Nunca'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Creación</label>
                <p className="text-sm">{formatDate(usuario.creado_en_00)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Información de Seguridad */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Controles de Seguridad Implementados
              </CardTitle>
              <CardDescription>
                Medidas de seguridad aplicadas en su cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Complejidad de Contraseña</p>
                    <p className="text-sm text-green-600">Requiere mayúsculas, números y caracteres especiales</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Longitud Mínima</p>
                    <p className="text-sm text-green-600">8 caracteres como mínimo</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Caducidad Automática</p>
                    <p className="text-sm text-green-600">91 días de vigencia</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Protección contra Reutilización</p>
                    <p className="text-sm text-green-600">No permite reusar últimas 10 contraseñas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Bloqueo por Intentos Fallidos</p>
                    <p className="text-sm text-green-600">Bloqueo después de 10 intentos fallidos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Expiración de Sesión</p>
                    <p className="text-sm text-green-600">30 minutos de inactividad</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}