import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  MaestroConsumoInsumo,
  DetalleConsumoInsumo,
  CreateMaestroConsumoInsumoDTO,
  UpdateMaestroConsumoInsumoDTO,
  ApiResponse
} from '../types.js';

/**
 * Obtener todos los consumos (maestro) con datos relacionados
 */
export const getAllConsumosInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       ORDER BY m.fecha_46 DESC, m.hora_46 DESC, m.id_m_consumo_insumo_46 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener consumos de insumos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un consumo por ID con sus detalles
 */
export const getConsumoInsumoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const maestroResult = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       WHERE m.id_m_consumo_insumo_46 = $1`,
      [id]
    );

    if (maestroResult.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    const detallesResult = await pool.query<DetalleConsumoInsumo>(
      `SELECT d.id_d_consumo_insumo_47, d.id_m_consumo_insumo_47, d.id_insumo_47, d.cantidad_47, d.total_47, d.observacion_47,
              i.descripcion_43 AS insumo_descripcion, i.precio_insumo_43 AS precio_insumo
       FROM tbl_47_d_consumo_insumo d
       INNER JOIN tbl_43_insumo i ON d.id_insumo_47 = i.id_insumo_43
       WHERE d.id_m_consumo_insumo_47 = $1
       ORDER BY d.id_d_consumo_insumo_47 ASC`,
      [id]
    );

    const maestro = maestroResult.rows[0];
    const detalles = detallesResult.rows;

    res.json({
      success: true,
      data: {
        maestro,
        detalles
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear consumo maestro con detalles
 */
export const createConsumoInsumo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateMaestroConsumoInsumoDTO = req.body;
    const {
      idtrabajador_46,
      id_responsableentrega_46,
      id_ccosto_46,
      id_insumo_46,
      cantidad_46,
      fecha_46,
      hora_46,
      observacion_46,
      detalles = []
    } = body;

    if (
      idtrabajador_46 === undefined ||
      id_responsableentrega_46 === undefined ||
      id_ccosto_46 === undefined ||
      id_insumo_46 === undefined ||
      cantidad_46 === undefined ||
      !fecha_46 ||
      !hora_46
    ) {
      res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: idtrabajador_46, id_responsableentrega_46, id_ccosto_46, id_insumo_46, cantidad_46, fecha_46, hora_46'
      });
      return;
    }

    if (cantidad_46 <= 0) {
      res.status(400).json({ success: false, error: 'La cantidad debe ser mayor a 0' });
      return;
    }

    await client.query('BEGIN');

    const insertMaestro = await client.query(
      `INSERT INTO tbl_46_m_consumo_insumo (idtrabajador_46, id_responsableentrega_46, id_ccosto_46, id_insumo_46, cantidad_46, fecha_46, hora_46, observacion_46)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_m_consumo_insumo_46`,
      [idtrabajador_46, id_responsableentrega_46, id_ccosto_46, id_insumo_46, cantidad_46, fecha_46, hora_46, observacion_46 || null]
    );

    const idMaestro = insertMaestro.rows[0].id_m_consumo_insumo_46;

    for (const det of detalles) {
      if (det.id_insumo_47 === undefined || det.cantidad_47 === undefined || det.cantidad_47 <= 0) continue;

      const precioResult = await client.query(
        'SELECT precio_insumo_43 FROM tbl_43_insumo WHERE id_insumo_43 = $1',
        [det.id_insumo_47]
      );
      const precio = precioResult.rows[0]?.precio_insumo_43 ?? 0;
      const total = Number(det.cantidad_47) * Number(precio);

      await client.query(
        `INSERT INTO tbl_47_d_consumo_insumo (id_m_consumo_insumo_47, id_insumo_47, cantidad_47, total_47, observacion_47)
         VALUES ($1, $2, $3, $4, $5)`,
        [idMaestro, det.id_insumo_47, det.cantidad_47, total, det.observacion_47 || null]
      );
    }

    await client.query('COMMIT');

    const withJoin = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       WHERE m.id_m_consumo_insumo_46 = $1`,
      [idMaestro]
    );

    res.status(201).json({
      success: true,
      data: withJoin.rows[0],
      message: 'Consumo de insumo creado exitosamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    client.release();
  }
};

