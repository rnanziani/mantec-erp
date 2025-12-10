import { pool } from '../db.js';
// Tablas reales según el esquema de base de datos
const TABLA_ASIGNACION = 'tbl_12_productomain';
const TABLA_DETALLE = 'tbl_13_productodetail';
const TABLA_PRODUCTO = 'tbl_10_productoaseo';
const TABLA_MAQUINA = 'tbl_11_maquina';
const TABLA_TRABAJADOR = 'tbl_06_trabajador';
const TABLA_RESPONSABLE = 'tbl_08_responsable_entrega';
/**
 * Obtener todos los productos de aseo
 */
export const getAllProductos = async (req, res) => {
    try {
        const query = `
      SELECT 
        idproductoaseo_10 as id_producto,
        productoaseo_10 as nombre_producto,
        enuso_10 as activo,
        um_10 as unidad_medida
      FROM ${TABLA_PRODUCTO}
      WHERE enuso_10 = true
      ORDER BY productoaseo_10 ASC
    `;
        const result = await pool.query(query);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener productos:', error);
        const response = {
            success: false,
            error: 'Error al obtener los productos',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Crear un nuevo producto de aseo
 */
export const createProducto = async (req, res) => {
    try {
        const { nombre_producto, unidad_medida, activo, valor_por_defecto } = req.body;
        if (!nombre_producto || !unidad_medida) {
            const response = {
                success: false,
                error: 'El nombre del producto y la unidad de medida son requeridos'
            };
            res.status(400).json(response);
            return;
        }
        const query = `
      INSERT INTO ${TABLA_PRODUCTO} (productoaseo_10, um_10, enuso_10, valorpordefecto_10)
      VALUES ($1, $2, COALESCE($3, true), COALESCE($4, 0))
      RETURNING idproductoaseo_10 as id_producto, productoaseo_10 as nombre_producto, enuso_10 as activo, um_10 as unidad_medida
    `;
        const result = await pool.query(query, [
            nombre_producto,
            unidad_medida || 'UND',
            activo !== undefined ? activo : true,
            valor_por_defecto || 0
        ]);
        const response = {
            success: true,
            data: result.rows[0],
            message: 'Producto creado exitosamente'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error al crear producto:', error);
        const response = {
            success: false,
            error: 'Error al crear el producto',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Obtener todas las asignaciones con información completa
 */
export const getAllAsignaciones = async (req, res) => {
    try {
        const { patente, nombre, apellido } = req.query;
        let query = `
      SELECT 
        a.idproductomain_12 as id_asignacion,
        a.idmaquina_12 as id_maquina,
        a.idtrabajador_12 as id_trabajador,
        a.idresponsableentrega_12 as id_responsable,
        a.fecha_12 as fecha,
        a.hora_12 as hora,
        m.ppu_11 AS maquina_ppu,
        m.numinterno_11 AS maquina_numinterno,
        m.descripcion_11 AS maquina_descripcion,
        CONCAT(t.Nombre_06, ' ', t.aPaterno_06, ' ', t.aMaterno_06) AS trabajador_nombre,
        CONCAT(
          r.nombreresponsableentrega_08,
          CASE WHEN r.apaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.apaternoresponsableentrega_08 ELSE '' END,
          CASE WHEN r.amaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.amaternoresponsableentrega_08 ELSE '' END
        ) AS responsable_nombre
      FROM ${TABLA_ASIGNACION} a
      LEFT JOIN ${TABLA_MAQUINA} m ON a.idmaquina_12 = m.idmaquina_11
      LEFT JOIN ${TABLA_TRABAJADOR} t ON a.idtrabajador_12 = t.idTrabajador_06
      LEFT JOIN ${TABLA_RESPONSABLE} r ON a.idresponsableentrega_12 = r.idresponsableentrega_08
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;
        if (patente) {
            query += ` AND (m.ppu_11 ILIKE $${paramCount} OR m.numinterno_11 ILIKE $${paramCount})`;
            params.push(`%${patente}%`);
            paramCount++;
        }
        if (nombre) {
            query += ` AND t.Nombre_06 ILIKE $${paramCount}`;
            params.push(`%${nombre}%`);
            paramCount++;
        }
        if (apellido) {
            query += ` AND (t.aPaterno_06 ILIKE $${paramCount} OR t.aMaterno_06 ILIKE $${paramCount})`;
            params.push(`%${apellido}%`);
            paramCount++;
        }
        query += ` ORDER BY a.fecha_12 DESC, a.hora_12 DESC, a.idproductomain_12 DESC`;
        const result = await pool.query(query, params);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener asignaciones:', error);
        const response = {
            success: false,
            error: 'Error al obtener las asignaciones',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Obtener una asignación por ID
 */
export const getAsignacionById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        a.idproductomain_12 as id_asignacion,
        a.idmaquina_12 as id_maquina,
        a.idtrabajador_12 as id_trabajador,
        a.idresponsableentrega_12 as id_responsable,
        a.fecha_12 as fecha,
        a.hora_12 as hora,
        m.ppu_11 AS maquina_ppu,
        m.numinterno_11 AS maquina_numinterno,
        m.descripcion_11 AS maquina_descripcion,
        CONCAT(t.Nombre_06, ' ', t.aPaterno_06, ' ', t.aMaterno_06) AS trabajador_nombre,
        CONCAT(
          r.nombreresponsableentrega_08,
          CASE WHEN r.apaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.apaternoresponsableentrega_08 ELSE '' END,
          CASE WHEN r.amaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.amaternoresponsableentrega_08 ELSE '' END
        ) AS responsable_nombre
      FROM ${TABLA_ASIGNACION} a
      LEFT JOIN ${TABLA_MAQUINA} m ON a.idmaquina_12 = m.idmaquina_11
      LEFT JOIN ${TABLA_TRABAJADOR} t ON a.idtrabajador_12 = t.idTrabajador_06
      LEFT JOIN ${TABLA_RESPONSABLE} r ON a.idresponsableentrega_12 = r.idresponsableentrega_08
      WHERE a.idproductomain_12 = $1
    `;
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
            const response = {
                success: false,
                error: 'Asignación no encontrada'
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
        console.error('Error al obtener asignación:', error);
        const response = {
            success: false,
            error: 'Error al obtener la asignación',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Obtener detalles de una asignación
 */
export const getDetallesAsignacion = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        d.idproductodetail_13 as id_detalle,
        d.idproductomain_13 as id_asignacion,
        d.idproductoaseo_13 as id_producto,
        d.cantidad_13 as cantidad,
        p.productoaseo_10 AS producto_nombre
      FROM ${TABLA_DETALLE} d
      LEFT JOIN ${TABLA_PRODUCTO} p ON d.idproductoaseo_13 = p.idproductoaseo_10
      WHERE d.idproductomain_13 = $1
      ORDER BY p.productoaseo_10 ASC
    `;
        const result = await pool.query(query, [id]);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener detalles:', error);
        const response = {
            success: false,
            error: 'Error al obtener los detalles de la asignación',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Crear una nueva asignación con sus detalles
 */
export const createAsignacion = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id_maquina, id_trabajador, id_responsable, fecha, hora, detalles } = req.body;
        // Validaciones
        if (!id_maquina || !id_trabajador || !id_responsable || !fecha || !hora) {
            const response = {
                success: false,
                error: 'Todos los campos son requeridos'
            };
            res.status(400).json(response);
            return;
        }
        if (!detalles || detalles.length === 0) {
            const response = {
                success: false,
                error: 'Debe agregar al menos un producto'
            };
            res.status(400).json(response);
            return;
        }
        await client.query('BEGIN');
        // Insertar asignación
        const insertAsignacionQuery = `
      INSERT INTO ${TABLA_ASIGNACION} (idmaquina_12, idtrabajador_12, idresponsableentrega_12, fecha_12, hora_12)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING idproductomain_12
    `;
        const asignacionResult = await client.query(insertAsignacionQuery, [
            id_maquina,
            id_trabajador,
            id_responsable,
            fecha,
            hora
        ]);
        const idAsignacion = asignacionResult.rows[0].idproductomain_12;
        // Insertar detalles
        const insertDetalleQuery = `
      INSERT INTO ${TABLA_DETALLE} (idproductomain_13, idproductoaseo_13, cantidad_13)
      VALUES ($1, $2, $3)
    `;
        for (const detalle of detalles) {
            await client.query(insertDetalleQuery, [
                idAsignacion,
                detalle.id_producto,
                detalle.cantidad
            ]);
        }
        await client.query('COMMIT');
        // Obtener la asignación completa
        const asignacionQuery = `
      SELECT 
        a.idproductomain_12 as id_asignacion,
        a.idmaquina_12 as id_maquina,
        a.idtrabajador_12 as id_trabajador,
        a.idresponsableentrega_12 as id_responsable,
        a.fecha_12 as fecha,
        a.hora_12 as hora,
        m.ppu_11 AS maquina_ppu,
        m.numinterno_11 AS maquina_numinterno,
        m.descripcion_11 AS maquina_descripcion,
        CONCAT(t.Nombre_06, ' ', t.aPaterno_06, ' ', t.aMaterno_06) AS trabajador_nombre,
        CONCAT(
          r.nombreresponsableentrega_08,
          CASE WHEN r.apaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.apaternoresponsableentrega_08 ELSE '' END,
          CASE WHEN r.amaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.amaternoresponsableentrega_08 ELSE '' END
        ) AS responsable_nombre
      FROM ${TABLA_ASIGNACION} a
      LEFT JOIN ${TABLA_MAQUINA} m ON a.idmaquina_12 = m.idmaquina_11
      LEFT JOIN ${TABLA_TRABAJADOR} t ON a.idtrabajador_12 = t.idTrabajador_06
      LEFT JOIN ${TABLA_RESPONSABLE} r ON a.idresponsableentrega_12 = r.idresponsableentrega_08
      WHERE a.idproductomain_12 = $1
    `;
        const asignacionResultFinal = await client.query(asignacionQuery, [idAsignacion]);
        const response = {
            success: true,
            data: asignacionResultFinal.rows[0],
            message: 'Asignación creada exitosamente'
        };
        res.status(201).json(response);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear asignación:', error);
        const response = {
            success: false,
            error: 'Error al crear la asignación',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
    finally {
        client.release();
    }
};
/**
 * Actualizar una asignación
 */
export const updateAsignacion = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { id_maquina, id_trabajador, id_responsable, fecha, hora, detalles } = req.body;
        await client.query('BEGIN');
        // Actualizar asignación si hay campos para actualizar
        if (id_maquina || id_trabajador || id_responsable || fecha || hora) {
            const updates = [];
            const values = [];
            let paramCount = 1;
            if (id_maquina !== undefined) {
                updates.push(`idmaquina_12 = $${paramCount++}`);
                values.push(id_maquina);
            }
            if (id_trabajador !== undefined) {
                updates.push(`idtrabajador_12 = $${paramCount++}`);
                values.push(id_trabajador);
            }
            if (id_responsable !== undefined) {
                updates.push(`idresponsableentrega_12 = $${paramCount++}`);
                values.push(id_responsable);
            }
            if (fecha !== undefined) {
                updates.push(`fecha_12 = $${paramCount++}`);
                values.push(fecha);
            }
            if (hora !== undefined) {
                updates.push(`hora_12 = $${paramCount++}`);
                values.push(hora);
            }
            if (updates.length > 0) {
                values.push(id);
                const updateQuery = `
          UPDATE ${TABLA_ASIGNACION}
          SET ${updates.join(', ')}
          WHERE idproductomain_12 = $${paramCount}
        `;
                await client.query(updateQuery, values);
            }
        }
        // Si hay detalles, eliminar los anteriores y crear los nuevos
        if (detalles && detalles.length > 0) {
            // Eliminar detalles anteriores
            await client.query(`DELETE FROM ${TABLA_DETALLE} WHERE idproductomain_13 = $1`, [id]);
            // Insertar nuevos detalles
            const insertDetalleQuery = `
        INSERT INTO ${TABLA_DETALLE} (idproductomain_13, idproductoaseo_13, cantidad_13)
        VALUES ($1, $2, $3)
      `;
            for (const detalle of detalles) {
                await client.query(insertDetalleQuery, [id, detalle.id_producto, detalle.cantidad]);
            }
        }
        await client.query('COMMIT');
        // Obtener la asignación actualizada
        const asignacionQuery = `
      SELECT 
        a.idproductomain_12 as id_asignacion,
        a.idmaquina_12 as id_maquina,
        a.idtrabajador_12 as id_trabajador,
        a.idresponsableentrega_12 as id_responsable,
        a.fecha_12 as fecha,
        a.hora_12 as hora,
        m.ppu_11 AS maquina_ppu,
        m.numinterno_11 AS maquina_numinterno,
        m.descripcion_11 AS maquina_descripcion,
        CONCAT(t.Nombre_06, ' ', t.aPaterno_06, ' ', t.aMaterno_06) AS trabajador_nombre,
        CONCAT(
          r.nombreresponsableentrega_08,
          CASE WHEN r.apaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.apaternoresponsableentrega_08 ELSE '' END,
          CASE WHEN r.amaternoresponsableentrega_08 IS NOT NULL THEN ' ' || r.amaternoresponsableentrega_08 ELSE '' END
        ) AS responsable_nombre
      FROM ${TABLA_ASIGNACION} a
      LEFT JOIN ${TABLA_MAQUINA} m ON a.idmaquina_12 = m.idmaquina_11
      LEFT JOIN ${TABLA_TRABAJADOR} t ON a.idtrabajador_12 = t.idTrabajador_06
      LEFT JOIN ${TABLA_RESPONSABLE} r ON a.idresponsableentrega_12 = r.idresponsableentrega_08
      WHERE a.idproductomain_12 = $1
    `;
        const result = await client.query(asignacionQuery, [id]);
        const response = {
            success: true,
            data: result.rows[0],
            message: 'Asignación actualizada exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar asignación:', error);
        const response = {
            success: false,
            error: 'Error al actualizar la asignación',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
    finally {
        client.release();
    }
};
/**
 * Eliminar una asignación (cascada eliminará los detalles)
 */
export const deleteAsignacion = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        // Eliminar detalles primero
        await client.query(`DELETE FROM ${TABLA_DETALLE} WHERE idproductomain_13 = $1`, [id]);
        // Eliminar asignación
        const result = await client.query(`DELETE FROM ${TABLA_ASIGNACION} WHERE idproductomain_12 = $1 RETURNING idproductomain_12`, [id]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            const response = {
                success: false,
                error: 'Asignación no encontrada'
            };
            res.status(404).json(response);
            return;
        }
        await client.query('COMMIT');
        const response = {
            success: true,
            message: 'Asignación eliminada exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar asignación:', error);
        const response = {
            success: false,
            error: 'Error al eliminar la asignación',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
    finally {
        client.release();
    }
};
