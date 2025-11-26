import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Maquina } from '../types.js';

/**
 * Obtener todas las máquinas activas con JOIN a empresas
 */
export const getAllMaquinas = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
      SELECT 
        m.idmaquina_11,
        m.numinterno_11,
        m.ppu_11,
        m.estado_11,
        m.descripcion_11,
        m.idempresa_11,
        e.nombreempresa_15 as nombre_empresa
      FROM tbl_11_maquina m
      LEFT JOIN tbl_15_empresas e ON m.idempresa_11 = e.idempresa_15
      WHERE m.estado_11 = true
      ORDER BY m.numinterno_11 ASC
    `;

        const result = await pool.query<Maquina>(query);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error al obtener máquinas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las máquinas',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Obtener una máquina por ID
 */
export const getMaquinaById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        m.idmaquina_11,
        m.numinterno_11,
        m.ppu_11,
        m.estado_11,
        m.descripcion_11,
        m.idempresa_11,
        e.nombreempresa_15 as nombre_empresa
      FROM tbl_11_maquina m
      LEFT JOIN tbl_15_empresas e ON m.idempresa_11 = e.idempresa_15
      WHERE m.idmaquina_11 = $1
    `;

        const result = await pool.query<Maquina>(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Máquina no encontrada'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener máquina:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la máquina',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
