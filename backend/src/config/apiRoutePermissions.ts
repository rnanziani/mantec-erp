/**
 * Reglas de acceso API alineadas con permisos del menú (Sidebar / App.tsx).
 * Orden: rutas públicas → auth only → prefijos (más específicos primero en el array).
 */

export type ApiAccessKind =
  | 'public'
  | 'auth'
  | 'permission'
  | 'read_auth';

export interface ApiAccessRule {
  kind: ApiAccessKind;
  /** Permiso requerido para escritura o acceso total */
  permission?: string;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** method + path exactos sin autenticación */
export const PUBLIC_API_ROUTES: Array<{ method: string; path: string }> = [
  { method: 'GET', path: '/api/mantec/health' },
  { method: 'GET', path: '/api/mantec/info' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/change-password-expired' },
  /** Permite cerrar sesión aunque el JWT ya haya expirado (solo borra por token en BD) */
  { method: 'POST', path: '/api/auth/logout' },
];

/** JWT válido; sin permiso de menú específico */
export const AUTH_ONLY_PREFIXES = [
  '/api/auth/me',
  '/api/auth/permissions',
  '/api/auth/session-status',
  '/api/auth/extend-session',
  '/api/auth/change-password',
  '/api/parametros/valores/actuales',
];

/**
 * Prefijos API → permiso.
 * readAuthOnly: GET/HEAD/OPTIONS solo requieren login; mutaciones exigen permiso.
 */
export const API_PREFIX_RULES: Array<{
  prefix: string;
  permission: string;
  readAuthOnly?: boolean;
}> = [
  // Nivel de acceso
  { prefix: '/api/auth/register', permission: 'MENU_NIVEL_ACCESO_USUARIOS' },
  { prefix: '/api/usuarios', permission: 'MENU_NIVEL_ACCESO_USUARIOS' },
  { prefix: '/api/niveles-usuario', permission: 'MENU_NIVEL_ACCESO_NIVELES' },
  { prefix: '/api/permisos', permission: 'MENU_NIVEL_ACCESO_PERMISOS' },
  { prefix: '/api/nivel-permisos', permission: 'MENU_NIVEL_ACCESO_ASIGNACION' },
  { prefix: '/api/usuario-permisos', permission: 'MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS' },
  { prefix: '/api/historial-contrasenas', permission: 'MENU_NIVEL_ACCESO_HISTORIAL' },
  { prefix: '/api/intentos-login', permission: 'MENU_NIVEL_ACCESO_INTENTOS' },
  { prefix: '/api/sesiones-view', permission: 'MENU_NIVEL_ACCESO_SESIONES' },
  { prefix: '/api/sesiones', permission: 'MENU_NIVEL_ACCESO_SESIONES' },
  { prefix: '/api/parametros', permission: 'MENU_NIVEL_ACCESO_PARAMETROS' },

  // Operaciones
  { prefix: '/api/ordenes-trabajo', permission: 'MENU_OPERACIONES_ORDENES_TRABAJO' },
  { prefix: '/api/asignaciones-productos-aseo', permission: 'MENU_OPERACIONES_ASIGNACION_ASEO' },
  { prefix: '/api/asignaciones-prendas', permission: 'MENU_OPERACIONES_ASIGNACION_PRENDAS' },
  { prefix: '/api/consumo-insumos', permission: 'MENU_OPERACIONES' },

  // Neumáticos (prefijos largos antes que cortos)
  { prefix: '/api/marcas-neumatico', permission: 'MENU_NEUMATICOS_MARCAS' },
  { prefix: '/api/estados-neumatico', permission: 'MENU_NEUMATICOS_ESTADOS' },
  { prefix: '/api/historial-neumatico', permission: 'MENU_NEUMATICOS_HISTORIAL' },
  { prefix: '/api/patrones-rotacion', permission: 'MENU_NEUMATICOS_PATRONES_ROTACION' },
  { prefix: '/api/neumaticos', permission: 'MENU_NEUMATICOS_COD_TRAZABILIDAD' },
  { prefix: '/api/llantas', permission: 'MENU_NEUMATICOS_TIPO_LLANTA' },

  // Gestión alternadores
  { prefix: '/api/tipos-comp-alternador', permission: 'MENU_MANTENEDORES_TIPOS_COMP', readAuthOnly: true },
  { prefix: '/api/tipos-transaccion', permission: 'MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION' },
  { prefix: '/api/transacciones', permission: 'MENU_GESTION_ALTERNADORES_MOVIMIENTOS' },
  { prefix: '/api/existencias', permission: 'MENU_GESTION_ALTERNADORES_STOCK' },
  { prefix: '/api/alternadores', permission: 'MENU_GESTION_ALTERNADORES_ALTERNADORES' },
  { prefix: '/api/bodegas', permission: 'MENU_GESTION_ALTERNADORES_BODEGAS' },
  { prefix: '/api/marcas', permission: 'MENU_GESTION_ALTERNADORES_MARCAS' },
  { prefix: '/api/estados', permission: 'MENU_GESTION_ALTERNADORES_ESTADO' },

  // Mantenedores (readAuthOnly en catálogos usados como lookup en operaciones)
  { prefix: '/api/responsables-entrega', permission: 'MENU_MANTENEDORES_RESPONSABLES_ENTREGA', readAuthOnly: true },
  { prefix: '/api/productos-aseo', permission: 'MENU_MANTENEDORES_PRODUCTOS_ASEO', readAuthOnly: true },
  { prefix: '/api/trabajadores', permission: 'MENU_MANTENEDORES_TRABAJADORES', readAuthOnly: true },
  { prefix: '/api/empresas', permission: 'MENU_MANTENEDORES_EMPRESAS', readAuthOnly: true },
  { prefix: '/api/categorias', permission: 'MENU_MANTENEDORES_CATEGORIAS', readAuthOnly: true },
  { prefix: '/api/tecnicos', permission: 'MENU_MANTENEDORES_TECNICOS', readAuthOnly: true },
  { prefix: '/api/cargos', permission: 'MENU_MANTENEDORES_CARGOS', readAuthOnly: true },
  { prefix: '/api/maquinas', permission: 'MENU_MANTENEDORES_MAQUINAS', readAuthOnly: true },
  { prefix: '/api/ccostos', permission: 'MENU_MANTENEDORES_CCOSTOS', readAuthOnly: true },
  { prefix: '/api/insumos', permission: 'MENU_MANTENEDORES_INSUMOS', readAuthOnly: true },
  { prefix: '/api/tallas', permission: 'MENU_MANTENEDORES_TALLAS', readAuthOnly: true },
  { prefix: '/api/prendas', permission: 'MENU_MANTENEDORES_PRENDAS', readAuthOnly: true },
];

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

export function isPublicApiRoute(method: string, path: string): boolean {
  const normalized = normalizePath(path);
  return PUBLIC_API_ROUTES.some(
    (r) => r.method === method.toUpperCase() && r.path === normalized
  );
}

export function isAuthOnlyRoute(path: string): boolean {
  const normalized = normalizePath(path);
  return AUTH_ONLY_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function resolveApiAccessRule(method: string, path: string): ApiAccessRule {
  const normalized = normalizePath(path);
  const upperMethod = method.toUpperCase();

  if (isPublicApiRoute(upperMethod, normalized)) {
    return { kind: 'public' };
  }

  if (isAuthOnlyRoute(normalized)) {
    return { kind: 'auth' };
  }

  const rule = API_PREFIX_RULES.find(
    (r) => normalized === r.prefix || normalized.startsWith(`${r.prefix}/`)
  );

  if (!rule) {
    // Rutas /api/* no mapeadas: exigen autenticación como mínimo
    return { kind: 'auth' };
  }

  if (rule.readAuthOnly && READ_METHODS.has(upperMethod)) {
    return { kind: 'read_auth' };
  }

  return { kind: 'permission', permission: rule.permission };
}
