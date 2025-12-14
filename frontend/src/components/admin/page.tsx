'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  LogOut,
  Search,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  Eye,
  Calendar,
  Mail,
  Activity
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

export default function AdminDashboard() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPassword, setFilterPassword] = useState<'all' | 'expired' | 'expiring'>('all');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Por ahora, simulamos datos de usuarios ya que no tenemos endpoint de admin
      // En un caso real, esto llamaría a un endpoint de admin
      const mockUsuarios: Usuario[] = [
        {
          id_usuario_00: 1,
          nombre_usuario_00: 'admin',
          email_00: 'admin@ejemplo.com',
          nombre_completo_00: 'Administrador del Sistema',
          activo_00: true,
          fecha_caducidad_pwd_00: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          ultimo_cambio_pwd_00: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
          ultimo_login_00: new Date().toISOString(),
          creado_en_00: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          diasParaExpiracion: 60,
          passwordExpirada: false
        },
        {
          id_usuario_00: 2,
          nombre_usuario_00: 'juanperez',
          email_00: 'juan.perez@ejemplo.com',
          nombre_completo_00: 'Juan Pérez',
          activo_00: true,
          fecha_caducidad_pwd_00: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          ultimo_cambio_pwd_00: new Date(Date.now() - 86 * 24 * 60 * 60 * 1000).toISOString(),
          ultimo_login_00: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          creado_en_00: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          diasParaExpiracion: 5,
          passwordExpirada: false
        },
        {
          id_usuario_00: 3,
          nombre_usuario_00: 'mariagarcia',
          email_00: 'maria.garcia@ejemplo.com',
          nombre_completo_00: 'María García',
          activo_00: false,
          fecha_caducidad_pwd_00: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          ultimo_cambio_pwd_00: new Date(Date.now() - 101 * 24 * 60 * 60 * 1000).toISOString(),
          ultimo_login_00: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          creado_en_00: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          passwordExpirada: true
        }
      ];

      setUsuarios(mockUsuarios);
    } catch (err) {
      setError('Error al cargar la lista de usuarios');
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPasswordStatusColor = (usuario: Usuario) => {
    if (usuario.passwordExpirada) return 'destructive';
    if (!usuario.diasParaExpiracion) return 'secondary';
    if (usuario.diasParaExpiracion <= 7) return 'destructive';
    if (usuario.diasParaExpiracion <= 15) return 'secondary';
    return 'default';
  };

  const getPasswordStatusText = (usuario: Usuario) => {
    if (usuario.passwordExpirada) return 'Expirada';
    if (!usuario.diasParaExpiracion) return 'Desconocido';
    if (usuario.diasParaExpiracion <= 1) return 'Expira hoy';
    if (usuario.diasParaExpiracion <= 7) return `Expira en ${usuario.diasParaExpiracion} días`;
    if (usuario.diasParaExpiracion <= 15) return `Expira en ${usuario.diasParaExpiracion} días`;
    return `${usuario.diasParaExpiracion} días`;
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre_usuario_00.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email_00.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (usuario.nombre_completo_00 && usuario.nombre_completo_00.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && usuario.activo_00) ||
                         (filterStatus === 'inactive' && !usuario.activo_00);
    
    const matchesPassword = filterPassword === 'all' ||
                           (filterPassword === 'expired' && usuario.passwordExpirada) ||
                           (filterPassword === 'expiring' && usuario.diasParaExpiracion && usuario.diasParaExpiracion <= 15 && !usuario.passwordExpirada);

    return matchesSearch && matchesStatus && matchesPassword;
  });

  const toggleUserStatus = async (userId: number) => {
    // Simulación - en un caso real esto llamaría a un endpoint
    setUsuarios(prev => prev.map(usuario => 
      usuario.id_usuario_00 === userId 
        ? { ...usuario, activo_00: !usuario.activo_00 }
        : usuario
    ));
  };

  const viewUserDetails = (usuario: Usuario) => {
    setSelectedUser(usuario);
    setShowUserDetails(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
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
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-100">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-gray-600">Gestión de usuarios y seguridad del sistema</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Volver al Dashboard
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

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {usuarios.filter(u => u.activo_00).length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contraseñas Expiradas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {usuarios.filter(u => u.passwordExpirada).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Por Expirar (15 días)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {usuarios.filter(u => u.diasParaExpiracion && u.diasParaExpiracion <= 15 && !u.passwordExpirada).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium">Estado</Label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="password-filter" className="text-sm font-medium">Contraseña</Label>
                <Select value={filterPassword} onValueChange={(value: any) => setFilterPassword(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="expired">Expiradas</SelectItem>
                    <SelectItem value="expiring">Por expirar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterPassword('all');
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuarios
            </CardTitle>
            <CardDescription>
              Gestione el estado y seguridad de las cuentas de usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Usuario</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Contraseña</th>
                    <th className="text-left p-3 font-medium">Último Login</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((usuario) => (
                    <tr key={usuario.id_usuario_00} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">#{usuario.id_usuario_00}</td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{usuario.nombre_usuario_00}</div>
                          <div className="text-xs text-gray-500">{usuario.nombre_completo_00}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {usuario.email_00}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={usuario.activo_00 ? "default" : "destructive"}>
                          {usuario.activo_00 ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={getPasswordStatusColor(usuario)}>
                          {getPasswordStatusText(usuario)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {usuario.ultimo_login_00 ? (
                          <div className="text-xs">
                            {formatDate(usuario.ultimo_login_00)}
                          </div>
                        ) : (
                          <span className="text-gray-400">Nunca</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewUserDetails(usuario)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUserStatus(usuario.id_usuario_00)}
                            className={usuario.activo_00 ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {usuario.activo_00 ? (
                              <ToggleLeft className="h-4 w-4" />
                            ) : (
                              <ToggleRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsuarios.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron usuarios con los filtros seleccionados
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de Detalles de Usuario */}
        <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Usuario</DialogTitle>
              <DialogDescription>
                Información completa del usuario seleccionado
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID de Usuario</Label>
                    <p className="font-semibold">#{selectedUser.id_usuario_00}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Nombre de Usuario</Label>
                    <p className="font-semibold">{selectedUser.nombre_usuario_00}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Nombre Completo</Label>
                    <p>{selectedUser.nombre_completo_00 || 'No especificado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p>{selectedUser.email_00}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Estado</Label>
                    <Badge variant={selectedUser.activo_00 ? "default" : "destructive"}>
                      {selectedUser.activo_00 ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Estado Contraseña</Label>
                    <Badge variant={getPasswordStatusColor(selectedUser)}>
                      {getPasswordStatusText(selectedUser)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Fecha de Creación</Label>
                    <p>{formatDate(selectedUser.creado_en_00)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Último Cambio Password</Label>
                    <p>{formatDate(selectedUser.ultimo_cambio_pwd_00)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Expiración Password</Label>
                    <p>{formatDate(selectedUser.fecha_caducidad_pwd_00)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Último Login</Label>
                    <p>{selectedUser.ultimo_login_00 ? formatDate(selectedUser.ultimo_login_00) : 'Nunca'}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}