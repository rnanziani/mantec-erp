import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Existencia, ApiResponse } from '../types.js';

/**
 * Obtener todas las existencias con información relacionada
 */
export const getAllExistencias = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query<Existencia>(
            `SELECT 
        e.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion
      FROM tbl_26_existencia e
      INNER JOIN tbl_19_alternador a ON e.id_alternador_26 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON e.id_bodega_26 = b.id_bodega_27
      ORDER BY b.descripcion_27, m.marca_18, a.cod_alternador_19`
        );

        const response: ApiResponse<Existencia[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener existencias:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las existencias'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener existencias de un alternador específico en todas las bodegas
 */
export const getExistenciasByAlternador = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Existencia>(
            `SELECT 
        e.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion
      FROM tbl_26_existencia e
      INNER JOIN tbl_19_alternador a ON e.id_alternador_26 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON e.id_bodega_26 = b.id_bodega_27
      WHERE e.id_alternador_26 = $1
      ORDER BY b.descripcion_27`,
            [id]
        );

        const response: ApiResponse<Existencia[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener existencias por alternador:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las existencias del alternador'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener existencias de una bodega específica
 */
export const getExistenciasByBodega = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query<Existencia>(
            `SELECT 
        e.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion
      FROM tbl_26_existencia e
      INNER JOIN tbl_19_alternador a ON e.id_alternador_26 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON e.id_bodega_26 = b.id_bodega_27
      WHERE e.id_bodega_26 = $1
      ORDER BY m.marca_18, a.cod_alternador_19`,
            [id]
        );

        const response: ApiResponse<Existencia[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener existencias por bodega:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener las existencias de la bodega'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener alternadores con stock bajo (cantidad <= 2)
 */
export const getStockBajo = async (req: Request, res: Response): Promise<void> => {
    try {
        const umbral = req.query.umbral ? parseInt(req.query.umbral as string) : 2;

        const result = await pool.query<Existencia>(
            `SELECT 
        e.*,
        a.cod_alternador_19,
        m.marca_18,
        b.descripcion_27 as bodega_descripcion
      FROM tbl_26_existencia e
      INNER JOIN tbl_19_alternador a ON e.id_alternador_26 = a.id_alternador_19
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_bodega b ON e.id_bodega_26 = b.id_bodega_27
      WHERE e.cantidad_26 <= $1 AND e.cantidad_26 > 0
      ORDER BY e.cantidad_26 ASC, b.descripcion_27`,
            [umbral]
        );

        const response: ApiResponse<Existencia[]> = {
            success: true,
            data: result.rows,
            message: `Se encontraron ${result.rows.length} registros con stock bajo`
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener stock bajo:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el stock bajo'
        };
        res.status(500).json(response);
    }
};

/**
 * Obtener stock total por alternador (suma de todas las bodegas)
 */
export const getStockTotalPorAlternador = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT 
        a.id_alternador_19,
        a.cod_alternador_19,
        m.marca_18,
        COALESCE(SUM(e.cantidad_26), 0) as stock_total
      FROM tbl_19_alternador a
      INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      LEFT JOIN tbl_26_existencia e ON a.id_alternador_19 = e.id_alternador_26
      GROUP BY a.id_alternador_19, a.cod_alternador_19, m.marca_18
      ORDER BY m.marca_18, a.cod_alternador_19`
        );

        const response: ApiResponse<any[]> = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error al obtener stock total por alternador:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Error al obtener el stock total'
        };
        res.status(500).json(response);
    }
};
