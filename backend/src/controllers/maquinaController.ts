import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';

interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
  estado_11: boolean;
  descripcion_11: string;
  idempresa_11: number;
  nombre_empresa?: string;
}

/**
 * Obtener todas las máquinas (activas e inactivas)
 */
export const getAllMaquinas = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        m.idmaquina_11,
        m.numinterno_11,
        m.ppu_11,
        m.estado_11,
        m.descripcion_11,
        m.idempresa_11,
        e.nombreempresa_15 as nombre_empresa
      FROM tbl_11_maquina m
      LEFT JOIN tbl_15_empresas e ON m.idempresa_11 = e.idempresa_15
      ORDER BY m.numinterno_11 ASC
    `;

    const result = await pool.query<Maquina>(query);

    const response: ApiResponse<Maquina[]> = {
      success: true,
      data: result.rows,
      count: result.rowCount ?? undefined
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener máquinas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las máquinas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener una máquina por ID
 */
export const getMaquinaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        m.idmaquina_11,
        m.numinterno_11,
        m.ppu_11,
        m.estado_11,
        m.descripcion_11,
        m.idempresa_11,
        e.nombreempresa_15 as nombre_empresa
      FROM tbl_11_maquina m
      LEFT JOIN tbl_15_empresas e ON m.idempresa_11 = e.idempresa_15
      WHERE m.idmaquina_11 = $1
    `;

    const result = await pool.query<Maquina>(query, [id]);

    if (result.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Máquina no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Maquina> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener máquina:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener la máquina',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Crear una nueva máquina
 */
export const createMaquina = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numinterno_11, ppu_11, descripcion_11, idempresa_11, estado_11 } = req.body;

    // Validaciones
    if (!numinterno_11 || !ppu_11 || !descripcion_11 || !idempresa_11) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Todos los campos son requeridos: numinterno_11, ppu_11, descripcion_11, idempresa_11'
      };
      res.status(400).json(response);
      return;
    }

    // Validar que el número interno no exceda 4 caracteres
    if (numinterno_11.length > 4) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El número interno no puede exceder 4 caracteres'
      };
      res.status(400).json(response);
      return;
    }

    // Validar que la empresa existe
    const empresaCheck = await pool.query(
      'SELECT idempresa_15 FROM tbl_15_empresas WHERE idempresa_15 = $1',
      [idempresa_11]
    );

    if (empresaCheck.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'La empresa especificada no existe'
      };
      res.status(400).json(response);
      return;
    }

    // Verificar si ya existe una máquina con el mismo número interno y empresa
    const duplicateCheck = await pool.query(
      'SELECT idmaquina_11 FROM tbl_11_maquina WHERE numinterno_11 = $1 AND idempresa_11 = $2',
      [numinterno_11, idempresa_11]
    );

    if ((duplicateCheck.rowCount ?? 0) > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Ya existe una máquina con el mismo número interno para esta empresa'
      };
      res.status(400).json(response);
      return;
    }

    // Insertar nueva máquina
    const insertQuery = `
      INSERT INTO tbl_11_maquina (numinterno_11, ppu_11, descripcion_11, idempresa_11, estado_11)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING idmaquina_11, numinterno_11, ppu_11, estado_11, descripcion_11, idempresa_11
    `;

    const result = await pool.query<Maquina>(insertQuery, [
      numinterno_11,
      ppu_11,
      descripcion_11,
      idempresa_11,
      estado_11 !== undefined ? estado_11 : true
    ]);

    const response: ApiResponse<Maquina> = {
      success: true,
      data: result.rows[0],
      message: 'Máquina creada exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear máquina:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al crear la máquina',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Actualizar una máquina
 */
export const updateMaquina = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { numinterno_11, ppu_11, descripcion_11, idempresa_11, estado_11 } = req.body;

    // Verificar que la máquina existe
    const maquinaCheck = await pool.query(
      'SELECT idmaquina_11 FROM tbl_11_maquina WHERE idmaquina_11 = $1',
      [id]
    );

    if (maquinaCheck.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Máquina no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    // Validar número interno si se proporciona
    if (numinterno_11 && numinterno_11.length > 4) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El número interno no puede exceder 4 caracteres'
      };
      res.status(400).json(response);
      return;
    }

    // Validar empresa si se proporciona
    if (idempresa_11) {
      const empresaCheck = await pool.query(
        'SELECT idempresa_15 FROM tbl_15_empresas WHERE idempresa_15 = $1',
        [idempresa_11]
      );

      if (empresaCheck.rowCount === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'La empresa especificada no existe'
        };
        res.status(400).json(response);
        return;
      }
    }

    // Verificar duplicados si se cambia número interno o empresa
    if (numinterno_11 || idempresa_11) {
      const currentMaquina = await pool.query(
        'SELECT numinterno_11, idempresa_11 FROM tbl_11_maquina WHERE idmaquina_11 = $1',
        [id]
      );

      const finalNumInterno = numinterno_11 || currentMaquina.rows[0].numinterno_11;
      const finalIdEmpresa = idempresa_11 || currentMaquina.rows[0].idempresa_11;

      const duplicateCheck = await pool.query(
        'SELECT idmaquina_11 FROM tbl_11_maquina WHERE numinterno_11 = $1 AND idempresa_11 = $2 AND idmaquina_11 != $3',
        [finalNumInterno, finalIdEmpresa, id]
      );

      if ((duplicateCheck.rowCount ?? 0) > 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Ya existe una máquina con el mismo número interno para esta empresa'
        };
        res.status(400).json(response);
        return;
      }
    }

    // Construir query de actualización dinámica
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (numinterno_11 !== undefined) {
      updates.push(`numinterno_11 = $${paramCount++}`);
      values.push(numinterno_11);
    }
    if (ppu_11 !== undefined) {
      updates.push(`ppu_11 = $${paramCount++}`);
      values.push(ppu_11);
    }
    if (descripcion_11 !== undefined) {
      updates.push(`descripcion_11 = $${paramCount++}`);
      values.push(descripcion_11);
    }
    if (idempresa_11 !== undefined) {
      updates.push(`idempresa_11 = $${paramCount++}`);
      values.push(idempresa_11);
    }
    if (estado_11 !== undefined) {
      updates.push(`estado_11 = $${paramCount++}`);
      values.push(estado_11);
    }

    if (updates.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No se proporcionaron campos para actualizar'
      };
      res.status(400).json(response);
      return;
    }

    values.push(id);
    const updateQuery = `
      UPDATE tbl_11_maquina
      SET ${updates.join(', ')}
      WHERE idmaquina_11 = $${paramCount}
      RETURNING idmaquina_11, numinterno_11, ppu_11, estado_11, descripcion_11, idempresa_11
    `;

    const result = await pool.query<Maquina>(updateQuery, values);

    const response: ApiResponse<Maquina> = {
      success: true,
      data: result.rows[0],
      message: 'Máquina actualizada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al actualizar máquina:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al actualizar la máquina',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Eliminar una máquina (soft delete cambiando estado)
 */
export const deleteMaquina = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar que la máquina existe
    const maquinaCheck = await pool.query(
      'SELECT idmaquina_11, estado_11 FROM tbl_11_maquina WHERE idmaquina_11 = $1',
      [id]
    );

    if (maquinaCheck.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Máquina no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    // Soft delete: cambiar estado a false
    const updateQuery = `
      UPDATE tbl_11_maquina
      SET estado_11 = false
      WHERE idmaquina_11 = $1
      RETURNING idmaquina_11, numinterno_11, ppu_11, estado_11, descripcion_11, idempresa_11
    `;

    const result = await pool.query<Maquina>(updateQuery, [id]);

    const response: ApiResponse<Maquina> = {
      success: true,
      data: result.rows[0],
      message: 'Máquina eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al eliminar máquina:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al eliminar la máquina',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};
