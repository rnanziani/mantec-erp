import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Permiso, CreatePermisoDTO, UpdatePermisoDTO, ApiResponse } from '../types.js';

const TABLA_PERMISO = 'tbl_05_permiso';

/**
 * Obtener todos los permisos
 */
export const getAllPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<Permiso>(
            `SELECT * FROM ${TABLA_PERMISO} ORDER BY nombre_permiso_05 ASC`
        );

        const response: ApiResponse<Permiso[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los permisos'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener permiso por ID
 */
export const getPermisoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Permiso>(
            `SELECT * FROM ${TABLA_PERMISO} WHERE id_permiso_05 = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Permiso no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Permiso> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener permiso:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nuevo permiso
 */
export const createPermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre_permiso_05, descripcion_05 }: CreatePermisoDTO = req.body;

        // Validar nombre
        if (!nombre_permiso_05 || nombre_permiso_05.trim() === '') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El nombre del permiso es requerido'
            };
            res.status(400).json(response);
            return;
        }

        const result = await pool.query<Permiso>(
            `INSERT INTO ${TABLA_PERMISO} (nombre_permiso_05, descripcion_05)
       VALUES ($1, $2)
       RETURNING *`,
            [nombre_permiso_05.trim(), descripcion_05?.trim() || null]
        );

        const response: ApiResponse<Permiso> = {
            success: true,
            data: result.rows[0],
            message: 'Permiso creado exitosamente'
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error('Error al crear permiso:', error);
        
        // Manejar error de duplicado
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Ya existe un permiso con ese nombre'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al crear el permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Actualizar permiso
 */
export const updatePermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre_permiso_05, descripcion_05 }: UpdatePermisoDTO = req.body;

        // Validar que al menos un campo esté presente
        if (nombre_permiso_05 === undefined && descripcion_05 === undefined) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Debe proporcionar al menos un campo para actualizar'
            };
            res.status(400).json(response);
            return;
        }

        // Construir query dinámicamente
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (nombre_permiso_05 !== undefined) {
            if (nombre_permiso_05.trim() === '') {
                const response: ApiResponse<null> = {
                    success: false,
                    error: 'El nombre no puede estar vacío'
                };
                res.status(400).json(response);
                return;
            }
            updates.push(`nombre_permiso_05 = $${paramCount++}`);
            values.push(nombre_permiso_05.trim());
        }

        if (descripcion_05 !== undefined) {
            updates.push(`descripcion_05 = $${paramCount++}`);
            values.push(descripcion_05?.trim() || null);
        }

        values.push(id);

        const result = await pool.query<Permiso>(
            `UPDATE ${TABLA_PERMISO}
       SET ${updates.join(', ')}
       WHERE id_permiso_05 = $${paramCount}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Permiso no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Permiso> = {
            success: true,
            data: result.rows[0],
            message: 'Permiso actualizado exitosamente'
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error al actualizar permiso:', error);
        
        // Manejar error de duplicado
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Ya existe un permiso con ese nombre'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al actualizar el permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Eliminar permiso
 */
export const deletePermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Verificar si existe
        const checkResult = await pool.query(
            `SELECT id_permiso_05 FROM ${TABLA_PERMISO} WHERE id_permiso_05 = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Permiso no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const result = await pool.query(
            `DELETE FROM ${TABLA_PERMISO} WHERE id_permiso_05 = $1`,
            [id]
        );

        const response: ApiResponse<null> = {
            success: true,
            message: 'Permiso eliminado exitosamente'
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error al eliminar permiso:', error);
        
        // Manejar error de foreign key constraint
        if (error.code === '23503') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'No se puede eliminar el permiso porque está siendo utilizado'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al eliminar el permiso'
        };
        res.status(500).json(response);
    }
};



















