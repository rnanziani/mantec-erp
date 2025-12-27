import { Request, Response } from 'express';
import { pool } from '../db.js';
import { IntentoLogin, ApiResponse } from '../types.js';

const TABLA_INTENTO = 'tbl_02_intento_login';
const TABLA_USUARIO = 'tbl_00_usuario';

/**
 * Obtener todos los intentos de login con información de usuarios
 */
export const getAllIntentosLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                i.id_intento_02,
                i.id_usuario_02,
                i.attempted_email,
                i.ip_address_02,
                i.exitoso_02,
                i.fecha_intento_02,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_INTENTO} i
            LEFT JOIN ${TABLA_USUARIO} u ON i.id_usuario_02 = u.id_usuario_00
            ORDER BY i.fecha_intento_02 DESC
        `;

        const result = await pool.query<IntentoLogin>(query);

        const response: ApiResponse<IntentoLogin[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener intentos de login:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los intentos de login'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener intentos de login de un usuario específico
 */
export const getIntentosByUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_usuario } = req.params;

        const query = `
            SELECT 
                i.id_intento_02,
                i.id_usuario_02,
                i.attempted_email,
                i.ip_address_02,
                i.exitoso_02,
                i.fecha_intento_02,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_INTENTO} i
            LEFT JOIN ${TABLA_USUARIO} u ON i.id_usuario_02 = u.id_usuario_00
            WHERE i.id_usuario_02 = $1
            ORDER BY i.fecha_intento_02 DESC
        `;

        const result = await pool.query<IntentoLogin>(query, [id_usuario]);

        const response: ApiResponse<IntentoLogin[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener intentos del usuario:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los intentos del usuario'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener intentos fallidos
 */
export const getIntentosFallidos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                i.id_intento_02,
                i.id_usuario_02,
                i.attempted_email,
                i.ip_address_02,
                i.exitoso_02,
                i.fecha_intento_02,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_INTENTO} i
            LEFT JOIN ${TABLA_USUARIO} u ON i.id_usuario_02 = u.id_usuario_00
            WHERE i.exitoso_02 = false
            ORDER BY i.fecha_intento_02 DESC
        `;

        const result = await pool.query<IntentoLogin>(query);

        const response: ApiResponse<IntentoLogin[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener intentos fallidos:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los intentos fallidos'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener intentos por IP
 */
export const getIntentosByIP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ip } = req.params;

        const query = `
            SELECT 
                i.id_intento_02,
                i.id_usuario_02,
                i.attempted_email,
                i.ip_address_02,
                i.exitoso_02,
                i.fecha_intento_02,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_INTENTO} i
            LEFT JOIN ${TABLA_USUARIO} u ON i.id_usuario_02 = u.id_usuario_00
            WHERE i.ip_address_02 = $1
            ORDER BY i.fecha_intento_02 DESC
        `;

        const result = await pool.query<IntentoLogin>(query, [ip]);

        const response: ApiResponse<IntentoLogin[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener intentos por IP:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los intentos por IP'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener intento por ID
 */
export const getIntentoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                i.id_intento_02,
                i.id_usuario_02,
                i.attempted_email,
                i.ip_address_02,
                i.exitoso_02,
                i.fecha_intento_02,
                u.username,
                u.nombre_completo_00,
                u.email
            FROM ${TABLA_INTENTO} i
            LEFT JOIN ${TABLA_USUARIO} u ON i.id_usuario_02 = u.id_usuario_00
            WHERE i.id_intento_02 = $1
        `;

        const result = await pool.query<IntentoLogin>(query, [id]);

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Intento de login no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<IntentoLogin> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener intento:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el intento de login'
        };
        res.status(500).json(response);
    }
};




































