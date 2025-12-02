import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Bodega, CreateBodegaDTO, UpdateBodegaDTO, ApiResponse } from '../types.js';

/**
 * Obtener todas las bodegas
 */
export const getAllBodegas = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<Bodega>(
            `SELECT * FROM tbl_27_bodega ORDER BY descripcion_27 ASC`
        );

        const response: ApiResponse<Bodega[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener bodegas:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las bodegas'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener bodega por ID
 */
export const getBodegaById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Bodega>(
            `SELECT * FROM tbl_27_bodega WHERE id_bodega_27 = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Bodega> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener bodega:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener la bodega'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nueva bodega
 */
export const createBodega = async (req: Request, res: Response): Promise<void> => {
    try {
        const { descripcion_27, activo = true }: CreateBodegaDTO = req.body;

        // Validar descripción
        if (!descripcion_27 || descripcion_27.trim() === '') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'La descripción de la bodega es requerida'
            };
            res.status(400).json(response);
            return;
        }

        const result = await pool.query<Bodega>(
            `INSERT INTO tbl_27_bodega (descripcion_27, activo)
       VALUES ($1, $2)
       RETURNING *`,
            [descripcion_27.trim(), activo]
        );

        const response: ApiResponse<Bodega> = {
            success: true,
            data: result.rows[0],
            message: 'Bodega creada exitosamente'
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error al crear bodega:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al crear la bodega'
        };
        res.status(500).json(response);
    }
};

/**
 * Actualizar bodega
 */
export const updateBodega = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { descripcion_27, activo }: UpdateBodegaDTO = req.body;

        // Validar que al menos un campo esté presente
        if (descripcion_27 === undefined && activo === undefined) {
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

        if (descripcion_27 !== undefined) {
            if (descripcion_27.trim() === '') {
                const response: ApiResponse<null> = {
                    success: false,
                    error: 'La descripción no puede estar vacía'
                };
                res.status(400).json(response);
                return;
            }
            updates.push(`descripcion_27 = $${paramCount++}`);
            values.push(descripcion_27.trim());
        }

        if (activo !== undefined) {
            updates.push(`activo = $${paramCount++}`);
            values.push(activo);
        }

        values.push(id);

        const result = await pool.query<Bodega>(
            `UPDATE tbl_27_bodega
       SET ${updates.join(', ')}
       WHERE id_bodega_27 = $${paramCount}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Bodega> = {
            success: true,
            data: result.rows[0],
            message: 'Bodega actualizada exitosamente'
        };

        res.json(response);
    } catch (error) {
        console.error('Error al actualizar bodega:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al actualizar la bodega'
        };
        res.status(500).json(response);
    }
};

/**
 * Cambiar estado activo/inactivo de bodega
 */
export const toggleBodegaStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Bodega>(
            `UPDATE tbl_27_bodega
       SET activo = NOT activo
       WHERE id_bodega_27 = $1
       RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Bodega> = {
            success: true,
            data: result.rows[0],
            message: `Bodega ${result.rows[0].activo ? 'activada' : 'desactivada'} exitosamente`
        };

        res.json(response);
    } catch (error) {
        console.error('Error al cambiar estado de bodega:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al cambiar el estado de la bodega'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener solo bodegas activas
 */
export const getActiveBodegas = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<Bodega>(
            `SELECT * FROM tbl_27_bodega WHERE activo = true ORDER BY descripcion_27 ASC`
        );

        const response: ApiResponse<Bodega[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener bodegas activas:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las bodegas activas'
        };
        res.status(500).json(response);
    }
};
