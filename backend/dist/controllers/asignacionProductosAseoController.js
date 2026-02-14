import { pool } from '../db.js';
import PdfPrinter from 'pdfmake';
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
        idproductoaseo_10,
        productoaseo_10,
        um_10,
        enuso_10,
        valorpordefecto_10,
        orden_10
      FROM ${TABLA_PRODUCTO}
      ORDER BY COALESCE(orden_10, 999999) ASC, productoaseo_10 ASC
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
        const { productoaseo_10, um_10, enuso_10, valorpordefecto_10, orden_10 } = req.body;
        if (!productoaseo_10 || !um_10) {
            const response = {
                success: false,
                error: 'El nombre del producto y la unidad de medida son requeridos'
            };
            res.status(400).json(response);
            return;
        }
        const query = `
      INSERT INTO ${TABLA_PRODUCTO} (productoaseo_10, um_10, enuso_10, valorpordefecto_10, orden_10)
      VALUES ($1, $2, COALESCE($3, true), COALESCE($4, 0), $5)
      RETURNING idproductoaseo_10, productoaseo_10, um_10, enuso_10, valorpordefecto_10, orden_10
    `;
        const result = await pool.query(query, [
            productoaseo_10.trim(),
            um_10.trim(),
            enuso_10 !== undefined ? enuso_10 : true,
            valorpordefecto_10 !== undefined ? valorpordefecto_10 : 0,
            orden_10 !== undefined ? orden_10 : null
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
 * Obtener un producto de aseo por ID
 */
export const getProductoById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        idproductoaseo_10,
        productoaseo_10,
        um_10,
        enuso_10,
        valorpordefecto_10,
        orden_10
      FROM ${TABLA_PRODUCTO}
      WHERE idproductoaseo_10 = $1
    `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Producto no encontrado'
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
        console.error('Error al obtener producto:', error);
        const response = {
            success: false,
            error: 'Error al obtener el producto',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Actualizar un producto de aseo
 */
export const updateProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { productoaseo_10, um_10, enuso_10, valorpordefecto_10, orden_10 } = req.body;
        // Verificar que el producto existe
        const checkQuery = `SELECT idproductoaseo_10 FROM ${TABLA_PRODUCTO} WHERE idproductoaseo_10 = $1`;
        const checkResult = await pool.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            const response = {
                success: false,
                error: 'Producto no encontrado'
            };
            res.status(404).json(response);
            return;
        }
        // Construir la query dinámicamente basada en los campos proporcionados
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (productoaseo_10 !== undefined) {
            updates.push(`productoaseo_10 = $${paramCount}`);
            values.push(productoaseo_10.trim());
            paramCount++;
        }
        if (um_10 !== undefined) {
            updates.push(`um_10 = $${paramCount}`);
            values.push(um_10.trim());
            paramCount++;
        }
        if (enuso_10 !== undefined) {
            updates.push(`enuso_10 = $${paramCount}`);
            values.push(enuso_10);
            paramCount++;
        }
        if (valorpordefecto_10 !== undefined) {
            updates.push(`valorpordefecto_10 = $${paramCount}`);
            values.push(valorpordefecto_10);
            paramCount++;
        }
        if (orden_10 !== undefined) {
            updates.push(`orden_10 = $${paramCount}`);
            values.push(orden_10);
            paramCount++;
        }
        if (updates.length === 0) {
            const response = {
                success: false,
                error: 'No se proporcionaron campos para actualizar'
            };
            res.status(400).json(response);
            return;
        }
        values.push(id);
        const query = `
      UPDATE ${TABLA_PRODUCTO}
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE idproductoaseo_10 = $${paramCount}
      RETURNING idproductoaseo_10, productoaseo_10, um_10, enuso_10, valorpordefecto_10, orden_10
    `;
        const result = await pool.query(query, values);
        const response = {
            success: true,
            data: result.rows[0],
            message: 'Producto actualizado exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al actualizar producto:', error);
        const response = {
            success: false,
            error: 'Error al actualizar el producto',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Eliminar un producto de aseo
 */
export const deleteProducto = async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar que el producto existe
        const checkQuery = `SELECT idproductoaseo_10 FROM ${TABLA_PRODUCTO} WHERE idproductoaseo_10 = $1`;
        const checkResult = await pool.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            const response = {
                success: false,
                error: 'Producto no encontrado'
            };
            res.status(404).json(response);
            return;
        }
        // Verificar si el producto está siendo usado en asignaciones
        const checkUsageQuery = `
      SELECT COUNT(*) as count
      FROM ${TABLA_DETALLE}
      WHERE idproductoaseo_13 = $1
    `;
        const usageResult = await pool.query(checkUsageQuery, [id]);
        if (parseInt(usageResult.rows[0].count) > 0) {
            const response = {
                success: false,
                error: 'No se puede eliminar el producto porque está siendo usado en asignaciones'
            };
            res.status(400).json(response);
            return;
        }
        const query = `DELETE FROM ${TABLA_PRODUCTO} WHERE idproductoaseo_10 = $1`;
        await pool.query(query, [id]);
        const response = {
            success: true,
            message: 'Producto eliminado exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al eliminar producto:', error);
        const response = {
            success: false,
            error: 'Error al eliminar el producto',
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
      ORDER BY COALESCE(p.orden_10, 999999) ASC, p.productoaseo_10 ASC
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
/**
 * Obtener datos del reporte de entregas (para vista previa)
 */
export const getReporteDatos = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, patente, id_trabajador, id_producto } = req.query;
        // Validar que las fechas sean requeridas
        if (!fecha_desde || !fecha_hasta) {
            const response = {
                success: false,
                error: 'Las fechas desde y hasta son requeridas'
            };
            res.status(400).json(response);
            return;
        }
        // Construir la consulta SQL (misma que en generarReportePDF)
        let query = `
      SELECT 
        pm.fecha_12,
        pm.hora_12,
        m.ppu_11,
        CONCAT(
          re.nombreresponsableentrega_08,
          CASE WHEN re.apaternoresponsableentrega_08 IS NOT NULL THEN ' ' || re.apaternoresponsableentrega_08 ELSE '' END,
          CASE WHEN re.amaternoresponsableentrega_08 IS NOT NULL THEN ' ' || re.amaternoresponsableentrega_08 ELSE '' END
        ) AS responsable,
        CONCAT(
          t.nombre_06,
          CASE WHEN t.apaterno_06 IS NOT NULL THEN ' ' || t.apaterno_06 ELSE '' END,
          CASE WHEN t.amaterno_06 IS NOT NULL THEN ' ' || t.amaterno_06 ELSE '' END
        ) AS trabajador,
        pa.productoaseo_10,
        pd.cantidad_13
      FROM ${TABLA_ASIGNACION} pm
      INNER JOIN ${TABLA_MAQUINA} m ON pm.idmaquina_12 = m.idmaquina_11
      INNER JOIN ${TABLA_TRABAJADOR} t ON pm.idtrabajador_12 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} re ON pm.idresponsableentrega_12 = re.idresponsableentrega_08
      INNER JOIN ${TABLA_DETALLE} pd ON pm.idproductomain_12 = pd.idproductomain_13
      INNER JOIN ${TABLA_PRODUCTO} pa ON pd.idproductoaseo_13 = pa.idproductoaseo_10
      WHERE pm.fecha_12 >= $1 AND pm.fecha_12 <= $2
    `;
        const params = [fecha_desde, fecha_hasta];
        let paramCount = 3;
        // Agregar filtros opcionales
        if (patente) {
            query += ` AND m.ppu_11 = $${paramCount}`;
            params.push(patente);
            paramCount++;
        }
        if (id_trabajador) {
            query += ` AND pm.idtrabajador_12 = $${paramCount}`;
            params.push(parseInt(id_trabajador));
            paramCount++;
        }
        if (id_producto) {
            query += ` AND pd.idproductoaseo_13 = $${paramCount}`;
            params.push(parseInt(id_producto));
            paramCount++;
        }
        query += ` ORDER BY pm.fecha_12 DESC, pm.hora_12 DESC, m.ppu_11, re.nombreresponsableentrega_08, pa.productoaseo_10`;
        // Ejecutar consulta
        const result = await pool.query(query, params);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener datos del reporte:', error);
        const response = {
            success: false,
            error: 'Error al obtener los datos del reporte',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
/**
 * Generar reporte PDF de entregas de productos de aseo
 */
export const generarReportePDF = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, patente, id_trabajador, id_producto } = req.query;
        // Validar que las fechas sean requeridas
        if (!fecha_desde || !fecha_hasta) {
            const response = {
                success: false,
                error: 'Las fechas desde y hasta son requeridas'
            };
            res.status(400).json(response);
            return;
        }
        // Construir la consulta SQL
        let query = `
      SELECT 
        pm.fecha_12,
        pm.hora_12,
        m.ppu_11,
        CONCAT(
          re.nombreresponsableentrega_08,
          CASE WHEN re.apaternoresponsableentrega_08 IS NOT NULL THEN ' ' || re.apaternoresponsableentrega_08 ELSE '' END,
          CASE WHEN re.amaternoresponsableentrega_08 IS NOT NULL THEN ' ' || re.amaternoresponsableentrega_08 ELSE '' END
        ) AS responsable,
        CONCAT(
          t.nombre_06,
          CASE WHEN t.apaterno_06 IS NOT NULL THEN ' ' || t.apaterno_06 ELSE '' END,
          CASE WHEN t.amaterno_06 IS NOT NULL THEN ' ' || t.amaterno_06 ELSE '' END
        ) AS trabajador,
        pa.productoaseo_10,
        pd.cantidad_13
      FROM ${TABLA_ASIGNACION} pm
      INNER JOIN ${TABLA_MAQUINA} m ON pm.idmaquina_12 = m.idmaquina_11
      INNER JOIN ${TABLA_TRABAJADOR} t ON pm.idtrabajador_12 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} re ON pm.idresponsableentrega_12 = re.idresponsableentrega_08
      INNER JOIN ${TABLA_DETALLE} pd ON pm.idproductomain_12 = pd.idproductomain_13
      INNER JOIN ${TABLA_PRODUCTO} pa ON pd.idproductoaseo_13 = pa.idproductoaseo_10
      WHERE pm.fecha_12 >= $1 AND pm.fecha_12 <= $2
    `;
        const params = [fecha_desde, fecha_hasta];
        let paramCount = 3;
        // Agregar filtros opcionales
        if (patente) {
            query += ` AND m.ppu_11 = $${paramCount}`;
            params.push(patente);
            paramCount++;
        }
        if (id_trabajador) {
            query += ` AND pm.idtrabajador_12 = $${paramCount}`;
            params.push(parseInt(id_trabajador));
            paramCount++;
        }
        if (id_producto) {
            query += ` AND pd.idproductoaseo_13 = $${paramCount}`;
            params.push(parseInt(id_producto));
            paramCount++;
        }
        query += ` ORDER BY pm.fecha_12 DESC, pm.hora_12 DESC, m.ppu_11, re.nombreresponsableentrega_08, pa.productoaseo_10`;
        // Ejecutar consulta
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'No hay datos para generar el reporte'
            };
            res.status(404).json(response);
            return;
        }
        // Configurar fuentes para pdfmake
        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        const printer = new PdfPrinter(fonts);
        // Formatear fecha
        const formatDate = (date) => {
            const d = typeof date === 'string' ? new Date(date) : date;
            return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        // Formatear hora
        const formatTime = (time) => {
            if (!time)
                return 'N/A';
            const parts = time.split(':');
            if (parts.length >= 2) {
                return `${parts[0]}:${parts[1]}`;
            }
            return time;
        };
        // Preparar datos de la tabla
        const tableBody = [
            [
                { text: 'Fecha', style: 'tableHeader', alignment: 'center' },
                { text: 'Hora', style: 'tableHeader', alignment: 'center' },
                { text: 'Patente', style: 'tableHeader', alignment: 'center' },
                { text: 'Responsable', style: 'tableHeader', alignment: 'center' },
                { text: 'Trabajador', style: 'tableHeader', alignment: 'center' },
                { text: 'Producto', style: 'tableHeader', alignment: 'center' },
                { text: 'Cantidad', style: 'tableHeader', alignment: 'center' }
            ]
        ];
        // Agregar filas de datos
        result.rows.forEach((row, index) => {
            const backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
            tableBody.push([
                { text: formatDate(row.fecha_12), style: 'tableCell', fillColor: backgroundColor, alignment: 'center' },
                { text: formatTime(row.hora_12), style: 'tableCell', fillColor: backgroundColor, alignment: 'center' },
                { text: row.ppu_11 || 'N/A', style: 'tableCell', fillColor: backgroundColor, alignment: 'center' },
                { text: row.responsable || 'N/A', style: 'tableCell', fillColor: backgroundColor },
                { text: row.trabajador || 'N/A', style: 'tableCell', fillColor: backgroundColor },
                { text: row.productoaseo_10 || 'N/A', style: 'tableCell', fillColor: backgroundColor },
                { text: parseFloat(row.cantidad_13).toFixed(0), style: 'tableCell', fillColor: backgroundColor, alignment: 'right' }
            ]);
        });
        // Obtener información de filtros aplicados
        const filtrosAplicados = [];
        filtrosAplicados.push(`Período: ${formatDate(fecha_desde)} - ${formatDate(fecha_hasta)}`);
        if (patente) {
            filtrosAplicados.push(`Patente: ${patente}`);
        }
        else {
            filtrosAplicados.push('Patente: TODAS');
        }
        if (id_trabajador) {
            const trabajadorResult = await pool.query(`SELECT nombre_06, apaterno_06, amaterno_06 FROM ${TABLA_TRABAJADOR} WHERE idtrabajador_06 = $1`, [id_trabajador]);
            if (trabajadorResult.rows.length > 0) {
                const t = trabajadorResult.rows[0];
                filtrosAplicados.push(`Recibe: ${t.nombre_06} ${t.apaterno_06 || ''} ${t.amaterno_06 || ''}`);
            }
        }
        else {
            filtrosAplicados.push('Recibe: TODOS');
        }
        if (id_producto) {
            const productoResult = await pool.query(`SELECT productoaseo_10 FROM ${TABLA_PRODUCTO} WHERE idproductoaseo_10 = $1`, [id_producto]);
            if (productoResult.rows.length > 0) {
                filtrosAplicados.push(`Insumo: ${productoResult.rows[0].productoaseo_10}`);
            }
        }
        else {
            filtrosAplicados.push('Insumo: TODOS');
        }
        // Definir el documento PDF
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            pageMargins: [40, 60, 40, 60],
            header: {
                text: 'REPORTE DE ENTREGAS PRODUCTO MAIN',
                style: 'headerTitle',
                alignment: 'center',
                margin: [0, 20, 0, 20]
            },
            content: [
                {
                    text: `Fecha de generación: ${formatDate(new Date())} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
                    style: 'footer',
                    margin: [0, 0, 0, 10]
                },
                {
                    text: filtrosAplicados.join(' | '),
                    style: 'footer',
                    margin: [0, 0, 0, 10]
                },
                {
                    text: `Total de registros: ${result.rows.length}`,
                    style: 'footer',
                    margin: [0, 0, 0, 20],
                    bold: true
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [70, 50, 80, '*', '*', '*', 60],
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            return i === 0 || i === node.table.body.length ? 1 : 0.5;
                        },
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#cccccc',
                        vLineColor: () => '#cccccc',
                        paddingLeft: () => 5,
                        paddingRight: () => 5,
                        paddingTop: () => 3,
                        paddingBottom: () => 3
                    }
                }
            ],
            styles: {
                headerTitle: {
                    fontSize: 18,
                    bold: true,
                    color: '#1a1a1a'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 9,
                    color: '#ffffff',
                    fillColor: '#34495e',
                    alignment: 'center'
                },
                tableCell: {
                    fontSize: 8,
                    color: '#333333'
                },
                footer: {
                    fontSize: 9,
                    color: '#666666'
                }
            },
            defaultStyle: {
                font: 'Roboto',
                fontSize: 10
            }
        };
        // Generar PDF
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        // Configurar headers para descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-entregas-${fecha_desde}-${fecha_hasta}.pdf`);
        // Enviar PDF
        pdfDoc.pipe(res);
        pdfDoc.end();
    }
    catch (error) {
        console.error('Error al generar reporte PDF:', error);
        const response = {
            success: false,
            error: 'Error al generar el reporte PDF',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
