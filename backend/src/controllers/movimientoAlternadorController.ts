import { Request, Response } from 'express';
import { pool } from '../db.js';
import { MovimientoAlternador, CreateMovimientoAlternadorDTO, UpdateMovimientoAlternadorDTO } from '../types.js';

/**
 * Obtener todos los movimientos de alternador con JOINs
 */
export const getAllMovimientos = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        m.id_movimiento_22,
        m.id_alternador_22,
        m.id_estado_anterior_22,
        m.id_estado_actual_22,
        m.id_maquina_22,
        m.fecha_movimiento_22,
        m.tipo_movimiento_22,
        m.observaciones_22,
        m.usuario_responsable_22,
        a.cod_alternador_19,
        ea.estado_20 as estado_anterior,
        ec.estado_20 as estado_actual,
        maq.numinterno_11,
        maq.ppu_11,
        maq.descripcion_11
      FROM tbl_22_movimiento_alternador m
      INNER JOIN tbl_19_alternador a ON m.id_alternador_22 = a.id_alternador_19
      LEFT JOIN tbl_20_estado_alternador ea ON m.id_estado_anterior_22 = ea.id_estado_20
      INNER JOIN tbl_20_estado_alternador ec ON m.id_estado_actual_22 = ec.id_estado_20
      LEFT JOIN tbl_11_maquina maq ON m.id_maquina_22 = maq.idmaquina_11
      ORDER BY m.fecha_movimiento_22 DESC, m.id_movimiento_22 DESC
    `;

    const result = await pool.query<MovimientoAlternador>(query);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los movimientos de alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un movimiento por ID
 */
export const getMovimientoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        m.id_movimiento_22,
        m.id_alternador_22,
        m.id_estado_anterior_22,
        m.id_estado_actual_22,
        m.id_maquina_22,
        m.fecha_movimiento_22,
        m.tipo_movimiento_22,
        m.observaciones_22,
        m.usuario_responsable_22,
        a.cod_alternador_19,
        ea.estado_20 as estado_anterior,
        ec.estado_20 as estado_actual,
        maq.numinterno_11,
        maq.ppu_11,
        maq.descripcion_11
      FROM tbl_22_movimiento_alternador m
      INNER JOIN tbl_19_alternador a ON m.id_alternador_22 = a.id_alternador_19
      LEFT JOIN tbl_20_estado_alternador ea ON m.id_estado_anterior_22 = ea.id_estado_20
      INNER JOIN tbl_20_estado_alternador ec ON m.id_estado_actual_22 = ec.id_estado_20
      LEFT JOIN tbl_11_maquina maq ON m.id_maquina_22 = maq.idmaquina_11
      WHERE m.id_movimiento_22 = $1
    `;

    const result = await pool.query<MovimientoAlternador>(query, [id]);

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Movimiento no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener movimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un nuevo movimiento de alternador
 */
export const createMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id_alternador_22,
      id_estado_anterior_22,
      id_estado_actual_22,
      id_maquina_22,
      tipo_movimiento_22,
      observaciones_22,
      usuario_responsable_22
    }: CreateMovimientoAlternadorDTO = req.body;

    // Validación básica
    if (!id_alternador_22 || !id_estado_actual_22 || !tipo_movimiento_22) {
      res.status(400).json({
        success: false,
        error: 'Los campos id_alternador, id_estado_actual y tipo_movimiento son requeridos'
      });
      return;
    }

    // Validar tipo_movimiento
    const tiposValidos = ['ENTRADA', 'SALIDA', 'ASIGNACION', 'REPARACION'];
    if (!tiposValidos.includes(tipo_movimiento_22)) {
      res.status(400).json({
        success: false,
        error: `Tipo de movimiento inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      });
      return;
    }

    // Verificar que el alternador existe
    const alternadorExists = await pool.query(
      'SELECT id_alternador_19 FROM tbl_19_alternador WHERE id_alternador_19 = $1',
      [id_alternador_22]
    );

    if (alternadorExists.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'El alternador especificado no existe'
      });
      return;
    }

    // Verificar que el estado actual existe
    const estadoExists = await pool.query(
      'SELECT id_estado_20 FROM tbl_20_estado_alternador WHERE id_estado_20 = $1',
      [id_estado_actual_22]
    );

    if (estadoExists.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'El estado actual especificado no existe'
      });
      return;
    }

    const result = await pool.query<MovimientoAlternador>(
      `INSERT INTO tbl_22_movimiento_alternador 
        (id_alternador_22, id_estado_anterior_22, id_estado_actual_22, id_maquina_22, 
         tipo_movimiento_22, observaciones_22, usuario_responsable_22) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        id_alternador_22,
        id_estado_anterior_22 || null,
        id_estado_actual_22,
        id_maquina_22 || null,
        tipo_movimiento_22,
        observaciones_22?.trim() || null,
        usuario_responsable_22?.trim() || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Movimiento creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un movimiento existente
 */
export const updateMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      id_alternador_22,
      id_estado_anterior_22,
      id_estado_actual_22,
      id_maquina_22,
      tipo_movimiento_22,
      observaciones_22,
      usuario_responsable_22
    }: UpdateMovimientoAlternadorDTO = req.body;

    // Validar tipo_movimiento si se proporciona
    if (tipo_movimiento_22) {
      const tiposValidos = ['ENTRADA', 'SALIDA', 'ASIGNACION', 'REPARACION'];
      if (!tiposValidos.includes(tipo_movimiento_22)) {
        res.status(400).json({
          success: false,
          error: `Tipo de movimiento inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
        });
        return;
      }
    }

    const result = await pool.query<MovimientoAlternador>(
      `UPDATE tbl_22_movimiento_alternador 
       SET id_alternador_22 = COALESCE($1, id_alternador_22),
           id_estado_anterior_22 = COALESCE($2, id_estado_anterior_22),
           id_estado_actual_22 = COALESCE($3, id_estado_actual_22),
           id_maquina_22 = COALESCE($4, id_maquina_22),
           tipo_movimiento_22 = COALESCE($5, tipo_movimiento_22),
           observaciones_22 = COALESCE($6, observaciones_22),
           usuario_responsable_22 = COALESCE($7, usuario_responsable_22)
       WHERE id_movimiento_22 = $8 
       RETURNING *`,
      [
        id_alternador_22,
        id_estado_anterior_22,
        id_estado_actual_22,
        id_maquina_22,
        tipo_movimiento_22,
        observaciones_22?.trim(),
        usuario_responsable_22?.trim(),
        id
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Movimiento no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Movimiento actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un movimiento
 */
export const deleteMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_22_movimiento_alternador WHERE id_movimiento_22 = $1 RETURNING id_movimiento_22',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Movimiento no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Movimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
