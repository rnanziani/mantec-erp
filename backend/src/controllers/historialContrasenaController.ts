import { Request, Response } from 'express';
import { pool } from '../db.js';
import { HistorialContrasena, ApiResponse } from '../types.js';

const TABLA_HISTORIAL = 'tbl_01_historial_contrasena';
const TABLA_USUARIO = 'tbl_00_usuario';

/**
 * Obtener todo el historial de contraseñas con información de usuarios
 */
export const getAllHistorialContrasenas = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                h.id_historial_01,
                h.id_usuario_01,
                h.fecha_cambio_01,
                u.username as username_00,
                u.nombre_completo_00 as nombre_completo,
                u.email as email_00
            FROM ${TABLA_HISTORIAL} h
            INNER JOIN ${TABLA_USUARIO} u ON h.id_usuario_01 = u.id_usuario_00
            ORDER BY h.fecha_cambio_01 DESC
        `;

        const result = await pool.query<HistorialContrasena>(query);

        const response: ApiResponse<HistorialContrasena[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener historial de contraseñas:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el historial de contraseñas'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener historial de contraseñas de un usuario específico
 */
export const getHistorialByUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario } = req.params;

        const query = `
            SELECT 
                h.id_historial_01,
                h.id_usuario_01,
                h.fecha_cambio_01,
                u.username as username_00,
                u.nombre_completo_00 as nombre_completo,
                u.email as email_00
            FROM ${TABLA_HISTORIAL} h
            INNER JOIN ${TABLA_USUARIO} u ON h.id_usuario_01 = u.id_usuario_00
            WHERE h.id_usuario_01 = $1
            ORDER BY h.fecha_cambio_01 DESC
        `;

        const result = await pool.query<HistorialContrasena>(query, [id_usuario]);

        const response: ApiResponse<HistorialContrasena[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener historial del usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el historial del usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener historial por ID
 */
export const getHistorialById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                h.id_historial_01,
                h.id_usuario_01,
                h.fecha_cambio_01,
                u.username as username_00,
                u.nombre_completo_00 as nombre_completo,
                u.email as email_00
            FROM ${TABLA_HISTORIAL} h
            INNER JOIN ${TABLA_USUARIO} u ON h.id_usuario_01 = u.id_usuario_00
            WHERE h.id_historial_01 = $1
        `;

        const result = await pool.query<HistorialContrasena>(query, [id]);

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Registro de historial no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<HistorialContrasena> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el registro de historial'
        };
        res.status(500).json(response);
    }
};

