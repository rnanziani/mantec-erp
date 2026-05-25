import { Request, Response, NextFunction } from 'express';
import { pool } from '../db.js';
import { verificarToken } from '../utils/authUtils.js';
import { getEffectivePermissionNames, hasAnyPermission } from '../services/permissionService.js';
import { resolveApiAccessRule } from '../config/apiRoutePermissions.js';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  idNivel: number | null;
  permissionNames: Set<string>;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function loadAuthUser(userId: number): Promise<AuthUser | null> {
  const result = await pool.query(
    `SELECT id_usuario_00, username, email, id_nivel_04, is_active
     FROM tbl_00_usuario
     WHERE id_usuario_00 = $1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row.is_active) return null;

  const permissionNames = await getEffectivePermissionNames(
    row.id_usuario_00,
    row.id_nivel_04
  );

  return {
    id: row.id_usuario_00,
    username: row.username,
    email: row.email,
    idNivel: row.id_nivel_04,
    permissionNames,
  };
}

async function resolveAuthUser(req: Request, res: Response): Promise<AuthUser | null> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Token de autenticación requerido' });
    return null;
  }

  const decoded = verificarToken(token) as { id?: number } | null;
  if (!decoded?.id) {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    return null;
  }

  const authUser = await loadAuthUser(decoded.id);
  if (!authUser) {
    res.status(401).json({ success: false, error: 'Usuario no encontrado o inactivo' });
    return null;
  }

  return authUser;
}

/**
 * Verifica JWT y adjunta req.authUser (usuario activo + permisos efectivos).
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authUser = await resolveAuthUser(req, res);
    if (!authUser) return;
    req.authUser = authUser;
    next();
  } catch (error) {
    console.error('Error en authenticate:', error);
    res.status(500).json({ success: false, error: 'Error de autenticación' });
  }
}

/**
 * Exige uno o más permisos (uso en rutas individuales).
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }
    if (!hasAnyPermission(req.authUser.permissionNames, permissions)) {
      res.status(403).json({
        success: false,
        error: 'No tiene permisos para esta operación',
        required: permissions,
      });
      return;
    }
    next();
  };
}

/**
 * Guard global: auth + permisos según config/apiRoutePermissions.ts
 */
export async function apiPermissionGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const path = req.originalUrl.split('?')[0];
    if (!path.startsWith('/api/')) {
      next();
      return;
    }

    const rule = resolveApiAccessRule(req.method, path);

    if (rule.kind === 'public') {
      next();
      return;
    }

    const authUser = await resolveAuthUser(req, res);
    if (!authUser) return;

    req.authUser = authUser;

    if (rule.kind === 'auth' || rule.kind === 'read_auth') {
      next();
      return;
    }

    if (rule.kind === 'permission' && rule.permission) {
      if (!authUser.permissionNames.has(rule.permission)) {
        res.status(403).json({
          success: false,
          error: 'No tiene permisos para esta operación',
          required: rule.permission,
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Error en apiPermissionGuard:', error);
    res.status(500).json({ success: false, error: 'Error al verificar permisos' });
  }
}
