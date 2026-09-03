import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateConsumoLubricanteDTO,
  DetalleConsumoLubricante,
  MaestroConsumoLubricante,
  UpdateConsumoLubricanteDTO,
} from '../types.js';

const TABLA_M = 'tbl_71_m_consumo_lubricante';
const TABLA_D = 'tbl_72_d_consumo_lubricante';
const TABLA_L = 'tbl_70_lubricante';
const MAX_DETALLES = 4;

const MAESTRO_SELECT = `
  SELECT
    m.idconsumo_71, m.folio_71, m.idmaquina_71, m.idtrabajador_71, m.idtecnico_71,
    m.km_maquina_71, m.fecha_71, m.hora_71, m.observacion_71,
    m.creado_en, m.actualizado_en,
    CONCAT(maq.numinterno_11, ' — ', COALESCE(maq.descripcion_11, '')) AS maquina_nombre,
    maq.ppu_11 AS maquina_ppu,
    CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre,
    t.ruttrabajador_06 AS trabajador_rut,
    CONCAT(
      COALESCE(tec.nombres_21, ''), ' ',
      COALESCE(tec.a_paterno_21, ''), ' ',
      COALESCE(tec.a_materno_21, '')
    ) AS tecnico_nombre,
    (
      SELECT COALESCE(SUM(d.consumo_lts_72), 0)
      FROM ${TABLA_D} d
      WHERE d.idconsumo_72 = m.idconsumo_71
    ) AS total_lts,
    (
      SELECT string_agg(
        l.cob_lubricante_70 || COALESCE(' ' || mi.marca_insumo_37, '') || ' ' || ROUND(d.consumo_lts_72::numeric, 2)::text || ' L',
        ', ' ORDER BY l.orden_aparicion_70, l.descripcion_70
      )
      FROM ${TABLA_D} d
      INNER JOIN ${TABLA_L} l ON d.idlubricante_72 = l.idlubricante_70
      LEFT JOIN tbl_37_marca_insumo mi ON l.idmarca_insumo_70 = mi.id_marca_insumo_37
      WHERE d.idconsumo_72 = m.idconsumo_71
    ) AS lubricantes_resumen
  FROM ${TABLA_M} m
  INNER JOIN tbl_11_maquina maq ON m.idmaquina_71 = maq.idmaquina_11
  INNER JOIN tbl_06_trabajador t ON m.idtrabajador_71 = t.idtrabajador_06
  INNER JOIN tbl_21_tecnico tec ON m.idtecnico_71 = tec.id_tecnico_21
`;

const DETALLE_SELECT = `
  SELECT
    d.iddetalle_72, d.idconsumo_72, d.idlubricante_72, d.consumo_lts_72, d.observacion_72,
    l.cob_lubricante_70 AS lubricante_codigo,
    l.descripcion_70 AS lubricante_nombre,
    mi.marca_insumo_37 AS lubricante_marca,
    l.orden_aparicion_70,
    l.activo_70 AS lubricante_activo
  FROM ${TABLA_D} d
  INNER JOIN ${TABLA_L} l ON d.idlubricante_72 = l.idlubricante_70
  LEFT JOIN tbl_37_marca_insumo mi ON l.idmarca_insumo_70 = mi.id_marca_insumo_37
`;

function validateDetalles(
  detalles: Array<{ idlubricante_72?: number; consumo_lts_72?: number }>
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos un lubricante';
  if (detalles.length > MAX_DETALLES) return `Máximo ${MAX_DETALLES} lubricantes por consumo`;
  const seen = new Set<number>();
  for (const d of detalles) {
    if (!d.idlubricante_72) return 'Cada línea debe tener lubricante';
    const lts = Number(d.consumo_lts_72);
    if (!lts || lts <= 0) return 'Cada línea debe tener litros > 0';
    if (seen.has(d.idlubricante_72)) return 'No repita el mismo lubricante en el detalle';
    seen.add(d.idlubricante_72);
  }
  return null;
}