/**
 * Actualizar consumo maestro y detalles
 */
export const updateConsumoInsumo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroConsumoInsumoDTO = req.body;
    const {
      idtrabajador_46,
      id_responsableentrega_46,
      id_ccosto_46,
      id_insumo_46,
      cantidad_46,
      fecha_46,
      hora_46,
      observacion_46,
      detalles
    } = body;

    const exists = await client.query('SELECT id_m_consumo_insumo_46 FROM tbl_46_m_consumo_insumo WHERE id_m_consumo_insumo_46 = $1', [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    if (cantidad_46 !== undefined && cantidad_46 <= 0) {
      res.status(400).json({ success: false, error: 'La cantidad debe ser mayor a 0' });
      return;
    }

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (idtrabajador_46 !== undefined) {
      updates.push(`idtrabajador_46 = $${paramIndex++}`);
      values.push(idtrabajador_46);
    }
    if (id_responsableentrega_46 !== undefined) {
      updates.push(`id_responsableentrega_46 = $${paramIndex++}`);
      values.push(id_responsableentrega_46);
    }
    if (id_ccosto_46 !== undefined) {
      updates.push(`id_ccosto_46 = $${paramIndex++}`);
      values.push(id_ccosto_46);
    }
    if (id_insumo_46 !== undefined) {
      updates.push(`id_insumo_46 = $${paramIndex++}`);
      values.push(id_insumo_46);
    }
    if (cantidad_46 !== undefined) {
      updates.push(`cantidad_46 = $${paramIndex++}`);
      values.push(cantidad_46);
    }
    if (fecha_46 !== undefined) {
      updates.push(`fecha_46 = $${paramIndex++}`);
      values.push(fecha_46);
    }
    if (hora_46 !== undefined) {
      updates.push(`hora_46 = $${paramIndex++}`);
      values.push(hora_46);
    }
    if (observacion_46 !== undefined) {
      updates.push(`observacion_46 = $${paramIndex++}`);
      values.push(observacion_46);
    }

    if (updates.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE tbl_46_m_consumo_insumo SET ${updates.join(', ')} WHERE id_m_consumo_insumo_46 = $${paramIndex}`,
        values
      );
    }

    if (detalles !== undefined) {
      await client.query('DELETE FROM tbl_47_d_consumo_insumo WHERE id_m_consumo_insumo_47 = $1', [id]);

      for (const det of detalles) {
        if (det.id_insumo_47 === undefined || det.cantidad_47 === undefined || det.cantidad_47 <= 0) continue;

        const precioResult = await client.query(
          'SELECT precio_insumo_43 FROM tbl_43_insumo WHERE id_insumo_43 = $1',
          [det.id_insumo_47]
        );
        const precio = precioResult.rows[0]?.precio_insumo_43 ?? 0;
        const total = Number(det.cantidad_47) * Number(precio);

        await client.query(
          `INSERT INTO tbl_47_d_consumo_insumo (id_m_consumo_insumo_47, id_insumo_47, cantidad_47, total_47, observacion_47)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, det.id_insumo_47, det.cantidad_47, total, det.observacion_47 || null]
        );
      }
    }

    await client.query('COMMIT');

    const withJoin = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       WHERE m.id_m_consumo_insumo_46 = $1`,
      [id]
    );

    res.json({
      success: true,
      data: withJoin.rows[0],
      message: 'Consumo actualizado exitosamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    client.release();
  }
};

/**
 * Eliminar consumo (maestro y detalles por CASCADE o manual)
 */
export const deleteConsumoInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM tbl_47_d_consumo_insumo WHERE id_m_consumo_insumo_47 = $1', [id]);
    const result = await pool.query('DELETE FROM tbl_46_m_consumo_insumo WHERE id_m_consumo_insumo_46 = $1 RETURNING id_m_consumo_insumo_46', [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    res.json({ success: true, message: 'Consumo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
