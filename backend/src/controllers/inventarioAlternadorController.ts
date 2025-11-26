import { Request, Response } from 'express';
import { pool } from '../db.js';
import { InventarioAlternador, CreateInventarioAlternadorDTO, UpdateInventarioAlternadorDTO } from '../types.js';

/**
 * Obtener todo el inventario con JOINs
 */
export const getAllInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
      SELECT 
        i.id_inventario_23,
        i.id_alternador_23,
        i.id_estado_actual_23,
        i.id_maquina_asignada_23,
        i.ubicacion_23,
        i.fecha_ultimo_movimiento_23,
        i.contador_reparaciones_23,
        i.activo_23,
        a.cod_alternador_19,
        m.marca_18,
        e.estado_20,
        maq.numinterno_11,
        maq.ppu_11
      FROM tbl_23_inventario_alternador i
      JOIN tbl_19_alternador a ON i.id_alternador_23 = a.id_alternador_19
      JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      JOIN tbl_20_estado_alternador e ON i.id_estado_actual_23 = e.id_estado_20
      LEFT JOIN tbl_11_maquina maq ON i.id_maquina_asignada_23 = maq.idmaquina_11
      WHERE i.activo_23 = true
      ORDER BY i.id_inventario_23 DESC
    `;

        const result = await pool.query<InventarioAlternador>(query);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el inventario',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Obtener un registro de inventario por ID
 */
export const getInventarioById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        i.id_inventario_23,
        i.id_alternador_23,
        i.id_estado_actual_23,
        i.id_maquina_asignada_23,
        i.ubicacion_23,
        i.fecha_ultimo_movimiento_23,
        i.contador_reparaciones_23,
        i.activo_23,
        a.cod_alternador_19,
        m.marca_18,
        e.estado_20,
        maq.numinterno_11,
        maq.ppu_11
      FROM tbl_23_inventario_alternador i
      JOIN tbl_19_alternador a ON i.id_alternador_23 = a.id_alternador_19
      JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      JOIN tbl_20_estado_alternador e ON i.id_estado_actual_23 = e.id_estado_20
      LEFT JOIN tbl_11_maquina maq ON i.id_maquina_asignada_23 = maq.idmaquina_11
      WHERE i.id_inventario_23 = $1 AND i.activo_23 = true
    `;

        const result = await pool.query<InventarioAlternador>(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Registro de inventario no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener registro de inventario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el registro de inventario',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Crear un nuevo registro de inventario
 */
export const createInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            id_alternador_23,
            id_estado_actual_23,
            id_maquina_asignada_23,
            ubicacion_23,
            contador_reparaciones_23
        }: CreateInventarioAlternadorDTO = req.body;

        // Validar campos requeridos
        if (!id_alternador_23 || !id_estado_actual_23) {
            res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos (Alternador y Estado son obligatorios)'
            });
            return;
        }

        // Verificar si el alternador ya está en inventario (Unique Constraint)
        const checkQuery = 'SELECT id_inventario_23 FROM tbl_23_inventario_alternador WHERE id_alternador_23 = $1 AND activo_23 = true';
        const checkResult = await pool.query(checkQuery, [id_alternador_23]);

        if (checkResult.rowCount && checkResult.rowCount > 0) {
            res.status(409).json({
                success: false,
                error: 'Este alternador ya se encuentra registrado en el inventario'
            });
            return;
        }

        const query = `
      INSERT INTO tbl_23_inventario_alternador 
        (id_alternador_23, id_estado_actual_23, id_maquina_asignada_23, ubicacion_23, contador_reparaciones_23)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const values = [
            id_alternador_23,
            id_estado_actual_23,
            id_maquina_asignada_23 || null,
            ubicacion_23?.trim() || null,
            contador_reparaciones_23 || 0
        ];

        const result = await pool.query<InventarioAlternador>(query, values);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Registro de inventario creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear registro de inventario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el registro de inventario',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Actualizar un registro de inventario
 */
export const updateInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            id_alternador_23,
            id_estado_actual_23,
            id_maquina_asignada_23,
            ubicacion_23,
            contador_reparaciones_23,
            activo_23
        }: UpdateInventarioAlternadorDTO = req.body;

        // Si se cambia el alternador, verificar que no exista ya en otro registro
        if (id_alternador_23) {
            const checkQuery = 'SELECT id_inventario_23 FROM tbl_23_inventario_alternador WHERE id_alternador_23 = $1 AND id_inventario_23 != $2 AND activo_23 = true';
            const checkResult = await pool.query(checkQuery, [id_alternador_23, id]);

            if (checkResult.rowCount && checkResult.rowCount > 0) {
                res.status(409).json({
                    success: false,
                    error: 'Este alternador ya está asignado a otro registro de inventario'
                });
                return;
            }
        }

        const query = `
      UPDATE tbl_23_inventario_alternador
      SET 
        id_alternador_23 = COALESCE($1, id_alternador_23),
        id_estado_actual_23 = COALESCE($2, id_estado_actual_23),
        id_maquina_asignada_23 = $3, -- Permitir NULL explícito si se envía
        ubicacion_23 = COALESCE($4, ubicacion_23),
        contador_reparaciones_23 = COALESCE($5, contador_reparaciones_23),
        activo_23 = COALESCE($6, activo_23),
        fecha_ultimo_movimiento_23 = CURRENT_TIMESTAMP
      WHERE id_inventario_23 = $7
      RETURNING *
    `;

        // Nota: Para id_maquina_asignada_23, necesitamos manejar si viene undefined (no actualizar) o null (borrar asignación)
        // En este caso simple, asumiremos que si viene en el body se actualiza.
        // Una mejor implementación requeriría verificar si la clave existe en req.body.

        // Para simplificar, usaremos la lógica estándar de COALESCE pero para permitir NULL en maquina necesitamos un truco o lógica condicional.
        // Aquí usaremos una query dinámica o lógica JS previa.

        // Vamos a simplificar: si id_maquina_asignada_23 es undefined, usamos el valor actual (COALESCE en SQL).
        // Si es null, queremos que sea NULL.
        // Pero COALESCE($3, col) con $3=NULL devuelve col. No sirve para setear NULL.

        // Re-implementación con construcción dinámica de query para ser más robustos
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (id_alternador_23 !== undefined) {
            updates.push(`id_alternador_23 = $${paramIndex++}`);
            values.push(id_alternador_23);
        }
        if (id_estado_actual_23 !== undefined) {
            updates.push(`id_estado_actual_23 = $${paramIndex++}`);
            values.push(id_estado_actual_23);
        }
        if (id_maquina_asignada_23 !== undefined) {
            updates.push(`id_maquina_asignada_23 = $${paramIndex++}`);
            values.push(id_maquina_asignada_23);
        }
        if (ubicacion_23 !== undefined) {
            updates.push(`ubicacion_23 = $${paramIndex++}`);
            values.push(ubicacion_23);
        }
        if (contador_reparaciones_23 !== undefined) {
            updates.push(`contador_reparaciones_23 = $${paramIndex++}`);
            values.push(contador_reparaciones_23);
        }
        if (activo_23 !== undefined) {
            updates.push(`activo_23 = $${paramIndex++}`);
            values.push(activo_23);
        }

        // Siempre actualizar fecha
        updates.push(`fecha_ultimo_movimiento_23 = CURRENT_TIMESTAMP`);

        if (updates.length === 1) { // Solo fecha
            res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
            return;
        }

        const dynamicQuery = `
            UPDATE tbl_23_inventario_alternador
            SET ${updates.join(', ')}
            WHERE id_inventario_23 = $${paramIndex}
            RETURNING *
        `;
        values.push(id);

        const result = await pool.query<InventarioAlternador>(dynamicQuery, values);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Registro de inventario no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Registro de inventario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar registro de inventario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el registro de inventario',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

/**
 * Eliminar un registro de inventario (soft delete)
 */
export const deleteInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const query = `
      UPDATE tbl_23_inventario_alternador
      SET activo_23 = false
      WHERE id_inventario_23 = $1
      RETURNING *
    `;

        const result = await pool.query<InventarioAlternador>(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Registro de inventario no encontrado'
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Registro de inventario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar registro de inventario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el registro de inventario',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
