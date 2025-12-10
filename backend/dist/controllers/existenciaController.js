import { pool } from '../db.js';
/**
 * Obtener todas las existencias con información de alternador, marca y ubicación
 */
export const getAllExistencias = async (req, res) => {
    try {
        const query = `
      SELECT 
        e.id_existencia_26,
        e.id_alternador_26,
        e.id_ubicacion_26,
        e.cantidad_26,
        e.created_at,
        e.updated_at,
        a.cod_alternador_19,
        m.marca_18,
        u.descripcion_27 AS ubicacion_descripcion
      FROM tbl_26_existencia e
      INNER JOIN tbl_19_alternador a ON e.id_alternador_26 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion u ON e.id_ubicacion_26 = u.id_ubicacion_27
      ORDER BY e.updated_at DESC, e.id_existencia_26 DESC
    `;
        const result = await pool.query(query);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener existencias:', error);
        const response = {
            success: false,
            error: 'Error al obtener las existencias',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Obtener existencia por ID
 */
export const getExistenciaById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        e.id_existencia_26,
        e.id_alternador_26,
        e.id_ubicacion_26,
        e.cantidad_26,
        e.created_at,
        e.updated_at,
        a.cod_alternador_19,
        m.marca_18,
        u.descripcion_27 AS ubicacion_descripcion
      FROM tbl_26_existencia e
      INNER JOIN tbl_19_alternador a ON e.id_alternador_26 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion u ON e.id_ubicacion_26 = u.id_ubicacion_27
      WHERE e.id_existencia_26 = $1
    `;
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
            const response = {
                success: false,
                error: 'Existencia no encontrada'
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
        console.error('Error al obtener existencia:', error);
        const response = {
            success: false,
            error: 'Error al obtener la existencia',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Crear o actualizar existencia (UPSERT)
 * Si ya existe una existencia para ese alternador y ubicación, la actualiza
 */
export const upsertExistencia = async (req, res) => {
    try {
        const { id_alternador_26, id_ubicacion_26, cantidad_26 } = req.body;
        // Validación
        if (!id_alternador_26 || !id_ubicacion_26 || cantidad_26 === undefined) {
            const response = {
                success: false,
                error: 'id_alternador_26, id_ubicacion_26 y cantidad_26 son requeridos'
            };
            res.status(400).json(response);
            return;
        }
        if (cantidad_26 < 0) {
            const response = {
                success: false,
                error: 'La cantidad no puede ser negativa'
            };
            res.status(400).json(response);
            return;
        }
        // UPSERT usando ON CONFLICT
        const query = `
      INSERT INTO tbl_26_existencia (id_alternador_26, id_ubicacion_26, cantidad_26)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_alternador_26, id_ubicacion_26)
      DO UPDATE SET 
        cantidad_26 = EXCLUDED.cantidad_26,
        updated_at = NOW()
      RETURNING *
    `;
        const result = await pool.query(query, [id_alternador_26, id_ubicacion_26, cantidad_26]);
        const response = {
            success: true,
            data: result.rows[0],
            message: 'Existencia actualizada exitosamente'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error al crear/actualizar existencia:', error);
        const response = {
            success: false,
            error: 'Error al crear/actualizar la existencia',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Eliminar una existencia
 */
export const deleteExistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tbl_26_existencia WHERE id_existencia_26 = $1 RETURNING id_existencia_26', [id]);
        if (result.rowCount === 0) {
            const response = {
                success: false,
                error: 'Existencia no encontrada'
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            message: 'Existencia eliminada exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al eliminar existencia:', error);
        const response = {
            success: false,
            error: 'Error al eliminar la existencia',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
