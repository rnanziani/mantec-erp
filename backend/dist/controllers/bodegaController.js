import { pool } from '../db.js';
/**
 * Obtener todas las bodegas
 */
export const getAllBodegas = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM tbl_27_ubicacion ORDER BY descripcion_27 ASC`);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener bodegas:', error);
        const response = {
            success: false,
            error: 'Error al obtener las bodegas'
        };
        res.status(500).json(response);
    }
};
/**
 * Obtener bodega por ID
 */
export const getBodegaById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM tbl_27_ubicacion WHERE id_ubicacion_27 = $1`, [id]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: result.rows[0]
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener bodega:', error);
        const response = {
            success: false,
            error: 'Error al obtener la bodega'
        };
        res.status(500).json(response);
    }
};
/**
 * Crear nueva bodega
 */
export const createBodega = async (req, res) => {
    try {
        const { descripcion_27, activo = true } = req.body;
        // Validar descripción
        if (!descripcion_27 || descripcion_27.trim() === '') {
            const response = {
                success: false,
                error: 'La descripción de la bodega es requerida'
            };
            res.status(400).json(response);
            return;
        }
        const result = await pool.query(`INSERT INTO tbl_27_ubicacion (descripcion_27, activo)
       VALUES ($1, $2)
       RETURNING *`, [descripcion_27.trim(), activo]);
        const response = {
            success: true,
            data: result.rows[0],
            message: 'Bodega creada exitosamente'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error al crear bodega:', error);
        const response = {
            success: false,
            error: 'Error al crear la bodega'
        };
        res.status(500).json(response);
    }
};
/**
 * Actualizar bodega
 */
export const updateBodega = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion_27, activo } = req.body;
        // Validar que al menos un campo esté presente
        if (descripcion_27 === undefined && activo === undefined) {
            const response = {
                success: false,
                error: 'Debe proporcionar al menos un campo para actualizar'
            };
            res.status(400).json(response);
            return;
        }
        // Construir query dinámicamente
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (descripcion_27 !== undefined) {
            if (descripcion_27.trim() === '') {
                const response = {
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
        const result = await pool.query(`UPDATE tbl_27_ubicacion
       SET ${updates.join(', ')}
       WHERE id_ubicacion_27 = $${paramCount}
       RETURNING *`, values);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: result.rows[0],
            message: 'Bodega actualizada exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al actualizar bodega:', error);
        const response = {
            success: false,
            error: 'Error al actualizar la bodega'
        };
        res.status(500).json(response);
    }
};
/**
 * Cambiar estado activo/inactivo de bodega
 */
export const toggleBodegaStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`UPDATE tbl_27_ubicacion
       SET activo = NOT activo
       WHERE id_ubicacion_27 = $1
       RETURNING *`, [id]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Bodega no encontrada'
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: result.rows[0],
            message: `Bodega ${result.rows[0].activo ? 'activada' : 'desactivada'} exitosamente`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al cambiar estado de bodega:', error);
        const response = {
            success: false,
            error: 'Error al cambiar el estado de la bodega'
        };
        res.status(500).json(response);
    }
};
/**
 * Obtener solo bodegas activas
 */
export const getActiveBodegas = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM tbl_27_ubicacion WHERE activo = true ORDER BY descripcion_27 ASC`);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener bodegas activas:', error);
        const response = {
            success: false,
            error: 'Error al obtener las bodegas activas'
        };
        res.status(500).json(response);
    }
};
