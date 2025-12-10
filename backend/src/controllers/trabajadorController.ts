import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';
import { validateRut, formatRut } from '../utils/rutValidator.js';

interface Trabajador {
  idtrabajador_06: number;
  ruttrabajador_06: string;
  nombre_06: string;
  apaterno_06: string;
  amaterno_06: string;
  estado_06: boolean;
  idcargo_06?: number;
  nombre_cargo?: string;
  idempresa_06?: number;
  nombre_empresa?: string;
}

/**
 * Obtener todos los trabajadores con información de cargo y empresa
 */
export const getAllTrabajadores = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        t.idtrabajador_06,
        t.ruttrabajador_06,
        t.nombre_06,
        t.apaterno_06,
        t.amaterno_06,
        t.estado_06,
        t.idcargo_06,
        t.idempresa_06,
        c.cargo_14 AS nombre_cargo,
        e.nombreempresa_15 AS nombre_empresa
      FROM tbl_06_trabajador t
      LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
      LEFT JOIN tbl_15_empresas e ON t.idempresa_06 = e.idempresa_15
      ORDER BY t.apaterno_06 ASC, t.amaterno_06 ASC, t.nombre_06 ASC
    `;

    const result = await pool.query<Trabajador>(query);

    const response: ApiResponse<Trabajador[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener trabajadores:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener los trabajadores',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener un trabajador por ID
 */
export const getTrabajadorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        t.idtrabajador_06,
        t.ruttrabajador_06,
        t.nombre_06,
        t.apaterno_06,
        t.amaterno_06,
        t.estado_06,
        t.idcargo_06,
        t.idempresa_06,
        c.cargo_14 AS nombre_cargo,
        e.nombreempresa_15 AS nombre_empresa
      FROM tbl_06_trabajador t
      LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
      LEFT JOIN tbl_15_empresas e ON t.idempresa_06 = e.idempresa_15
      WHERE t.idtrabajador_06 = $1
    `;

    const result = await pool.query<Trabajador>(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Trabajador no encontrado'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Trabajador> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener trabajador:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener el trabajador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Crear un nuevo trabajador
 */
export const createTrabajador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ruttrabajador_06, nombre_06, apaterno_06, amaterno_06, idcargo_06, idempresa_06, estado_06 } = req.body;

    // Validar campos requeridos
    if (!ruttrabajador_06 || !nombre_06 || !apaterno_06 || !idcargo_06 || !idempresa_06) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Faltan campos requeridos'
      };
      res.status(400).json(response);
      return;
    }

    // Validar RUT
    const rutFormateado = formatRut(ruttrabajador_06);
    if (!validateRut(rutFormateado)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'RUT inválido'
      };
      res.status(400).json(response);
      return;
    }

    // Verificar si el RUT ya existe
    const checkRut = await pool.query(
      'SELECT idtrabajador_06 FROM tbl_06_trabajador WHERE ruttrabajador_06 = $1',
      [rutFormateado]
    );

    if (checkRut.rows.length > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El RUT ya está registrado'
      };
      res.status(400).json(response);
      return;
    }

    const query = `
      INSERT INTO tbl_06_trabajador 
        (ruttrabajador_06, nombre_06, apaterno_06, amaterno_06, idcargo_06, idempresa_06, estado_06)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query<Trabajador>(query, [
      rutFormateado,
      nombre_06.trim().toUpperCase(),
      apaterno_06.trim().toUpperCase(),
      amaterno_06?.trim().toUpperCase() || null,
      idcargo_06,
      idempresa_06,
      estado_06 !== undefined ? estado_06 : true
    ]);

    const response: ApiResponse<Trabajador> = {
      success: true,
      data: result.rows[0],
      message: 'Trabajador creado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear trabajador:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al crear el trabajador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Actualizar un trabajador
 */
export const updateTrabajador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { ruttrabajador_06, nombre_06, apaterno_06, amaterno_06, idcargo_06, idempresa_06, estado_06 } = req.body;

    // Validar campos requeridos
    if (!ruttrabajador_06 || !nombre_06 || !apaterno_06 || !idcargo_06 || !idempresa_06) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Faltan campos requeridos'
      };
      res.status(400).json(response);
      return;
    }

    // Validar RUT
    const rutFormateado = formatRut(ruttrabajador_06);
    if (!validateRut(rutFormateado)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'RUT inválido'
      };
      res.status(400).json(response);
      return;
    }

    // Verificar si el RUT ya existe en otro trabajador
    const checkRut = await pool.query(
      'SELECT idtrabajador_06 FROM tbl_06_trabajador WHERE ruttrabajador_06 = $1 AND idtrabajador_06 != $2',
      [rutFormateado, id]
    );

    if (checkRut.rows.length > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El RUT ya está registrado en otro trabajador'
      };
      res.status(400).json(response);
      return;
    }

    const query = `
      UPDATE tbl_06_trabajador 
      SET 
        ruttrabajador_06 = $1,
        nombre_06 = $2,
        apaterno_06 = $3,
        amaterno_06 = $4,
        idcargo_06 = $5,
        idempresa_06 = $6,
        estado_06 = $7
      WHERE idtrabajador_06 = $8
      RETURNING *
    `;

    const result = await pool.query<Trabajador>(query, [
      rutFormateado,
      nombre_06.trim().toUpperCase(),
      apaterno_06.trim().toUpperCase(),
      amaterno_06?.trim().toUpperCase() || null,
      idcargo_06,
      idempresa_06,
      estado_06 !== undefined ? estado_06 : true,
      id
    ]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Trabajador no encontrado'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Trabajador> = {
      success: true,
      data: result.rows[0],
      message: 'Trabajador actualizado exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al actualizar trabajador:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al actualizar el trabajador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Eliminar un trabajador (soft delete - cambiar estado a false)
 */
export const deleteTrabajador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE tbl_06_trabajador 
      SET estado_06 = false
      WHERE idtrabajador_06 = $1
      RETURNING *
    `;

    const result = await pool.query<Trabajador>(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Trabajador no encontrado'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Trabajador> = {
      success: true,
      data: result.rows[0],
      message: 'Trabajador eliminado exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al eliminar trabajador:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al eliminar el trabajador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};


