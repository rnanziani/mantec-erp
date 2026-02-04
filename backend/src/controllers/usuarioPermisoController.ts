import { Request, Response } from 'express';
import { pool } from '../db.js';
import { UsuarioPermiso, CreateUsuarioPermisoDTO, ApiResponse } from '../types.js';

const TABLA_USUARIO_PERMISO = 'tbl_000_usuario_permiso';
const TABLA_USUARIO = 'tbl_00_usuario';
const TABLA_PERMISO = 'tbl_05_permiso';

/**
 * Obtener todas las relaciones usuario-permiso con nombres
 */
export const getAllUsuarioPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                up.id_usuario_000,
                up.id_permiso_000,
                up.created_at_000,
                u.username,
                u.nombre_completo_00,
                u.email,
                p.nombre_permiso_05,
                p.descripcion_05,
                p.orden_05
            FROM ${TABLA_USUARIO_PERMISO} up
            INNER JOIN ${TABLA_USUARIO} u ON up.id_usuario_000 = u.id_usuario_00
            INNER JOIN ${TABLA_PERMISO} p ON up.id_permiso_000 = p.id_permiso_05
            ORDER BY u.username ASC, COALESCE(p.orden_05, 9999) ASC, p.nombre_permiso_05 ASC
        `;

        const result = await pool.query<UsuarioPermiso>(query);

        const response: ApiResponse<UsuarioPermiso[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener relaciones usuario-permiso:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las relaciones usuario-permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener permisos de un usuario específico
 */
export const getPermisosByUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario } = req.params;

        const query = `
            SELECT 
                up.id_usuario_000,
                up.id_permiso_000,
                up.created_at_000,
                u.username,
                u.nombre_completo_00,
                u.email,
                p.nombre_permiso_05,
                p.descripcion_05,
                p.orden_05
            FROM ${TABLA_USUARIO_PERMISO} up
            INNER JOIN ${TABLA_USUARIO} u ON up.id_usuario_000 = u.id_usuario_00
            INNER JOIN ${TABLA_PERMISO} p ON up.id_permiso_000 = p.id_permiso_05
            WHERE up.id_usuario_000 = $1
            ORDER BY COALESCE(p.orden_05, 9999) ASC, p.nombre_permiso_05 ASC
        `;

        const result = await pool.query<UsuarioPermiso>(query, [id_usuario]);

        const response: ApiResponse<UsuarioPermiso[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener permisos del usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los permisos del usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener usuarios que tienen un permiso específico
 */
export const getUsuariosByPermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_permiso } = req.params;

        const query = `
            SELECT 
                up.id_usuario_000,
                up.id_permiso_000,
                up.created_at_000,
                u.username,
                u.nombre_completo_00,
                u.email,
                p.nombre_permiso_05,
                p.descripcion_05,
                p.orden_05
            FROM ${TABLA_USUARIO_PERMISO} up
            INNER JOIN ${TABLA_USUARIO} u ON up.id_usuario_000 = u.id_usuario_00
            INNER JOIN ${TABLA_PERMISO} p ON up.id_permiso_000 = p.id_permiso_05
            WHERE up.id_permiso_000 = $1
            ORDER BY u.username ASC
        `;

        const result = await pool.query<UsuarioPermiso>(query, [id_permiso]);

        const response: ApiResponse<UsuarioPermiso[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener usuarios del permiso:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los usuarios del permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nueva relación usuario-permiso
 */
export const createUsuarioPermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario_000, id_permiso_000 }: CreateUsuarioPermisoDTO = req.body;

        // Validar que ambos IDs estén presentes
        if (!id_usuario_000 || !id_permiso_000) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El ID del usuario y el ID del permiso son requeridos'
            };
            res.status(400).json(response);
            return;
        }

        // Verificar que el usuario existe
        const usuarioCheck = await pool.query(
            `SELECT id_usuario_00, username FROM ${TABLA_USUARIO} WHERE id_usuario_00 = $1`,
            [id_usuario_000]
        );

        if (usuarioCheck.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El usuario no existe'
            };
            res.status(404).json(response);
            return;
        }

        // Verificar que el permiso existe
        const permisoCheck = await pool.query(
            `SELECT id_permiso_05 FROM ${TABLA_PERMISO} WHERE id_permiso_05 = $1`,
            [id_permiso_000]
        );

        if (permisoCheck.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El permiso no existe'
            };
            res.status(404).json(response);
            return;
        }

        // Insertar la relación
        const result = await pool.query<UsuarioPermiso>(
            `INSERT INTO ${TABLA_USUARIO_PERMISO} (id_usuario_000, id_permiso_000)
             VALUES ($1, $2)
             RETURNING *`,
            [id_usuario_000, id_permiso_000]
        );

        // Obtener los datos completos con JOIN
        const fullResult = await pool.query<UsuarioPermiso>(
            `
            SELECT 
                up.id_usuario_000,
                up.id_permiso_000,
                up.created_at_000,
                u.username,
                u.nombre_completo_00,
                u.email,
                p.nombre_permiso_05,
                p.descripcion_05,
                p.orden_05
            FROM ${TABLA_USUARIO_PERMISO} up
            INNER JOIN ${TABLA_USUARIO} u ON up.id_usuario_000 = u.id_usuario_00
            INNER JOIN ${TABLA_PERMISO} p ON up.id_permiso_000 = p.id_permiso_05
            WHERE up.id_usuario_000 = $1 AND up.id_permiso_000 = $2
            `,
            [id_usuario_000, id_permiso_000]
        );

        const response: ApiResponse<UsuarioPermiso> = {
            success: true,
            data: fullResult.rows[0],
            message: 'Permiso asignado al usuario exitosamente'
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error('Error al crear relación usuario-permiso:', error);
        
        // Manejar error de duplicado (primary key constraint)
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Este permiso ya está asignado a este usuario'
            };
            res.status(409).json(response);
            return;
        }

        // Manejar error de foreign key
        if (error.code === '23503') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El usuario o el permiso no existe'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al asignar el permiso al usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Eliminar relación usuario-permiso
 */
export const deleteUsuarioPermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario, id_permiso } = req.params;

        // Verificar si existe
        const checkResult = await pool.query(
            `SELECT * FROM ${TABLA_USUARIO_PERMISO} 
             WHERE id_usuario_000 = $1 AND id_permiso_000 = $2`,
            [id_usuario, id_permiso]
        );

        if (checkResult.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Relación usuario-permiso no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        await pool.query(
            `DELETE FROM ${TABLA_USUARIO_PERMISO} 
             WHERE id_usuario_000 = $1 AND id_permiso_000 = $2`,
            [id_usuario, id_permiso]
        );

        const response: ApiResponse<null> = {
            success: true,
            message: 'Permiso removido del usuario exitosamente'
        };

        res.json(response);
    } catch (error) {
        console.error('Error al eliminar relación usuario-permiso:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al remover el permiso del usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Asignar múltiples permisos a un usuario (operación batch)
 */
export const asignarPermisosMasivos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario_000, permisos }: { id_usuario_000: number; permisos: number[] } = req.body;

        if (!id_usuario_000 || !Array.isArray(permisos) || permisos.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El ID del usuario y un array de permisos son requeridos'
            };
            res.status(400).json(response);
            return;
        }

        // Verificar que el usuario existe
        const usuarioCheck = await pool.query(
            `SELECT id_usuario_00 FROM ${TABLA_USUARIO} WHERE id_usuario_00 = $1`,
            [id_usuario_000]
        );

        if (usuarioCheck.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El usuario no existe'
            };
            res.status(404).json(response);
            return;
        }

        // Iniciar transacción
        await pool.query('BEGIN');

        try {
            const valoresInsertados: number[] = [];
            const errores: string[] = [];

            for (const id_permiso of permisos) {
                try {
                    // Verificar que el permiso existe
                    const permisoCheck = await pool.query(
                        `SELECT id_permiso_05 FROM ${TABLA_PERMISO} WHERE id_permiso_05 = $1`,
                        [id_permiso]
                    );

                    if (permisoCheck.rows.length === 0) {
                        errores.push(`Permiso ${id_permiso} no existe`);
                        continue;
                    }

                    // Intentar insertar (ignorar si ya existe)
                    await pool.query(
                        `INSERT INTO ${TABLA_USUARIO_PERMISO} (id_usuario_000, id_permiso_000)
                         VALUES ($1, $2)
                         ON CONFLICT (id_usuario_000, id_permiso_000) DO NOTHING`,
                        [id_usuario_000, id_permiso]
                    );

                    valoresInsertados.push(id_permiso);
                } catch (error: any) {
                    errores.push(`Error al asignar permiso ${id_permiso}: ${error.message}`);
                }
            }

            await pool.query('COMMIT');

            const response: ApiResponse<{ asignados: number[]; errores: string[] }> = {
                success: true,
                data: {
                    asignados: valoresInsertados,
                    errores
                },
                message: `Se asignaron ${valoresInsertados.length} permisos al usuario`
            };

            res.status(201).json(response);
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error: any) {
        console.error('Error al asignar permisos masivos:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al asignar permisos al usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Remover todos los permisos de un usuario
 */
export const removerTodosPermisosUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario } = req.params;

        // Verificar que el usuario existe
        const usuarioCheck = await pool.query(
            `SELECT id_usuario_00 FROM ${TABLA_USUARIO} WHERE id_usuario_00 = $1`,
            [id_usuario]
        );

        if (usuarioCheck.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El usuario no existe'
            };
            res.status(404).json(response);
            return;
        }

        const result = await pool.query(
            `DELETE FROM ${TABLA_USUARIO_PERMISO} WHERE id_usuario_000 = $1`,
            [id_usuario]
        );

        const response: ApiResponse<{ eliminados: number }> = {
            success: true,
            data: {
                eliminados: result.rowCount || 0
            },
            message: `Se removieron ${result.rowCount || 0} permisos del usuario`
        };

        res.json(response);
    } catch (error) {
        console.error('Error al remover todos los permisos del usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al remover los permisos del usuario'
        };
        res.status(500).json(response);
    }
};