export const getAllConsumosLubricante = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroConsumoLubricante>(
      `${MAESTRO_SELECT} ORDER BY m.fecha_71 DESC, m.idconsumo_71 DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener consumos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getConsumoLubricanteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestro = await pool.query<MaestroConsumoLubricante>(
      `${MAESTRO_SELECT} WHERE m.idconsumo_71 = $1`,
      [id]
    );
    if (maestro.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }
    const detalles = await pool.query<DetalleConsumoLubricante>(
      `${DETALLE_SELECT} WHERE d.idconsumo_72 = $1 ORDER BY l.orden_aparicion_70, l.descripcion_70`,
      [id]
    );
    res.json({ success: true, data: { maestro: maestro.rows[0], detalles: detalles.rows } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createConsumoLubricante = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateConsumoLubricanteDTO = req.body;
    if (!body.idmaquina_71 || !body.idtrabajador_71 || !body.idtecnico_71) {
      res.status(400).json({
        success: false,
        error: 'Máquina, trabajador y técnico son requeridos',
      });
      return;
    }
    const km = Number(body.km_maquina_71 ?? 0);
    if (Number.isNaN(km) || km < 0) {
      res.status(400).json({ success: false, error: 'KM máquina inválido' });
      return;
    }
    const errDet = validateDetalles(body.detalles || []);
    if (errDet) {
      res.status(400).json({ success: false, error: errDet });
      return;
    }

    await client.query('BEGIN');

    for (const d of body.detalles) {
      const lub = await client.query<{ activo_70: boolean; cob_lubricante_70: string }>(
        `SELECT activo_70, cob_lubricante_70 FROM ${TABLA_L} WHERE idlubricante_70 = $1`,
        [d.idlubricante_72]
      );
      if (lub.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: `Lubricante ${d.idlubricante_72} no existe` });
        return;
      }
      if (!lub.rows[0].activo_70) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          error: `El lubricante ${lub.rows[0].cob_lubricante_70} está desactivado`,
        });
        return;
      }
    }

    const maestro = await client.query<{ idconsumo_71: number; folio_71: string }>(
      `INSERT INTO ${TABLA_M} (
        idmaquina_71, idtrabajador_71, idtecnico_71, km_maquina_71,
        fecha_71, hora_71, observacion_71
      ) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), COALESCE($6::time, CURRENT_TIME), $7)
      RETURNING idconsumo_71, folio_71`,
      [
        body.idmaquina_71,
        body.idtrabajador_71,
        body.idtecnico_71,
        km,
        body.fecha_71 || null,
        body.hora_71 || null,
        body.observacion_71?.trim() || null,
      ]
    );
    const idConsumo = maestro.rows[0].idconsumo_71;

    for (const d of body.detalles) {
      await client.query(
        `INSERT INTO ${TABLA_D} (idconsumo_72, idlubricante_72, consumo_lts_72, observacion_72)
         VALUES ($1, $2, $3, $4)`,
        [
          idConsumo,
          d.idlubricante_72,
          Number(d.consumo_lts_72),
          d.observacion_72?.trim() || null,
        ]
      );
    }

    await client.query('COMMIT');

    const full = await pool.query<MaestroConsumoLubricante>(
      `${MAESTRO_SELECT} WHERE m.idconsumo_71 = $1`,
      [idConsumo]
    );
    const detalles = await pool.query<DetalleConsumoLubricante>(
      `${DETALLE_SELECT} WHERE d.idconsumo_72 = $1 ORDER BY l.orden_aparicion_70`,
      [idConsumo]
    );

    res.status(201).json({
      success: true,
      data: { maestro: full.rows[0], detalles: detalles.rows },
      message: `Consumo ${maestro.rows[0].folio_71} creado`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const updateConsumoLubricante = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateConsumoLubricanteDTO = req.body;
    const exists = await client.query(
      `SELECT idconsumo_71 FROM ${TABLA_M} WHERE idconsumo_71 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    if (body.detalles) {
      const errDet = validateDetalles(body.detalles);
      if (errDet) {
        res.status(400).json({ success: false, error: errDet });
        return;
      }
    }

    if (body.km_maquina_71 !== undefined) {
      const km = Number(body.km_maquina_71);
      if (Number.isNaN(km) || km < 0) {
        res.status(400).json({ success: false, error: 'KM máquina inválido' });
        return;
      }
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE ${TABLA_M} SET
        idmaquina_71 = COALESCE($1, idmaquina_71),
        idtrabajador_71 = COALESCE($2, idtrabajador_71),
        idtecnico_71 = COALESCE($3, idtecnico_71),
        km_maquina_71 = COALESCE($4, km_maquina_71),
        fecha_71 = COALESCE($5::date, fecha_71),
        hora_71 = COALESCE($6::time, hora_71),
        observacion_71 = CASE WHEN $7::boolean THEN $8 ELSE observacion_71 END,
        actualizado_en = CURRENT_TIMESTAMP
       WHERE idconsumo_71 = $9`,
      [
        body.idmaquina_71 ?? null,
        body.idtrabajador_71 ?? null,
        body.idtecnico_71 ?? null,
        body.km_maquina_71 != null ? Number(body.km_maquina_71) : null,
        body.fecha_71 || null,
        body.hora_71 || null,
        body.observacion_71 !== undefined,
        body.observacion_71 !== undefined ? body.observacion_71?.trim() || null : null,
        id,
      ]
    );

    if (body.detalles) {
      for (const d of body.detalles) {
        const lub = await client.query<{ activo_70: boolean; cob_lubricante_70: string }>(
          `SELECT activo_70, cob_lubricante_70 FROM ${TABLA_L} WHERE idlubricante_70 = $1`,
          [d.idlubricante_72]
        );
        if (lub.rowCount === 0) {
          await client.query('ROLLBACK');
          res.status(400).json({ success: false, error: `Lubricante ${d.idlubricante_72} no existe` });
          return;
        }
        // En edición se permiten lubricantes ya desactivados si estaban en el registro
      }

      await client.query(`DELETE FROM ${TABLA_D} WHERE idconsumo_72 = $1`, [id]);
      for (const d of body.detalles) {
        await client.query(
          `INSERT INTO ${TABLA_D} (idconsumo_72, idlubricante_72, consumo_lts_72, observacion_72)
           VALUES ($1, $2, $3, $4)`,
          [
            id,
            d.idlubricante_72,
            Number(d.consumo_lts_72),
            d.observacion_72?.trim() || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    const full = await pool.query<MaestroConsumoLubricante>(
      `${MAESTRO_SELECT} WHERE m.idconsumo_71 = $1`,
      [id]
    );
    const detalles = await pool.query<DetalleConsumoLubricante>(
      `${DETALLE_SELECT} WHERE d.idconsumo_72 = $1 ORDER BY l.orden_aparicion_70`,
      [id]
    );

    res.json({
      success: true,
      data: { maestro: full.rows[0], detalles: detalles.rows },
      message: 'Consumo actualizado',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deleteConsumoLubricante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA_M} WHERE idconsumo_71 = $1 RETURNING idconsumo_71, folio_71`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }
    res.json({
      success: true,
      message: `Consumo ${result.rows[0].folio_71 || id} eliminado`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
