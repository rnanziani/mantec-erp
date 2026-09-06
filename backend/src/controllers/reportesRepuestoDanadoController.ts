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

function optText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/** 1) Taller → bodega: cada línea de recepción. */
export const getRecepcionesTaller = async (req: Request, res: Response): Promise<void> => {
  try {
    const desde = optDate(req.query.desde);
    const hasta = optDate(req.query.hasta);
    const idMaquina = optInt(req.query.id_maquina);
    const idProveedor = optInt(req.query.id_proveedor);
    const estado = optText(req.query.estado)?.toUpperCase() ?? null;

    const result = await pool.query(
      `SELECT
         m.folio_59,
         m.fecha_59,
         m.hora_59,
         d.cantidad_60,
         d.estado_60,
         rd.codigo_57 AS repuesto_codigo,
         rd.nombre_57 AS repuesto_nombre,
         ma.numinterno_11 AS maquina_numinterno,
         ma.ppu_11 AS maquina_ppu,
         ma.descripcion_11 AS maquina_descripcion,
         TRIM(CONCAT(t.nombres_21, ' ', COALESCE(t.a_paterno_21, ''), ' ', COALESCE(t.a_materno_21, ''))) AS tecnico_nombre,
         p.nombre_58 AS proveedor_nombre,
         TRIM(CONCAT(
           COALESCE(r.nombreresponsableentrega_08, ''), ' ',
           COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
           COALESCE(r.amaternoresponsableentrega_08, '')
         )) AS responsable_nombre
       FROM tbl_60_d_recepcion_repuesto d
       JOIN tbl_59_m_recepcion_repuesto m ON m.idrecepcion_59 = d.idrecepcion_60
       JOIN tbl_57_repuesto_danado rd ON rd.idrepuestodanado_57 = d.idrepuestodanado_60
       JOIN tbl_11_maquina ma ON ma.idmaquina_11 = m.idmaquina_59
       JOIN tbl_21_tecnico t ON t.id_tecnico_21 = m.idtecnico_59
       JOIN tbl_58_proveedor p ON p.idproveedor_58 = m.idproveedor_59
       JOIN tbl_08_responsable_entrega r ON r.idresponsableentrega_08 = m.idresponsable_59
       WHERE ($1::date IS NULL OR m.fecha_59 >= $1::date)
         AND ($2::date IS NULL OR m.fecha_59 <= $2::date)
         AND ($3::int IS NULL OR m.idmaquina_59 = $3)
         AND ($4::int IS NULL OR m.idproveedor_59 = $4)
         AND ($5::text IS NULL OR d.estado_60 = $5)
       ORDER BY m.fecha_59 DESC, m.folio_59 DESC, d.iddetalle_60`,
      [desde, hasta, idMaquina, idProveedor, estado]
    );

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error reporte recepciones taller:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recepciones de taller',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * 2) Bodega → proveedor: situación de cada línea + conteos.
 * PENDIENTE_ENVIO | EN_PROVEEDOR | DEVUELTO_SIN_CERRAR | DISPONIBLE_BODEGA | INSTALADO | ANULADO
 */
export const getEstadoProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const idProveedor = optInt(req.query.id_proveedor);
    const situacion = optText(req.query.situacion)?.toUpperCase() ?? null;

    const result = await pool.query(
      `WITH lineas AS (
         SELECT
           d.iddetalle_60,
           d.cantidad_60,
           d.estado_60,
           rd.codigo_57 AS repuesto_codigo,
           rd.nombre_57 AS repuesto_nombre,
           m.folio_59,
           m.fecha_59,
           ma.numinterno_11 AS maquina_numinterno,
           ma.ppu_11 AS maquina_ppu,
           p59.idproveedor_58 AS idproveedor_59,
           p59.nombre_58 AS proveedor_recepcion,
           e.idproveedor_63,
           e.folio_63,
           e.fecha_entrega_63,
           e.fecha_recepcion_64,
           e.estado_nombre,
           e.dias_transcurridos,
           e.semaforo_nombre,
           e.proveedor_entrega,
           c.estado_disponible_65,
           c.fecha_65 AS fecha_cierre,
           CASE
             WHEN d.estado_60 = 'ANULADO' THEN 'ANULADO'
             WHEN e.iddetalle_64 IS NULL THEN 'PENDIENTE_ENVIO'
             WHEN c.estado_disponible_65 = 'INSTALADO' THEN 'INSTALADO'
             WHEN c.estado_disponible_65 = 'DISPONIBLE' THEN 'DISPONIBLE_BODEGA'
             WHEN d.estado_60 = 'RECIBIDO' OR e.fecha_recepcion_64 IS NOT NULL THEN 'DEVUELTO_SIN_CERRAR'
             ELSE 'EN_PROVEEDOR'
           END AS situacion
         FROM tbl_60_d_recepcion_repuesto d
         JOIN tbl_59_m_recepcion_repuesto m ON m.idrecepcion_59 = d.idrecepcion_60
         JOIN tbl_57_repuesto_danado rd ON rd.idrepuestodanado_57 = d.idrepuestodanado_60
         JOIN tbl_11_maquina ma ON ma.idmaquina_11 = m.idmaquina_59
         JOIN tbl_58_proveedor p59 ON p59.idproveedor_58 = m.idproveedor_59
         LEFT JOIN LATERAL (
           SELECT
             d64.iddetalle_64,
             d64.fecha_recepcion_64,
             m63.folio_63,
             m63.fecha_entrega_63,
             m63.idproveedor_63,
             er.nombre_61 AS estado_nombre,
             p63.nombre_58 AS proveedor_entrega,
             CASE
               WHEN d64.fecha_recepcion_64 IS NOT NULL
                 THEN (d64.fecha_recepcion_64 - m63.fecha_entrega_63)
               ELSE (CURRENT_DATE - m63.fecha_entrega_63)
             END AS dias_transcurridos,
             s.nombre_62 AS semaforo_nombre
           FROM tbl_64_d_entrega_repuesto d64
           JOIN tbl_63_m_entrega_repuesto m63 ON m63.identrega_63 = d64.identrega_64
           JOIN tbl_61_estado_reparacion er ON er.idestado_61 = d64.idestado_reparacion_64
           JOIN tbl_58_proveedor p63 ON p63.idproveedor_58 = m63.idproveedor_63
           LEFT JOIN LATERAL (
             SELECT s0.nombre_62
             FROM tbl_62_semaforo_entrega s0
             WHERE s0.activo_62 = true
               AND (
                 CASE
                   WHEN d64.fecha_recepcion_64 IS NOT NULL
                     THEN (d64.fecha_recepcion_64 - m63.fecha_entrega_63)
                   ELSE (CURRENT_DATE - m63.fecha_entrega_63)
                 END
               ) BETWEEN s0.dias_desde_62 AND COALESCE(s0.dias_hasta_62, 2147483647)
             ORDER BY s0.dias_desde_62 DESC
             LIMIT 1
           ) s ON true
           WHERE d64.iddetalle_recepcion_64 = d.iddetalle_60
           LIMIT 1
         ) e ON true
         LEFT JOIN tbl_65_recepcion_reparado c ON c.iddetalle_entrega_65 = e.iddetalle_64
       )
       SELECT * FROM lineas
       WHERE ($1::int IS NULL OR COALESCE(idproveedor_63, idproveedor_59) = $1)
         AND ($2::text IS NULL OR situacion = $2)
       ORDER BY fecha_59 DESC, folio_59 DESC`,
      [idProveedor, situacion]
    );

    const resumenMap = new Map<string, { situacion: string; lineas: number; cantidad: number }>();
    for (const r of result.rows as Array<{ situacion: string; cantidad_60: number }>) {
      const prev = resumenMap.get(r.situacion) || { situacion: r.situacion, lineas: 0, cantidad: 0 };
      prev.lineas += 1;
      prev.cantidad += Number(r.cantidad_60) || 0;
      resumenMap.set(r.situacion, prev);
    }

    res.json({
      success: true,
      data: {
        resumen: Array.from(resumenMap.values()).sort((a, b) => b.lineas - a.lineas),
        detalle: result.rows,
      },
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error reporte estado proveedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado frente al proveedor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/** 3) Instalados: fecha de montaje para eventual garantía. */
export const getInstalados = async (req: Request, res: Response): Promise<void> => {
  try {
    const desde = optDate(req.query.desde);
    const hasta = optDate(req.query.hasta);
    const idMaquina = optInt(req.query.id_maquina);
    const idProveedor = optInt(req.query.id_proveedor);

    const result = await pool.query(
      `SELECT
         c.fecha_65 AS fecha_instalacion,
         c.hora_65 AS hora_instalacion,
         c.estado_disponible_65,
         rd.codigo_57 AS repuesto_codigo,
         rd.nombre_57 AS repuesto_nombre,
         dr.cantidad_60,
         d64.valor_reparacion_64,
         d64.fecha_recepcion_64,
         m63.folio_63,
         m63.fecha_entrega_63,
         p.nombre_58 AS proveedor_nombre,
         m59.folio_59,
         inst.numinterno_11 AS maquina_numinterno,
         inst.ppu_11 AS maquina_ppu,
         inst.descripcion_11 AS maquina_descripcion,
         orig.numinterno_11 AS maquina_origen_numinterno,
         orig.ppu_11 AS maquina_origen_ppu,
         TRIM(CONCAT(tec.nombres_21, ' ', COALESCE(tec.a_paterno_21, ''), ' ', COALESCE(tec.a_materno_21, ''))) AS tecnico_nombre,
         TRIM(CONCAT(
           COALESCE(r.nombreresponsableentrega_08, ''), ' ',
           COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
           COALESCE(r.amaternoresponsableentrega_08, '')
         )) AS responsable_nombre
       FROM tbl_65_recepcion_reparado c
       JOIN tbl_64_d_entrega_repuesto d64 ON d64.iddetalle_64 = c.iddetalle_entrega_65
       JOIN tbl_63_m_entrega_repuesto m63 ON m63.identrega_63 = d64.identrega_64
       JOIN tbl_60_d_recepcion_repuesto dr ON dr.iddetalle_60 = d64.iddetalle_recepcion_64
       JOIN tbl_59_m_recepcion_repuesto m59 ON m59.idrecepcion_59 = dr.idrecepcion_60
       JOIN tbl_57_repuesto_danado rd ON rd.idrepuestodanado_57 = dr.idrepuestodanado_60
       JOIN tbl_58_proveedor p ON p.idproveedor_58 = m63.idproveedor_63
       JOIN tbl_08_responsable_entrega r ON r.idresponsableentrega_08 = c.idresponsable_65
       LEFT JOIN tbl_21_tecnico tec ON tec.id_tecnico_21 = c.idtecnico_65
       LEFT JOIN tbl_11_maquina inst ON inst.idmaquina_11 = c.idmaquina_65
       LEFT JOIN tbl_11_maquina orig ON orig.idmaquina_11 = m59.idmaquina_59
       WHERE c.estado_disponible_65 = 'INSTALADO'
         AND ($1::date IS NULL OR c.fecha_65 >= $1::date)
         AND ($2::date IS NULL OR c.fecha_65 <= $2::date)
         AND ($3::int IS NULL OR c.idmaquina_65 = $3)
         AND ($4::int IS NULL OR m63.idproveedor_63 = $4)
       ORDER BY c.fecha_65 DESC, m63.folio_63 DESC`,
      [desde, hasta, idMaquina, idProveedor]
    );

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error reporte instalados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener instalados',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
