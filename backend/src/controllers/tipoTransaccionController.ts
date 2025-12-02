import { Request, Response } from 'express';
import { pool } from '../db.js';
import { TipoTransaccion, CreateTipoTransaccionDTO, UpdateTipoTransaccionDTO, ApiResponse } from '../types.js';

/**
 * Obtener todos los tipos de transacción
 */
export const getAllTipos = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<TipoTransaccion>(
            `SELECT * FROM tbl_25_tipo_transaccion ORDER BY descripcion_25 ASC`
        );

        const response: ApiResponse<TipoTransaccion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener tipos de transacción:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener los tipos de transacción'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener tipo de transacción por ID
 */
export const getTipoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<TipoTransaccion>(
            `SELECT * FROM tbl_25_tipo_transaccion WHERE id_tipo_transaccion_25 = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Tipo de transacción no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<TipoTransaccion> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener tipo de transacción:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el tipo de transacción'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nuevo tipo de transacción
 */
export const createTipo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { descripcion_25, cod_accion_25, valor_accion_25 }: CreateTipoTransaccionDTO = req.body;

        // Validaciones
        if (!descripcion_25 || descripcion_25.trim() === '') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'La descripción es requerida'
            };
            res.status(400).json(response);
            return;
        }

        if (!cod_accion_25 || !/^[A-Z]{3}$/.test(cod_accion_25)) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El código de acción debe ser exactamente 3 letras mayúsculas'
            };
            res.status(400).json(response);
            return;
        }

        if (![1, 0, -1].includes(valor_accion_25)) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El valor de acción debe ser 1, 0 o -1'
            };
            res.status(400).json(response);
            return;
        }

        // Verificar que el código no exista
        const existingCode = await pool.query(
            `SELECT id_tipo_transaccion_25 FROM tbl_25_tipo_transaccion WHERE cod_accion_25 = $1`,
            [cod_accion_25]
        );

        if (existingCode.rows.length > 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: `El código de acción '${cod_accion_25}' ya existe`
            };
            res.status(400).json(response);
            return;
        }

        const result = await pool.query<TipoTransaccion>(
            `INSERT INTO tbl_25_tipo_transaccion (descripcion_25, cod_accion_25, valor_accion_25)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [descripcion_25.trim(), cod_accion_25, valor_accion_25]
        );

        const response: ApiResponse<TipoTransaccion> = {
            success: true,
            data: result.rows[0],
            message: 'Tipo de transacción creado exitosamente'
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error('Error al crear tipo de transacción:', error);

        // Manejar error de código duplicado
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El código de acción ya existe'
            };
            res.status(400).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al crear el tipo de transacción'
        };
        res.status(500).json(response);
    }
};

/**
 * Actualizar tipo de transacción
 */
export const updateTipo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { descripcion_25, cod_accion_25, valor_accion_25 }: UpdateTipoTransaccionDTO = req.body;

        // Validar que al menos un campo esté presente
        if (descripcion_25 === undefined && cod_accion_25 === undefined && valor_accion_25 === undefined) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Debe proporcionar al menos un campo para actualizar'
            };
            res.status(400).json(response);
            return;
        }

        // Validaciones
        if (descripcion_25 !== undefined && descripcion_25.trim() === '') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'La descripción no puede estar vacía'
            };
            res.status(400).json(response);
            return;
        }

        if (cod_accion_25 !== undefined && !/^[A-Z]{3}$/.test(cod_accion_25)) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El código de acción debe ser exactamente 3 letras mayúsculas'
            };
            res.status(400).json(response);
            return;
        }

        if (valor_accion_25 !== undefined && ![1, 0, -1].includes(valor_accion_25)) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El valor de acción debe ser 1, 0 o -1'
            };
            res.status(400).json(response);
            return;
        }

        // Construir query dinámicamente
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (descripcion_25 !== undefined) {
            updates.push(`descripcion_25 = $${paramCount++}`);
            values.push(descripcion_25.trim());
        }

        if (cod_accion_25 !== undefined) {
            updates.push(`cod_accion_25 = $${paramCount++}`);
            values.push(cod_accion_25);
        }

        if (valor_accion_25 !== undefined) {
            updates.push(`valor_accion_25 = $${paramCount++}`);
            values.push(valor_accion_25);
        }

        values.push(id);

        const result = await pool.query<TipoTransaccion>(
            `UPDATE tbl_25_tipo_transaccion
       SET ${updates.join(', ')}
       WHERE id_tipo_transaccion_25 = $${paramCount}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Tipo de transacción no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<TipoTransaccion> = {
            success: true,
            data: result.rows[0],
            message: 'Tipo de transacción actualizado exitosamente'
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error al actualizar tipo de transacción:', error);

        // Manejar error de código duplicado
        if (error.code === '23505') {
            const response: ApiResponse<null> = {
                success: false,
                error: 'El código de acción ya existe'
            };
            res.status(400).json(response);
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al actualizar el tipo de transacción'
        };
        res.status(500).json(response);
    }
};
