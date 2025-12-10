import { pool } from '../db.js';
/**
 * Obtener todas las órdenes de trabajo con JOINs
 */
export const getAllOrdenes = async (req, res) => {
    try {
        const query = `
      SELECT 
        ot.id_orden_24,
        ot.id_alternador_24,
        ot.id_maquina_retirado_24,
        ot.fecha_ingreso_taller_24,
        ot.fecha_salida_taller_24,
        ot.diagnostico_24,
        ot.trabajo_realizado_24,
        ot.costo_reparacion_24,
        ot.tecnico_responsable_24,
        ot.estado_orden_24,
        a.cod_alternador_19,
        m.marca_18,
        maq.numinterno_11,
        maq.ppu_11
      FROM tbl_24_orden_trabajo ot
      INNER JOIN tbl_19_alternador a ON ot.id_alternador_24 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      LEFT JOIN tbl_11_maquina maq ON ot.id_maquina_retirado_24 = maq.idmaquina_11
      ORDER BY ot.fecha_ingreso_taller_24 DESC, ot.id_orden_24 DESC
    `;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    }
    catch (error) {
        console.error('Error al obtener órdenes de trabajo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las órdenes de trabajo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
/**
 * Obtener una orden de trabajo por ID
 */
export const getOrdenById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        ot.id_orden_24,
        ot.id_alternador_24,
        ot.id_maquina_retirado_24,
        ot.fecha_ingreso_taller_24,
        ot.fecha_salida_taller_24,
        ot.diagnostico_24,
        ot.trabajo_realizado_24,
        ot.costo_reparacion_24,
        ot.tecnico_responsable_24,
        ot.estado_orden_24,
        a.cod_alternador_19,
        m.marca_18,
        maq.numinterno_11,
        maq.ppu_11
      FROM tbl_24_orden_trabajo ot
      INNER JOIN tbl_19_alternador a ON ot.id_alternador_24 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      LEFT JOIN tbl_11_maquina maq ON ot.id_maquina_retirado_24 = maq.idmaquina_11
      WHERE ot.id_orden_24 = $1
    `;
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Orden de trabajo no encontrada'
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error al obtener orden de trabajo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la orden de trabajo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
/**
 * Crear una nueva orden de trabajo
 */
export const createOrden = async (req, res) => {
    try {
        const { id_alternador_24, id_maquina_retirado_24, diagnostico_24, trabajo_realizado_24, costo_reparacion_24, tecnico_responsable_24, estado_orden_24 } = req.body;
        // Validación básica
        if (!id_alternador_24) {
            res.status(400).json({
                success: false,
                error: 'El campo id_alternador es requerido'
            });
            return;
        }
        // Validar estado_orden si se proporciona
        if (estado_orden_24) {
            const estadosValidos = ['PENDIENTE', 'EN_REPARACION', 'COMPLETADA', 'CANCELADA'];
            if (!estadosValidos.includes(estado_orden_24)) {
                res.status(400).json({
                    success: false,
                    error: `Estado de orden inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
                });
                return;
            }
        }
        // Verificar que el alternador existe
        const alternadorExists = await pool.query('SELECT id_alternador_19 FROM tbl_19_alternador WHERE id_alternador_19 = $1', [id_alternador_24]);
        if (alternadorExists.rowCount === 0) {
            res.status(400).json({
                success: false,
                error: 'El alternador especificado no existe'
            });
            return;
        }
        // Verificar que la máquina existe si se proporciona
        if (id_maquina_retirado_24) {
            const maquinaExists = await pool.query('SELECT idmaquina_11 FROM tbl_11_maquina WHERE idmaquina_11 = $1', [id_maquina_retirado_24]);
            if (maquinaExists.rowCount === 0) {
                res.status(400).json({
                    success: false,
                    error: 'La máquina especificada no existe'
                });
                return;
            }
        }
        const result = await pool.query(`INSERT INTO tbl_24_orden_trabajo 
        (id_alternador_24, id_maquina_retirado_24, diagnostico_24, trabajo_realizado_24, 
         costo_reparacion_24, tecnico_responsable_24, estado_orden_24) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`, [
            id_alternador_24,
            id_maquina_retirado_24 || null,
            diagnostico_24?.trim() || null,
            trabajo_realizado_24?.trim() || null,
            costo_reparacion_24 || null,
            tecnico_responsable_24?.trim() || null,
            estado_orden_24 || 'PENDIENTE'
        ]);
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Orden de trabajo creada exitosamente'
        });
    }
    catch (error) {
        console.error('Error al crear orden de trabajo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear la orden de trabajo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
/**
 * Actualizar una orden de trabajo existente
 */
export const updateOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_alternador_24, id_maquina_retirado_24, fecha_salida_taller_24, diagnostico_24, trabajo_realizado_24, costo_reparacion_24, tecnico_responsable_24, estado_orden_24 } = req.body;
        // Validar estado_orden si se proporciona
        if (estado_orden_24) {
            const estadosValidos = ['PENDIENTE', 'EN_REPARACION', 'COMPLETADA', 'CANCELADA'];
            if (!estadosValidos.includes(estado_orden_24)) {
                res.status(400).json({
                    success: false,
                    error: `Estado de orden inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
                });
                return;
            }
        }
        const result = await pool.query(`UPDATE tbl_24_orden_trabajo 
       SET id_alternador_24 = COALESCE($1, id_alternador_24),
           id_maquina_retirado_24 = COALESCE($2, id_maquina_retirado_24),
           fecha_salida_taller_24 = COALESCE($3, fecha_salida_taller_24),
           diagnostico_24 = COALESCE($4, diagnostico_24),
           trabajo_realizado_24 = COALESCE($5, trabajo_realizado_24),
           costo_reparacion_24 = COALESCE($6, costo_reparacion_24),
           tecnico_responsable_24 = COALESCE($7, tecnico_responsable_24),
           estado_orden_24 = COALESCE($8, estado_orden_24)
       WHERE id_orden_24 = $9 
       RETURNING *`, [
            id_alternador_24,
            id_maquina_retirado_24,
            fecha_salida_taller_24,
            diagnostico_24?.trim(),
            trabajo_realizado_24?.trim(),
            costo_reparacion_24,
            tecnico_responsable_24?.trim(),
            estado_orden_24,
            id
        ]);
        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Orden de trabajo no encontrada'
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Orden de trabajo actualizada exitosamente'
        });
    }
    catch (error) {
        console.error('Error al actualizar orden de trabajo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la orden de trabajo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
/**
 * Eliminar una orden de trabajo
 */
export const deleteOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tbl_24_orden_trabajo WHERE id_orden_24 = $1 RETURNING id_orden_24', [id]);
        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Orden de trabajo no encontrada'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Orden de trabajo eliminada exitosamente'
        });
    }
    catch (error) {
        console.error('Error al eliminar orden de trabajo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la orden de trabajo',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
