import { useState, useEffect } from 'react';

interface Permission {
  id_permiso_05: number;
  nombre_permiso_05: string;
  descripcion_05: string | null;
  orden_05: number | null;
}

interface UserPermissionsResponse {
  success: boolean;
  data: {
    permissions: Permission[];
    permissionNames: string[];
  };
  error?: string;
}

/**
 * Hook para obtener y gestionar los permisos del usuario actual
 */
export const useUserPermissions = (enabled: boolean = true) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsData, setPermissionsData] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setPermissions([]);
          setPermissionsData([]);
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3001/api/auth/permissions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener permisos');
        }

        const data: UserPermissionsResponse = await response.json();

        if (data.success && data.data) {
          setPermissions(data.data.permissionNames || []);
          setPermissionsData(data.data.permissions || []);
        } else {
          setPermissions([]);
          setPermissionsData([]);
        }
      } catch (err: any) {
        console.error('Error al obtener permisos:', err);
        setError(err.message || 'Error al obtener permisos');
        setPermissions([]);
        setPermissionsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [enabled]);

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permissionName: string): boolean => {
    return permissions.includes(permissionName);
  };

  /**
   * Verifica si el usuario tiene alguno de los permisos especificados
   */
  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some(name => permissions.includes(name));
  };

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(name => permissions.includes(name));
  };

  /**
   * Refresca los permisos del usuario
   */
  const refresh = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPermissions([]);
        setPermissionsData([]);
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener permisos');
      }

      const data: UserPermissionsResponse = await response.json();

      if (data.success && data.data) {
        setPermissions(data.data.permissionNames || []);
        setPermissionsData(data.data.permissions || []);
      } else {
        setPermissions([]);
        setPermissionsData([]);
      }
    } catch (err: any) {
      console.error('Error al refrescar permisos:', err);
      setError(err.message || 'Error al refrescar permisos');
      setPermissions([]);
      setPermissionsData([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    permissions,
    permissionsData,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh
  };
};


