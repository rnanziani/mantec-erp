import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Transaccion, CreateTransaccionDTO, UpdateTransaccionDTO, ApiResponse } from '../types.js';

/**
 * Obtener todas las transacciones con información relacionada
 */
export const getAllTransacciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<Transaccion>(
            `SELECT 
        t.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion,
        tt.descripcion_25 as tipo_descripcion,
        tt.cod_accion_25 as tipo_codigo,
        tt.valor_accion_25 as valor_accion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON t.id_bodega_28 = b.id_bodega_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      ORDER BY t.fecha_28 DESC, t.id_transaccion_28 DESC
      LIMIT 100`
        );

        const response: ApiResponse<Transaccion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las transacciones'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener transacción por ID
 */
export const getTransaccionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Transaccion>(
            `SELECT 
        t.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion,
        tt.descripcion_25 as tipo_descripcion,
        tt.cod_accion_25 as tipo_codigo,
        tt.valor_accion_25 as valor_accion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON t.id_bodega_28 = b.id_bodega_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      WHERE t.id_transaccion_28 = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Transacción no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<Transaccion> = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener transacción:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener la transacción'
        };
        res.status(500).json(response);
    }
};

/**
 * Crear nueva transacción y actualizar existencia automáticamente
 */
export const createTransaccion = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const { id_alternador_28, id_bodega_28, id_tipo_transaccion_28, fecha_28 }: CreateTransaccionDTO = req.body;

        // Validaciones
        if (!id_alternador_28 || !id_bodega_28 || !id_tipo_transaccion_28) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Alternador, bodega y tipo de transacción son requeridos'
            };
            res.status(400).json(response);
            return;
        }

        await client.query('BEGIN');

        // 1. Obtener el tipo de transacción para saber el valor_accion
        const tipoResult = await client.query(
            `SELECT valor_accion_25, descripcion_25 FROM tbl_25_tipo_transaccion WHERE id_tipo_transaccion_25 = $1`,
            [id_tipo_transaccion_28]
        );

        if (tipoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            const response: ApiResponse<null> = {
                success: false,
                error: 'Tipo de transacción no encontrado'
            };
            res.status(404).json(response);
            return;
        }

        const valorAccion = tipoResult.rows[0].valor_accion_25;

        // 2. Verificar que la bodega esté activa
        const bodegaResult = await client.query(
            `SELECT activo FROM tbl_27_bodega WHERE id_bodega_27 = $1`,
            [id_bodega_28]
        );

        if (bodegaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            const response: ApiResponse<null> = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }

        if (!bodegaResult.rows[0].activo) {
            await client.query('ROLLBACK');
            const response: ApiResponse<null> = {
                success: false,
                error: 'No se pueden registrar transacciones en bodegas inactivas'
            };
            res.status(400).json(response);
            return;
        }

        // 3. Verificar stock actual si es una salida (valor_accion = -1)
        if (valorAccion === -1) {
            const stockResult = await client.query(
                `SELECT cantidad_26 FROM tbl_26_existencia 
         WHERE id_alternador_26 = $1 AND id_bodega_26 = $2`,
                [id_alternador_28, id_bodega_28]
            );

            const stockActual = stockResult.rows.length > 0 ? stockResult.rows[0].cantidad_26 : 0;

            if (stockActual <= 0) {
                await client.query('ROLLBACK');
                const response: ApiResponse<null> = {
                    success: false,
                    error: 'No hay stock disponible para realizar esta salida'
                };
                res.status(400).json(response);
                return;
            }
        }

        // 4. Insertar la transacción
        const transaccionResult = await client.query<Transaccion>(
            `INSERT INTO tbl_28_transaccion (id_alternador_28, id_bodega_28, id_tipo_transaccion_28, fecha_28)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [id_alternador_28, id_bodega_28, id_tipo_transaccion_28, fecha_28 || new Date()]
        );

        // 5. Actualizar o crear existencia
        const existenciaResult = await client.query(
            `INSERT INTO tbl_26_existencia (id_alternador_26, id_bodega_26, cantidad_26)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_alternador_26, id_bodega_26)
       DO UPDATE SET cantidad_26 = tbl_26_existencia.cantidad_26 + $3
       RETURNING *`,
            [id_alternador_28, id_bodega_28, valorAccion]
        );

        // Verificar que el stock no quedó negativo
        if (existenciaResult.rows[0].cantidad_26 < 0) {
            await client.query('ROLLBACK');
            const response: ApiResponse<null> = {
                success: false,
                error: 'La transacción dejaría el stock en negativo'
            };
            res.status(400).json(response);
            return;
        }

        await client.query('COMMIT');

        // Obtener la transacción completa con JOINs
        const finalResult = await pool.query<Transaccion>(
            `SELECT 
        t.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion,
        tt.descripcion_25 as tipo_descripcion,
        tt.cod_accion_25 as tipo_codigo,
        tt.valor_accion_25 as valor_accion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON t.id_bodega_28 = b.id_bodega_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      WHERE t.id_transaccion_28 = $1`,
            [transaccionResult.rows[0].id_transaccion_28]
        );

        const response: ApiResponse<Transaccion> = {
            success: true,
            data: finalResult.rows[0],
            message: `Transacción registrada exitosamente. Stock actualizado: ${existenciaResult.rows[0].cantidad_26}`
        };

        res.status(201).json(response);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear transacción:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al crear la transacción'
        };
        res.status(500).json(response);
    } finally {
        client.release();
    }
};

/**
 * Obtener transacciones por alternador
 */
export const getTransaccionesByAlternador = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Transaccion>(
            `SELECT 
        t.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion,
        tt.descripcion_25 as tipo_descripcion,
        tt.cod_accion_25 as tipo_codigo,
        tt.valor_accion_25 as valor_accion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON t.id_bodega_28 = b.id_bodega_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      WHERE t.id_alternador_28 = $1
      ORDER BY t.fecha_28 DESC`,
            [id]
        );

        const response: ApiResponse<Transaccion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener transacciones por alternador:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las transacciones del alternador'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener transacciones por bodega
 */
export const getTransaccionesByBodega = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Transaccion>(
            `SELECT 
        t.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion,
        tt.descripcion_25 as tipo_descripcion,
        tt.cod_accion_25 as tipo_codigo,
        tt.valor_accion_25 as valor_accion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON t.id_bodega_28 = b.id_bodega_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      WHERE t.id_bodega_28 = $1
      ORDER BY t.fecha_28 DESC`,
            [id]
        );

        const response: ApiResponse<Transaccion[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener transacciones por bodega:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las transacciones de la bodega'
        };
        res.status(500).json(response);
    }
};
