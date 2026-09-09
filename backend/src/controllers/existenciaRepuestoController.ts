import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ExistenciaRepuesto } from '../types.js';

export const getAllExistenciasRepuesto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<ExistenciaRepuesto>(
      `SELECT
         e.idexistencia_85,
         e.idunidad_85,
         e.idubicacion_85,
         e.cantidad_85,
         un.codigo_81,
         rd.nombre_57 AS nombre_tipo_57,
         ub.descripcion_82 AS ubicacion_descripcion,
         maq.numinterno_11 AS maquina_numinterno,
         maq.ppu_11 AS maquina_ppu,
         pr.nombre_58 AS proveedor_nombre
       FROM tbl_85_existencia_repuesto e
       INNER JOIN tbl_81_unidad_repuesto un ON un.idunidad_81 = e.idunidad_85
       INNER JOIN tbl_57_repuesto_danado rd ON rd.idrepuestodanado_57 = un.idrepuesto_81
       INNER JOIN tbl_82_ubicacion_repuesto ub ON ub.idubicacion_82 = e.idubicacion_85
       LEFT JOIN tbl_11_maquina maq ON maq.idmaquina_11 = e.idmaquina_85
       LEFT JOIN tbl_58_proveedor pr ON pr.idproveedor_58 = e.idproveedor_85
       WHERE e.cantidad_85 >= 1
       ORDER BY un.codigo_81`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener stock',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
