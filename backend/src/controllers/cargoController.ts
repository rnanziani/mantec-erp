import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Cargo, CreateCargoDTO, UpdateCargoDTO } from '../types.js';

/**
 * Obtener todos los cargos
 * Retorna cargo_14 para compatibilidad con el componente CargoView
 * y también incluye nombrecargo_14 como alias para compatibilidad con TecnicoView
 */
export const getAllCargos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
      SELECT 
        idcargo_14,
        cargo_14,
        cargo_14 as nombrecargo_14
      FROM tbl_14_cargo
      ORDER BY cargo_14 ASC
    `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error al obtener cargos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los cargos',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Obtener un cargo por ID
 */
export const getCargoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query<Cargo>(
            'SELECT idcargo_14, cargo_14 FROM tbl_14_cargo WHERE idcargo_14 = $1',
            [id]
        );

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Cargo no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener cargo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el cargo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Crear un nuevo cargo
 */
export const createCargo = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('📝 POST /api/cargos - Crear cargo');
        console.log('📝 Body recibido:', req.body);
        
        const { cargo_14 }: CreateCargoDTO = req.body;

        // Validación básica
        if (!cargo_14 || cargo_14.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'El nombre del cargo es requerido'
            });
            return;
        }

        // Validar duplicados (case-insensitive)
        const existingCargo = await pool.query(
            'SELECT idcargo_14 FROM tbl_14_cargo WHERE LOWER(cargo_14) = LOWER($1)',
            [cargo_14.trim()]
        );

        if (existingCargo.rowCount && existingCargo.rowCount > 0) {
            res.status(400).json({
                success: false,
                error: 'Ya existe un cargo con ese nombre'
            });
            return;
        }

        const result = await pool.query<Cargo>(
            'INSERT INTO tbl_14_cargo (cargo_14) VALUES ($1) RETURNING *',
            [cargo_14.trim()]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Cargo creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear cargo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el cargo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Actualizar un cargo existente
 */
export const updateCargo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { cargo_14 }: UpdateCargoDTO = req.body;

        // Validación
        if (!cargo_14 || cargo_14.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'El nombre del cargo es requerido'
            });
            return;
        }

        // Validar duplicados (excluyendo el registro actual)
        const existingCargo = await pool.query(
            'SELECT idcargo_14 FROM tbl_14_cargo WHERE LOWER(cargo_14) = LOWER($1) AND idcargo_14 != $2',
            [cargo_14.trim(), id]
        );

        if (existingCargo.rowCount && existingCargo.rowCount > 0) {
            res.status(400).json({
                success: false,
                error: 'Ya existe un cargo con ese nombre'
            });
            return;
        }

        const result = await pool.query<Cargo>(
            'UPDATE tbl_14_cargo SET cargo_14 = $1 WHERE idcargo_14 = $2 RETURNING *',
            [cargo_14.trim(), id]
        );

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Cargo no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Cargo actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar cargo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el cargo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Eliminar un cargo
 */
export const deleteCargo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Verificar si el cargo está siendo usado en técnicos
        const checkUsage = await pool.query(
            'SELECT id_tecnico_21 FROM tbl_21_tecnico WHERE id_cargo_21 = $1 LIMIT 1',
            [id]
        );

        if (checkUsage.rowCount && checkUsage.rowCount > 0) {
            res.status(400).json({
                success: false,
                error: 'No se puede eliminar el cargo porque está siendo utilizado por uno o más técnicos'
            });
            return;
        }

        const result = await pool.query(
            'DELETE FROM tbl_14_cargo WHERE idcargo_14 = $1 RETURNING idcargo_14',
            [id]
        );

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Cargo no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Cargo eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar cargo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el cargo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
