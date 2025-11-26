import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Tecnico, CreateTecnicoDTO, UpdateTecnicoDTO } from '../types.js';
import { validateRut, formatRut } from '../utils/rutValidator.js';

/**
 * Obtener todos los técnicos con JOIN a cargos
 */
export const getAllTecnicos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
      SELECT 
        t.id_tecnico_21,
        t.rut_21,
        t.nombres_21,
        t.a_paterno_21,
        t.a_materno_21,
        t.estado_21,
        t.id_cargo_21,
        c.cargo_14 as nombre_cargo
      FROM tbl_21_tecnico t
      LEFT JOIN tbl_14_cargo c ON t.id_cargo_21 = c.idcargo_14
      ORDER BY t.a_paterno_21 ASC, t.a_materno_21 ASC, t.nombres_21 ASC
    `;

        const result = await pool.query<Tecnico>(query);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error al obtener técnicos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los técnicos',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Obtener un técnico por ID
 */
export const getTecnicoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        t.id_tecnico_21,
        t.rut_21,
        t.nombres_21,
        t.a_paterno_21,
        t.a_materno_21,
        t.estado_21,
        t.id_cargo_21,
        c.cargo_14 as nombre_cargo
      FROM tbl_21_tecnico t
      LEFT JOIN tbl_14_cargo c ON t.id_cargo_21 = c.idcargo_14
      WHERE t.id_tecnico_21 = $1
    `;

        const result = await pool.query<Tecnico>(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Técnico no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener técnico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el técnico',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Crear un nuevo técnico
 */
export const createTecnico = async (req: Request, res: Response): Promise<void> => {
    try {
        const { rut_21, nombres_21, a_paterno_21, a_materno_21, id_cargo_21, estado_21 }: CreateTecnicoDTO = req.body;

        // Validar campos requeridos
        if (!rut_21 || !nombres_21 || !a_paterno_21 || !a_materno_21 || !id_cargo_21) {
            res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
            return;
        }

        // Validar RUT
        if (!validateRut(rut_21)) {
            res.status(400).json({
                success: false,
                error: 'RUT inválido'
            });
            return;
        }

        // Formatear RUT
        const formattedRut = formatRut(rut_21);

        // Verificar si el RUT ya existe
        const checkQuery = 'SELECT id_tecnico_21 FROM tbl_21_tecnico WHERE rut_21 = $1';
        const checkResult = await pool.query(checkQuery, [formattedRut]);

        if (checkResult.rowCount && checkResult.rowCount > 0) {
            res.status(409).json({
                success: false,
                error: 'El RUT ya está registrado'
            });
            return;
        }

        const query = `
      INSERT INTO tbl_21_tecnico 
        (rut_21, nombres_21, a_paterno_21, a_materno_21, id_cargo_21, estado_21)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

        const values = [
            formattedRut,
            nombres_21.trim(),
            a_paterno_21.trim(),
            a_materno_21.trim(),
            id_cargo_21,
            estado_21 !== undefined ? estado_21 : true
        ];

        const result = await pool.query<Tecnico>(query, values);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Técnico creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear técnico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el técnico',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Actualizar un técnico
 */
export const updateTecnico = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { rut_21, nombres_21, a_paterno_21, a_materno_21, id_cargo_21, estado_21 }: UpdateTecnicoDTO = req.body;

        // Validar RUT si se proporciona
        if (rut_21 && !validateRut(rut_21)) {
            res.status(400).json({
                success: false,
                error: 'RUT inválido'
            });
            return;
        }

        const formattedRut = rut_21 ? formatRut(rut_21) : undefined;

        // Si se está actualizando el RUT, verificar que no exista
        if (formattedRut) {
            const checkQuery = 'SELECT id_tecnico_21 FROM tbl_21_tecnico WHERE rut_21 = $1 AND id_tecnico_21 != $2';
            const checkResult = await pool.query(checkQuery, [formattedRut, id]);

            if (checkResult.rowCount && checkResult.rowCount > 0) {
                res.status(409).json({
                    success: false,
                    error: 'El RUT ya está registrado para otro técnico'
                });
                return;
            }
        }

        const query = `
      UPDATE tbl_21_tecnico
      SET 
        rut_21 = COALESCE($1, rut_21),
        nombres_21 = COALESCE($2, nombres_21),
        a_paterno_21 = COALESCE($3, a_paterno_21),
        a_materno_21 = COALESCE($4, a_materno_21),
        id_cargo_21 = COALESCE($5, id_cargo_21),
        estado_21 = COALESCE($6, estado_21)
      WHERE id_tecnico_21 = $7
      RETURNING *
    `;

        const values = [
            formattedRut,
            nombres_21?.trim(),
            a_paterno_21?.trim(),
            a_materno_21?.trim(),
            id_cargo_21,
            estado_21,
            id
        ];

        const result = await pool.query<Tecnico>(query, values);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Técnico no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Técnico actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar técnico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el técnico',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Eliminar un técnico (soft delete)
 */
export const deleteTecnico = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const query = `
      UPDATE tbl_21_tecnico
      SET estado_21 = false
      WHERE id_tecnico_21 = $1
      RETURNING *
    `;

        const result = await pool.query<Tecnico>(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Técnico no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Técnico eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar técnico:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el técnico',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
