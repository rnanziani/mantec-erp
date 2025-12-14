import { Request, Response } from 'express';
import { pool } from '../db.js';
import { NivelPermiso, CreateNivelPermisoDTO, ApiResponse } from '../types.js';

const TABLA_NIVEL_PERMISO = 'tbl_050_nivel_permiso';
const TABLA_NIVEL = 'tbl_04_nivel_usuario';
const TABLA_PERMISO = 'tbl_05_permiso';

/**
 * Obtener todas las relaciones nivel-permiso con nombres
 */
export const getAllNivelPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                np.id_nivel_04,
                np.id_permiso_05,
                n.nombre_nivel_04,
                n.descripcion_04,
                p.nombre_permiso_05,
                p.descripcion_05
            FROM ${TABLA_NIVEL_PERMISO} np
            INNER JOIN ${TABLA_NIVEL} n ON np.id_nivel_04 = n.id_nivel_04
            INNER JOIN ${TABLA_PERMISO} p ON np.id_permiso_05 = p.id_permiso_05
            ORDER BY n.nombre_nivel_04 ASC, p.nombre_permiso_05 ASC
        `;

        const result = await pool.query<NivelPermiso>(query);

        const response: ApiResponse<NivelPermiso[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener relaciones nivel-permiso:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las relaciones nivel-permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener permisos de un nivel específico
 */
export const getPermisosByNivel = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_nivel } = req.params;

        const query = `
            SELECT 
                np.id_nivel_04,
                np.id_permiso_05,
                n.nombre_nivel_04,
                n.descripcion_04,
                p.nombre_permiso_05,
                p.descripcion_05
            FROM ${TABLA_NIVEL_PERMISO} np
            INNER JOIN ${TABLA_NIVEL} n ON np.id_nivel_04 = n.id_nivel_04
            INNER JOIN ${TABLA_PERMISO} p ON np.id_permiso_05 = p.id_permiso_05
            WHERE np.id_nivel_04 = $1
            ORDER BY p.nombre_permiso_05 ASC
        `;

        const result = await pool.query<NivelPermiso>(query, [id_nivel]);

        const response: ApiResponse<NivelPermiso[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener permisos del nivel:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los permisos del nivel'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nueva relación nivel-permiso
 */
export const createNivelPermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_nivel_04, id_permiso_05 }: CreateNivelPermisoDTO = req.body;

        // Validar que ambos IDs estén presentes
        if (!id_nivel_04 || !id_permiso_05) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El ID del nivel y el ID del permiso son requeridos'
            };
            res.status(400).json(response);
            return;
        }

        // Verificar que el nivel existe
        const nivelCheck = await pool.query(
            `SELECT id_nivel_04 FROM ${TABLA_NIVEL} WHERE id_nivel_04 = $1`,
            [id_nivel_04]
        );

        if (nivelCheck.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El nivel de usuario no existe'
            };
            res.status(404).json(response);
            return;
        }

        // Verificar que el permiso existe
        const permisoCheck = await pool.query(
            `SELECT id_permiso_05 FROM ${TABLA_PERMISO} WHERE id_permiso_05 = $1`,
            [id_permiso_05]
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
        const result = await pool.query<NivelPermiso>(
            `INSERT INTO ${TABLA_NIVEL_PERMISO} (id_nivel_04, id_permiso_05)
       VALUES ($1, $2)
       RETURNING *`,
            [id_nivel_04, id_permiso_05]
        );

        // Obtener los datos completos con JOIN
        const fullResult = await pool.query<NivelPermiso>(
            `
            SELECT 
                np.id_nivel_04,
                np.id_permiso_05,
                n.nombre_nivel_04,
                n.descripcion_04,
                p.nombre_permiso_05,
                p.descripcion_05
            FROM ${TABLA_NIVEL_PERMISO} np
            INNER JOIN ${TABLA_NIVEL} n ON np.id_nivel_04 = n.id_nivel_04
            INNER JOIN ${TABLA_PERMISO} p ON np.id_permiso_05 = p.id_permiso_05
            WHERE np.id_nivel_04 = $1 AND np.id_permiso_05 = $2
            `,
            [id_nivel_04, id_permiso_05]
        );

        const response: ApiResponse<NivelPermiso> = {
            success: true,
            data: fullResult.rows[0],
            message: 'Relación nivel-permiso creada exitosamente'
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error('Error al crear relación nivel-permiso:', error);
        
        // Manejar error de duplicado (primary key constraint)
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Esta relación ya existe'
            };
            res.status(409).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al crear la relación nivel-permiso'
        };
        res.status(500).json(response);
    }
};

/**
 * Eliminar relación nivel-permiso
 */
export const deleteNivelPermiso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_nivel, id_permiso } = req.params;

        // Verificar si existe
        const checkResult = await pool.query(
            `SELECT * FROM ${TABLA_NIVEL_PERMISO} WHERE id_nivel_04 = $1 AND id_permiso_05 = $2`,
            [id_nivel, id_permiso]
        );

        if (checkResult.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Relación no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        await pool.query(
            `DELETE FROM ${TABLA_NIVEL_PERMISO} WHERE id_nivel_04 = $1 AND id_permiso_05 = $2`,
            [id_nivel, id_permiso]
        );

        const response: ApiResponse<null> = {
            success: true,
            message: 'Relación nivel-permiso eliminada exitosamente'
        };

        res.json(response);
    } catch (error) {
        console.error('Error al eliminar relación nivel-permiso:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al eliminar la relación nivel-permiso'
        };
        res.status(500).json(response);
    }
};

