import { Request, Response } from 'express';
import { pool } from '../db.js';
import { PatronRotacion, CreatePatronRotacionDTO, UpdatePatronRotacionDTO } from '../types.js';

/**
 * Obtener todos los patrones de rotación
 */
export const getAllPatrones = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<PatronRotacion>(
      `SELECT id_patron_35, codigo_patron_35, descripcion_patron_35, posiciones_origen_35, posiciones_destino_35,
              activo_35, fecha_creacion_35, fecha_modificacion_35, usuario_creacion_35
       FROM tbl_35_patron_rotacion
       ORDER BY codigo_patron_35 ASC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener patrones de rotación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los patrones de rotación',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un patrón por ID
 */
export const getPatronById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<PatronRotacion>(
      `SELECT id_patron_35, codigo_patron_35, descripcion_patron_35, posiciones_origen_35, posiciones_destino_35,
              activo_35, fecha_creacion_35, fecha_modificacion_35, usuario_creacion_35
       FROM tbl_35_patron_rotacion
       WHERE id_patron_35 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Patrón no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener patrón:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el patrón',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Validar arrays de posiciones
 */
function validarPosiciones(
  origen: unknown,
  destino: unknown
): { valido: boolean; error?: string } {
  if (!Array.isArray(origen) || !Array.isArray(destino)) {
    return { valido: false, error: 'posiciones_origen_35 y posiciones_destino_35 deben ser arrays' };
  }
  if (origen.length === 0) {
    return { valido: false, error: 'posiciones_origen_35 no puede estar vacío' };
  }
  if (destino.length === 0) {
    return { valido: false, error: 'posiciones_destino_35 no puede estar vacío' };
  }
  if (origen.length !== destino.length) {
    return { valido: false, error: 'posiciones_origen_35 y posiciones_destino_35 deben tener la misma cantidad de elementos' };
  }
  const todosNumeros = (arr: unknown[]): boolean =>
    arr.every((v) => typeof v === 'number' && !isNaN(v) && Number.isInteger(v));
  if (!todosNumeros(origen) || !todosNumeros(destino)) {
    return { valido: false, error: 'Las posiciones deben ser números enteros' };
  }
  return { valido: true };
}

/**
 * Crear un nuevo patrón de rotación
 */
export const createPatron = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      codigo_patron_35,
      descripcion_patron_35,
      posiciones_origen_35,
      posiciones_destino_35,
      activo_35,
      usuario_creacion_35
    }: CreatePatronRotacionDTO = req.body;

    if (!codigo_patron_35 || codigo_patron_35.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El código del patrón es requerido'
      });
      return;
    }

    if (!descripcion_patron_35 || descripcion_patron_35.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'La descripción del patrón es requerida'
      });
      return;
    }

    const validacion = validarPosiciones(posiciones_origen_35, posiciones_destino_35);
    if (!validacion.valido) {
      res.status(400).json({
        success: false,
        error: validacion.error
      });
      return;
    }

    const existingPatron = await pool.query(
      'SELECT id_patron_35 FROM tbl_35_patron_rotacion WHERE LOWER(codigo_patron_35) = LOWER($1)',
      [codigo_patron_35.trim()]
    );

    if (existingPatron.rowCount && existingPatron.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un patrón con ese código'
      });
      return;
    }

    const activo = activo_35 !== false;

    const result = await pool.query<PatronRotacion>(
      `INSERT INTO tbl_35_patron_rotacion (codigo_patron_35, descripcion_patron_35, posiciones_origen_35, posiciones_destino_35, activo_35, usuario_creacion_35)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        codigo_patron_35.trim().toUpperCase(),
        descripcion_patron_35.trim(),
        posiciones_origen_35,
        posiciones_destino_35,
        activo,
        usuario_creacion_35?.trim() || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Patrón creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear patrón:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el patrón',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un patrón existente
 */
export const updatePatron = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      codigo_patron_35,
      descripcion_patron_35,
      posiciones_origen_35,
      posiciones_destino_35,
      activo_35
    }: UpdatePatronRotacionDTO = req.body;

    if (codigo_patron_35 !== undefined && (!codigo_patron_35 || codigo_patron_35.trim() === '')) {
      res.status(400).json({
        success: false,
        error: 'El código del patrón no puede estar vacío'
      });
      return;
    }

    if (descripcion_patron_35 !== undefined && (!descripcion_patron_35 || descripcion_patron_35.trim() === '')) {
      res.status(400).json({
        success: false,
        error: 'La descripción del patrón no puede estar vacía'
      });
      return;
    }

    if (posiciones_origen_35 !== undefined || posiciones_destino_35 !== undefined) {
      const origen = posiciones_origen_35 ?? [];
      const destino = posiciones_destino_35 ?? [];
      const validacion = validarPosiciones(origen, destino);
      if (!validacion.valido) {
        res.status(400).json({
          success: false,
          error: validacion.error
        });
        return;
      }
    }

    if (codigo_patron_35) {
      const existingPatron = await pool.query(
        'SELECT id_patron_35 FROM tbl_35_patron_rotacion WHERE LOWER(codigo_patron_35) = LOWER($1) AND id_patron_35 != $2',
        [codigo_patron_35.trim(), id]
      );

      if (existingPatron.rowCount && existingPatron.rowCount > 0) {
        res.status(400).json({
          success: false,
          error: 'Ya existe otro patrón con ese código'
        });
        return;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (codigo_patron_35 !== undefined) {
      updates.push(`codigo_patron_35 = $${paramIndex++}`);
      values.push(codigo_patron_35.trim().toUpperCase());
    }
    if (descripcion_patron_35 !== undefined) {
      updates.push(`descripcion_patron_35 = $${paramIndex++}`);
      values.push(descripcion_patron_35.trim());
    }
    if (posiciones_origen_35 !== undefined) {
      updates.push(`posiciones_origen_35 = $${paramIndex++}`);
      values.push(posiciones_origen_35);
    }
    if (posiciones_destino_35 !== undefined) {
      updates.push(`posiciones_destino_35 = $${paramIndex++}`);
      values.push(posiciones_destino_35);
    }
    if (activo_35 !== undefined) {
      updates.push(`activo_35 = $${paramIndex++}`);
      values.push(activo_35);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No se proporcionaron campos para actualizar'
      });
      return;
    }

    updates.push(`fecha_modificacion_35 = now()`);
    values.push(id);

    const result = await pool.query<PatronRotacion>(
      `UPDATE tbl_35_patron_rotacion SET ${updates.join(', ')} WHERE id_patron_35 = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Patrón no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Patrón actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar patrón:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el patrón',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un patrón
 */
export const deletePatron = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_35_patron_rotacion WHERE id_patron_35 = $1 RETURNING id_patron_35',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Patrón no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Patrón eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar patrón:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el patrón',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
