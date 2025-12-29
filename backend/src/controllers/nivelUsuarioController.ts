import { Request, Response } from 'express';
import { pool } from '../db.js';
import { NivelUsuario, CreateNivelUsuarioDTO, UpdateNivelUsuarioDTO, ApiResponse } from '../types.js';

const TABLA_NIVEL_USUARIO = 'tbl_04_nivel_usuario';

/**
 * Obtener todos los niveles de usuario
 */
export const getAllNivelesUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<NivelUsuario>(
            `SELECT * FROM ${TABLA_NIVEL_USUARIO} ORDER BY nombre_nivel_04 ASC`
        );

        const response: ApiResponse<NivelUsuario[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener niveles de usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los niveles de usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener nivel de usuario por ID
 */
export const getNivelUsuarioById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<NivelUsuario>(
            `SELECT * FROM ${TABLA_NIVEL_USUARIO} WHERE id_nivel_04 = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Nivel de usuario no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<NivelUsuario> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener nivel de usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el nivel de usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nuevo nivel de usuario
 */
export const createNivelUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre_nivel_04, descripcion_04 }: CreateNivelUsuarioDTO = req.body;

        // Validar nombre
        if (!nombre_nivel_04 || nombre_nivel_04.trim() === '') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El nombre del nivel de usuario es requerido'
            };
            res.status(400).json(response);
            return;
        }

        const result = await pool.query<NivelUsuario>(
            `INSERT INTO ${TABLA_NIVEL_USUARIO} (nombre_nivel_04, descripcion_04)
       VALUES ($1, $2)
       RETURNING *`,
            [nombre_nivel_04.trim(), descripcion_04?.trim() || null]
        );

        const response: ApiResponse<NivelUsuario> = {
            success: true,
            data: result.rows[0],
            message: 'Nivel de usuario creado exitosamente'
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error('Error al crear nivel de usuario:', error);
        
        // Manejar error de duplicado
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Ya existe un nivel de usuario con ese nombre'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al crear el nivel de usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Actualizar nivel de usuario
 */
export const updateNivelUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre_nivel_04, descripcion_04 }: UpdateNivelUsuarioDTO = req.body;

        // Validar que al menos un campo esté presente
        if (nombre_nivel_04 === undefined && descripcion_04 === undefined) {
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

        if (nombre_nivel_04 !== undefined) {
            if (nombre_nivel_04.trim() === '') {
                const response: ApiResponse<null> = {
                    success: false,
                    error: 'El nombre no puede estar vacío'
                };
                res.status(400).json(response);
                return;
            }
            updates.push(`nombre_nivel_04 = $${paramCount++}`);
            values.push(nombre_nivel_04.trim());
        }

        if (descripcion_04 !== undefined) {
            updates.push(`descripcion_04 = $${paramCount++}`);
            values.push(descripcion_04?.trim() || null);
        }

        values.push(id);

        const result = await pool.query<NivelUsuario>(
            `UPDATE ${TABLA_NIVEL_USUARIO}
       SET ${updates.join(', ')}
       WHERE id_nivel_04 = $${paramCount}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Nivel de usuario no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<NivelUsuario> = {
            success: true,
            data: result.rows[0],
            message: 'Nivel de usuario actualizado exitosamente'
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error al actualizar nivel de usuario:', error);
        
        // Manejar error de duplicado
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Ya existe un nivel de usuario con ese nombre'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al actualizar el nivel de usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Eliminar nivel de usuario
 */
export const deleteNivelUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Verificar si existe
        const checkResult = await pool.query(
            `SELECT id_nivel_04 FROM ${TABLA_NIVEL_USUARIO} WHERE id_nivel_04 = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Nivel de usuario no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const result = await pool.query(
            `DELETE FROM ${TABLA_NIVEL_USUARIO} WHERE id_nivel_04 = $1`,
            [id]
        );

        const response: ApiResponse<null> = {
            success: true,
            message: 'Nivel de usuario eliminado exitosamente'
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error al eliminar nivel de usuario:', error);
        
        // Manejar error de foreign key constraint
        if (error.code === '23503') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'No se puede eliminar el nivel de usuario porque está siendo utilizado'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al eliminar el nivel de usuario'
        };
        res.status(500).json(response);
    }
};







































