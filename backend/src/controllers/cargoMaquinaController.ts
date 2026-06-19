import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  MaestroCargoMaquina,
  DetalleCargoMaquina,
  CreateMaestroCargoMaquinaDTO,
  UpdateMaestroCargoMaquinaDTO,
  ApiResponse,
} from '../types.js';

const TABLA_M = 'tbl_38_m_cargo_maquina';
const TABLA_D = 'tbl_39_d_cargo_maquina';

const MAESTRO_SELECT = `
  SELECT
    m.idmcargomaquina_38,
    m.idmaquina_38,
    m.idtrabajador_38,
    m.fecha_38,
    m.observacion_38,
    ma.ppu_11 AS maquina_ppu,
    ma.numinterno_11 AS maquina_numinterno,
    ma.descripcion_11 AS maquina_descripcion,
    CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre
  FROM ${TABLA_M} m
  LEFT JOIN tbl_11_maquina ma ON m.idmaquina_38 = ma.idmaquina_11
  LEFT JOIN tbl_06_trabajador t ON m.idtrabajador_38 = t.idtrabajador_06
`;

const DETALLE_SELECT = `
  SELECT
    d.iddcargomaquina_39,
    d.idmcargomaquina_39,
    d.idinsumo_39,
    d.cantstd_39,
    d.cantreal_39,
    d.diferencia_39,
    i.descripcion_43 AS insumo_descripcion
  FROM ${TABLA_D} d
  INNER JOIN tbl_43_insumo i ON d.idinsumo_39 = i.id_insumo_43
`;

function validarDetalles(
  detalles: CreateMaestroCargoMaquinaDTO['detalles']
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos un insumo en el detalle';
  for (const d of detalles) {
    if (!d.idinsumo_39) return 'Cada línea debe tener un insumo';
    if (d.cantstd_39 == null || d.cantreal_39 == null) {
      return 'Cantidad estándar y real son requeridas';
    }
    if (d.cantstd_39 < 0 || d.cantreal_39 < 0) {
      return 'Las cantidades no pueden ser negativas';
    }
  }
  return null;
}

export const getAllCargoMaquina = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroCargoMaquina>(
      `${MAESTRO_SELECT} ORDER BY m.fecha_38 DESC, m.idmcargomaquina_38 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener cargos de máquina',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getCargoMaquinaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestroResult = await pool.query<MaestroCargoMaquina>(
      `${MAESTRO_SELECT} WHERE m.idmcargomaquina_38 = $1`,
      [id]
    );
    if (maestroResult.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Cargo de máquina no encontrado' });
      return;
    }
    const detallesResult = await pool.query<DetalleCargoMaquina>(
      `${DETALLE_SELECT} WHERE d.idmcargomaquina_39 = $1 ORDER BY i.descripcion_43 ASC`,
      [id]
    );
    res.json({
      success: true,
      data: { maestro: maestroResult.rows[0], detalles: detallesResult.rows },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el cargo de máquina',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getDetallesCargoMaquina = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<DetalleCargoMaquina>(
      `${DETALLE_SELECT} WHERE d.idmcargomaquina_39 = $1 ORDER BY i.descripcion_43 ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalles',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createCargoMaquina = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateMaestroCargoMaquinaDTO = req.body;
    const { idmaquina_38, idtrabajador_38, fecha_38, observacion_38, detalles } = body;

    if (!idmaquina_38 || !idtrabajador_38) {
      res.status(400).json({ success: false, error: 'Máquina y trabajador son requeridos' });
      return;
    }
    const detalleError = validarDetalles(detalles);
    if (detalleError) {
      res.status(400).json({ success: false, error: detalleError });
      return;
    }

    await client.query('BEGIN');
    const insertM = await client.query(
      `INSERT INTO ${TABLA_M} (idmaquina_38, idtrabajador_38, fecha_38, observacion_38)
       VALUES ($1, $2, COALESCE($3::timestamp, NOW()), $4)
       RETURNING idmcargomaquina_38`,
      [idmaquina_38, idtrabajador_38, fecha_38 || null, observacion_38 || null]
    );
    const idMaestro = insertM.rows[0].idmcargomaquina_38;

    for (const d of detalles) {
      await client.query(
        `INSERT INTO ${TABLA_D} (idmcargomaquina_39, idinsumo_39, cantstd_39, cantreal_39)
         VALUES ($1, $2, $3, $4)`,
        [idMaestro, d.idinsumo_39, d.cantstd_39, d.cantreal_39]
      );
    }

    await client.query('COMMIT');

    const maestro = await pool.query<MaestroCargoMaquina>(
      `${MAESTRO_SELECT} WHERE m.idmcargomaquina_38 = $1`,
      [idMaestro]
    );
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: 'Cargo de máquina creado exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear cargo de máquina',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const updateCargoMaquina = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroCargoMaquinaDTO = req.body;
    const { idmaquina_38, idtrabajador_38, fecha_38, observacion_38, detalles } = body;

    const exists = await client.query(
      `SELECT idmcargomaquina_38 FROM ${TABLA_M} WHERE idmcargomaquina_38 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Cargo de máquina no encontrado' });
      return;
    }

    if (detalles !== undefined) {
      const detalleError = validarDetalles(detalles);
      if (detalleError) {
        res.status(400).json({ success: false, error: detalleError });
        return;
      }
    }

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (idmaquina_38 !== undefined) {
      updates.push(`idmaquina_38 = $${idx++}`);
      values.push(idmaquina_38);
    }
    if (idtrabajador_38 !== undefined) {
      updates.push(`idtrabajador_38 = $${idx++}`);
      values.push(idtrabajador_38);
    }
    if (fecha_38 !== undefined) {
      updates.push(`fecha_38 = $${idx++}`);
      values.push(fecha_38);
    }
    if (observacion_38 !== undefined) {
      updates.push(`observacion_38 = $${idx++}`);
      values.push(observacion_38);
    }

    if (updates.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE ${TABLA_M} SET ${updates.join(', ')} WHERE idmcargomaquina_38 = $${idx}`,
        values
      );
    }

    if (detalles !== undefined) {
      await client.query(`DELETE FROM ${TABLA_D} WHERE idmcargomaquina_39 = $1`, [id]);
      for (const d of detalles) {
        await client.query(
          `INSERT INTO ${TABLA_D} (idmcargomaquina_39, idinsumo_39, cantstd_39, cantreal_39)
           VALUES ($1, $2, $3, $4)`,
          [id, d.idinsumo_39, d.cantstd_39, d.cantreal_39]
        );
      }
    }

    await client.query('COMMIT');

    const maestro = await pool.query<MaestroCargoMaquina>(
      `${MAESTRO_SELECT} WHERE m.idmcargomaquina_38 = $1`,
      [id]
    );
    res.json({
      success: true,
      data: maestro.rows[0],
      message: 'Cargo de máquina actualizado exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar cargo de máquina',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deleteCargoMaquina = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA_M} WHERE idmcargomaquina_38 = $1 RETURNING idmcargomaquina_38`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Cargo de máquina no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Cargo de máquina eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cargo de máquina',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
