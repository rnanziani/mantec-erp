import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Sesion, ApiResponse } from '../types.js';

const TABLA_SESION = 'tbl_03_sesion';
const TABLA_USUARIO = 'tbl_00_usuario';

/**
 * Obtener todas las sesiones con información de usuarios
 */
export const getAllSesiones = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                s.id_sesion_03,
                s.id_usuario_03,
                s.token_sesion_03,
                s.fecha_creacion_03,
                s.fecha_expiracion_03,
                s.ip_address_03,
                s.user_agent_03,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_SESION} s
            INNER JOIN ${TABLA_USUARIO} u ON s.id_usuario_03 = u.id_usuario_00
            ORDER BY s.fecha_creacion_03 DESC
        `;

        const result = await pool.query<Sesion>(query);

        const response: ApiResponse<Sesion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener sesiones:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las sesiones'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener sesiones activas (no expiradas)
 */
export const getSesionesActivas = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                s.id_sesion_03,
                s.id_usuario_03,
                s.token_sesion_03,
                s.fecha_creacion_03,
                s.fecha_expiracion_03,
                s.ip_address_03,
                s.user_agent_03,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_SESION} s
            INNER JOIN ${TABLA_USUARIO} u ON s.id_usuario_03 = u.id_usuario_00
            WHERE s.fecha_expiracion_03 > NOW()
            ORDER BY s.fecha_creacion_03 DESC
        `;

        const result = await pool.query<Sesion>(query);

        const response: ApiResponse<Sesion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener sesiones activas:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las sesiones activas'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener sesiones expiradas
 */
export const getSesionesExpiradas = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                s.id_sesion_03,
                s.id_usuario_03,
                s.token_sesion_03,
                s.fecha_creacion_03,
                s.fecha_expiracion_03,
                s.ip_address_03,
                s.user_agent_03,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_SESION} s
            INNER JOIN ${TABLA_USUARIO} u ON s.id_usuario_03 = u.id_usuario_00
            WHERE s.fecha_expiracion_03 <= NOW()
            ORDER BY s.fecha_expiracion_03 DESC
        `;

        const result = await pool.query<Sesion>(query);

        const response: ApiResponse<Sesion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener sesiones expiradas:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las sesiones expiradas'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener sesiones de un usuario específico
 */
export const getSesionesByUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario } = req.params;

        const query = `
            SELECT 
                s.id_sesion_03,
                s.id_usuario_03,
                s.token_sesion_03,
                s.fecha_creacion_03,
                s.fecha_expiracion_03,
                s.ip_address_03,
                s.user_agent_03,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_SESION} s
            INNER JOIN ${TABLA_USUARIO} u ON s.id_usuario_03 = u.id_usuario_00
            WHERE s.id_usuario_03 = $1
            ORDER BY s.fecha_creacion_03 DESC
        `;

        const result = await pool.query<Sesion>(query, [id_usuario]);

        const response: ApiResponse<Sesion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener sesiones del usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las sesiones del usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener sesión por ID
 */
export const getSesionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                s.id_sesion_03,
                s.id_usuario_03,
                s.token_sesion_03,
                s.fecha_creacion_03,
                s.fecha_expiracion_03,
                s.ip_address_03,
                s.user_agent_03,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_SESION} s
            INNER JOIN ${TABLA_USUARIO} u ON s.id_usuario_03 = u.id_usuario_00
            WHERE s.id_sesion_03 = $1
        `;

        const result = await pool.query<Sesion>(query, [id]);

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Sesión no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Sesion> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener sesión:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener la sesión'
        };
        res.status(500).json(response);
    }
};











































