import { Request, Response } from 'express';
import { pool } from '../db.js';

function optInt(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function optDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Duración = primer montaje → última baja del mismo código.
 */
export const getDuracionNeumaticos = async (req: Request, res: Response): Promise<void> => {
  try {
    const desde = optDate(req.query.desde);
    const hasta = optDate(req.query.hasta);
    const idMarca = optInt(req.query.id_marca);
    const idMaquina = optInt(req.query.id_maquina);

    const result = await pool.query(
      `WITH primer_montaje AS (
         SELECT DISTINCT ON (d.idneumatico_77)
           d.idneumatico_77,
           m.fecha_76 AS fecha_montaje,
           m.km_maquina_76 AS km_montaje,
           m.folio_76 AS folio_montaje,
           m.idmaquina_76
         FROM tbl_77_d_montaje_neumatico d
         JOIN tbl_76_m_trazabilidad_neumatico m ON m.idtrazabilidad_76 = d.idtrazabilidad_77
         ORDER BY d.idneumatico_77, m.fecha_76 ASC, m.hora_76 ASC, m.idtrazabilidad_76 ASC
       ),
       ultima_baja AS (
         SELECT DISTINCT ON (d.idneumatico_80)
           d.idneumatico_80,
           d.iddano_neumatico_80,
           m.fecha_76 AS fecha_baja,
           m.km_maquina_76 AS km_baja,
           m.folio_76 AS folio_baja,
           m.idmaquina_76,
           m.idconductor_76,
           m.idtecnico_76
         FROM tbl_80_d_baja_neumatico d
         JOIN tbl_76_m_trazabilidad_neumatico m ON m.idtrazabilidad_76 = d.idtrazabilidad_80
         ORDER BY d.idneumatico_80, m.fecha_76 DESC, m.hora_76 DESC, m.idtrazabilidad_76 DESC
       )
       SELECT
         n.id_neumatico_31,
         n.cod_neumatico_31,
         mk.marca_32,
         e.estado_33,
         pm.fecha_montaje,
         pm.km_montaje,
         pm.folio_montaje,
         ub.fecha_baja,
         ub.km_baja,
         ub.folio_baja,
         CASE
           WHEN ub.km_baja IS NOT NULL AND pm.km_montaje IS NOT NULL
           THEN ub.km_baja - pm.km_montaje
         END AS km_duracion,
         CASE
           WHEN ub.fecha_baja IS NOT NULL AND pm.fecha_montaje IS NOT NULL
           THEN (ub.fecha_baja - pm.fecha_montaje)
         END AS dias_duracion,
         dn.codigo_74 AS dano_codigo,
         dn.descripcion_74 AS dano_descripcion,
         mq.numinterno_11 AS maquina_numinterno,
         mq.ppu_11 AS maquina_ppu,
         TRIM(CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, ''))) AS conductor_nombre,
         TRIM(CONCAT(tec.nombres_21, ' ', COALESCE(tec.a_paterno_21, ''), ' ', COALESCE(tec.a_materno_21, ''))) AS tecnico_nombre
       FROM ultima_baja ub
       JOIN tbl_31_neumatico n ON n.id_neumatico_31 = ub.idneumatico_80
       LEFT JOIN primer_montaje pm ON pm.idneumatico_77 = n.id_neumatico_31
       LEFT JOIN tbl_32_marca_neumatico mk ON mk.id_marca_32 = n.id_marca_31
       LEFT JOIN tbl_33_estado_neumatico e ON e.id_estado_33 = n.id_estado_31
       LEFT JOIN tbl_74_tipo_dano_neumatico dn ON dn.iddano_neumatico_74 = ub.iddano_neumatico_80
       LEFT JOIN tbl_11_maquina mq ON mq.idmaquina_11 = ub.idmaquina_76
       LEFT JOIN tbl_06_trabajador t ON t.idtrabajador_06 = ub.idconductor_76
       LEFT JOIN tbl_21_tecnico tec ON tec.id_tecnico_21 = ub.idtecnico_76
       WHERE ($1::date IS NULL OR ub.fecha_baja >= $1::date)
         AND ($2::date IS NULL OR ub.fecha_baja <= $2::date)
         AND ($3::int IS NULL OR n.id_marca_31 = $3)
         AND ($4::int IS NULL OR ub.idmaquina_76 = $4)
       ORDER BY ub.fecha_baja DESC, n.cod_neumatico_31`,
      [desde, hasta, idMarca, idMaquina]
    );

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error reporte duración neumáticos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener duración de neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getDanosNeumaticoConductor = async (req: Request, res: Response): Promise<void> => {
  try {
    const desde = optDate(req.query.desde);
    const hasta = optDate(req.query.hasta);
    const idConductor = optInt(req.query.id_conductor);

    const resumen = await pool.query(
      `SELECT
         m.idconductor_76,
         TRIM(CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, ''))) AS conductor_nombre,
         t.ruttrabajador_06,
         dn.iddano_neumatico_74,
         dn.codigo_74 AS dano_codigo,
         dn.descripcion_74 AS dano_descripcion,
         COUNT(*)::int AS cantidad,
         COUNT(DISTINCT m.idmaquina_76)::int AS maquinas
       FROM tbl_80_d_baja_neumatico d
       JOIN tbl_76_m_trazabilidad_neumatico m ON m.idtrazabilidad_76 = d.idtrazabilidad_80
       JOIN tbl_74_tipo_dano_neumatico dn ON dn.iddano_neumatico_74 = d.iddano_neumatico_80
       JOIN tbl_06_trabajador t ON t.idtrabajador_06 = m.idconductor_76
       WHERE ($1::date IS NULL OR m.fecha_76 >= $1::date)
         AND ($2::date IS NULL OR m.fecha_76 <= $2::date)
         AND ($3::int IS NULL OR m.idconductor_76 = $3)
       GROUP BY m.idconductor_76, t.nombre_06, t.apaterno_06, t.amaterno_06, t.ruttrabajador_06,
                dn.iddano_neumatico_74, dn.codigo_74, dn.descripcion_74
       ORDER BY cantidad DESC, conductor_nombre, dn.codigo_74`,
      [desde, hasta, idConductor]
    );

    const detalle = await pool.query(
      `SELECT
         m.folio_76,
         m.fecha_76,
         n.cod_neumatico_31,
         mk.marca_32,
         dn.codigo_74 AS dano_codigo,
         dn.descripcion_74 AS dano_descripcion,
         mq.numinterno_11 AS maquina_numinterno,
         mq.ppu_11 AS maquina_ppu,
         TRIM(CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, ''))) AS conductor_nombre,
         TRIM(CONCAT(tec.nombres_21, ' ', COALESCE(tec.a_paterno_21, ''), ' ', COALESCE(tec.a_materno_21, ''))) AS tecnico_nombre
       FROM tbl_80_d_baja_neumatico d
       JOIN tbl_76_m_trazabilidad_neumatico m ON m.idtrazabilidad_76 = d.idtrazabilidad_80
       JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_80
       LEFT JOIN tbl_32_marca_neumatico mk ON mk.id_marca_32 = n.id_marca_31
       JOIN tbl_74_tipo_dano_neumatico dn ON dn.iddano_neumatico_74 = d.iddano_neumatico_80
       JOIN tbl_06_trabajador t ON t.idtrabajador_06 = m.idconductor_76
       JOIN tbl_11_maquina mq ON mq.idmaquina_11 = m.idmaquina_76
       JOIN tbl_21_tecnico tec ON tec.id_tecnico_21 = m.idtecnico_76
       WHERE ($1::date IS NULL OR m.fecha_76 >= $1::date)
         AND ($2::date IS NULL OR m.fecha_76 <= $2::date)
         AND ($3::int IS NULL OR m.idconductor_76 = $3)
       ORDER BY m.fecha_76 DESC, m.folio_76`,
      [desde, hasta, idConductor]
    );

    res.json({
      success: true,
      data: { resumen: resumen.rows, detalle: detalle.rows },
      count: detalle.rowCount,
    });
  } catch (error) {
    console.error('Error reporte daños neumático:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener daños de neumático por conductor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getDanosLlantaConductor = async (req: Request, res: Response): Promise<void> => {
  try {
    const desde = optDate(req.query.desde);
    const hasta = optDate(req.query.hasta);
    const idConductor = optInt(req.query.id_conductor);

    const resumen = await pool.query(
      `SELECT
         m.idconductor_76,
         TRIM(CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, ''))) AS conductor_nombre,
         t.ruttrabajador_06,
         dn.iddano_llanta_75,
         dn.codigo_75 AS dano_codigo,
         dn.descripcion_75 AS dano_descripcion,
         COUNT(*)::int AS cantidad,
         COUNT(DISTINCT m.idmaquina_76)::int AS maquinas
       FROM tbl_79_d_llanta_trazabilidad d
       JOIN tbl_76_m_trazabilidad_neumatico m ON m.idtrazabilidad_76 = d.idtrazabilidad_79
       JOIN tbl_75_tipo_dano_llanta dn ON dn.iddano_llanta_75 = d.iddano_llanta_79
       JOIN tbl_06_trabajador t ON t.idtrabajador_06 = m.idconductor_76
       WHERE d.iddano_llanta_79 IS NOT NULL
         AND ($1::date IS NULL OR m.fecha_76 >= $1::date)
         AND ($2::date IS NULL OR m.fecha_76 <= $2::date)
         AND ($3::int IS NULL OR m.idconductor_76 = $3)
       GROUP BY m.idconductor_76, t.nombre_06, t.apaterno_06, t.amaterno_06, t.ruttrabajador_06,
                dn.iddano_llanta_75, dn.codigo_75, dn.descripcion_75
       ORDER BY cantidad DESC, conductor_nombre, dn.codigo_75`,
      [desde, hasta, idConductor]
    );

    const detalle = await pool.query(
      `SELECT
         m.folio_76,
         m.fecha_76,
         COALESCE(l.codigo_36, l.descripcion_llanta_36) AS llanta,
         dn.codigo_75 AS dano_codigo,
         dn.descripcion_75 AS dano_descripcion,
         mq.numinterno_11 AS maquina_numinterno,
         mq.ppu_11 AS maquina_ppu,
         TRIM(CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, ''))) AS conductor_nombre,
         TRIM(CONCAT(tec.nombres_21, ' ', COALESCE(tec.a_paterno_21, ''), ' ', COALESCE(tec.a_materno_21, ''))) AS tecnico_nombre
       FROM tbl_79_d_llanta_trazabilidad d
       JOIN tbl_76_m_trazabilidad_neumatico m ON m.idtrazabilidad_76 = d.idtrazabilidad_79
       JOIN tbl_36_llanta l ON l.id_llanta_36 = d.idllanta_79
       JOIN tbl_75_tipo_dano_llanta dn ON dn.iddano_llanta_75 = d.iddano_llanta_79
       JOIN tbl_06_trabajador t ON t.idtrabajador_06 = m.idconductor_76
       JOIN tbl_11_maquina mq ON mq.idmaquina_11 = m.idmaquina_76
       JOIN tbl_21_tecnico tec ON tec.id_tecnico_21 = m.idtecnico_76
       WHERE d.iddano_llanta_79 IS NOT NULL
         AND ($1::date IS NULL OR m.fecha_76 >= $1::date)
         AND ($2::date IS NULL OR m.fecha_76 <= $2::date)
         AND ($3::int IS NULL OR m.idconductor_76 = $3)
       ORDER BY m.fecha_76 DESC, m.folio_76`,
      [desde, hasta, idConductor]
    );

    res.json({
      success: true,
      data: { resumen: resumen.rows, detalle: detalle.rows },
      count: detalle.rowCount,
    });
  } catch (error) {
    console.error('Error reporte daños llanta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener daños de llanta por conductor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
