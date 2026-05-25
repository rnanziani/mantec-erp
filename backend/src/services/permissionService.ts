import { pool } from '../db.js';

export interface PermissionRow {
  id_permiso_05: number;
  nombre_permiso_05: string;
  descripcion_05: string | null;
  orden_05: number | null;
}

/**
 * Permisos efectivos = permisos del nivel ∪ permisos directos del usuario.
 */
export async function getEffectivePermissions(
  idUsuario: number,
  idNivel: number | null
): Promise<PermissionRow[]> {
  let result;

  if (idNivel) {
    result = await pool.query(
      `SELECT DISTINCT
        p.id_permiso_05,
        p.nombre_permiso_05,
        p.descripcion_05,
        p.orden_05,
        COALESCE(p.orden_05, 9999) AS orden_para_sort
       FROM tbl_05_permiso p
       WHERE p.id_permiso_05 IN (
         SELECT np.id_permiso_05
         FROM tbl_050_nivel_permiso np
         WHERE np.id_nivel_04 = $1
         UNION
         SELECT up.id_permiso_000
         FROM tbl_000_usuario_permiso up
         WHERE up.id_usuario_000 = $2
       )
       ORDER BY orden_para_sort ASC, p.nombre_permiso_05 ASC`,
      [idNivel, idUsuario]
    );
  } else {
    result = await pool.query(
      `SELECT DISTINCT
        p.id_permiso_05,
        p.nombre_permiso_05,
        p.descripcion_05,
        p.orden_05,
        COALESCE(p.orden_05, 9999) AS orden_para_sort
       FROM tbl_05_permiso p
       INNER JOIN tbl_000_usuario_permiso up ON p.id_permiso_05 = up.id_permiso_000
       WHERE up.id_usuario_000 = $1
       ORDER BY orden_para_sort ASC, p.nombre_permiso_05 ASC`,
      [idUsuario]
    );
  }

  return result.rows;
}

export async function getEffectivePermissionNames(
  idUsuario: number,
  idNivel: number | null
): Promise<Set<string>> {
  const rows = await getEffectivePermissions(idUsuario, idNivel);
  return new Set(rows.map((p) => p.nombre_permiso_05));
}

export function hasAnyPermission(
  permissionNames: Set<string>,
  required: string | string[]
): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((name) => permissionNames.has(name));
}
