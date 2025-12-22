import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  AsignacionPrenda,
  DetalleAsignacionPrenda,
  Prenda,
  Talla,
  CreateAsignacionPrendaDTO,
  UpdateAsignacionPrendaDTO,
  ApiResponse
} from '../types.js';

// Tablas según el esquema de base de datos
const TABLA_ASIGNACION = 'tbl_09_asignacion_main';
const TABLA_DETALLE = 'tbl_10_asignacion_detail';
const TABLA_TRABAJADOR = 'tbl_06_trabajador';
const TABLA_RESPONSABLE = 'tbl_08_responsable_entrega';
const TABLA_PRENDA = 'tbl_07_prenda';
const TABLA_TALLA = 'tbl_16_tallas';

/**
 * Obtener todas las asignaciones de prendas
 */
export const getAllAsignaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        am.idasignacionmain_09,
        am.idtrabajador_09,
        am.fecha_09,
        am.hora_09,
        am.idresponsableentrega_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      ORDER BY am.fecha_09 DESC, am.hora_09 DESC
    `;

    const result = await pool.query<AsignacionPrenda>(query);

    const response: ApiResponse<AsignacionPrenda[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    const response: ApiResponse<null> = {
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
export const getAsignacionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        am.idasignacionmain_09,
        am.idtrabajador_09,
        am.fecha_09,
        am.hora_09,
        am.idresponsableentrega_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      WHERE am.idasignacionmain_09 = $1
    `;

    const result = await pool.query<AsignacionPrenda>(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Asignación no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<AsignacionPrenda> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener asignación:', error);
    const response: ApiResponse<null> = {
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
export const getDetallesAsignacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ad.idasignaciondetail_10,
        ad.idasignacionmain_10,
        ad.idprenda_10,
        ad.talla_10,
        ad.cantidad_10,
        p.prenda_07 as prenda_nombre,
        COALESCE(t.talla_16, ad.talla_10::text) as talla_descripcion
      FROM ${TABLA_DETALLE} ad
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      LEFT JOIN ${TABLA_TALLA} t ON ad.talla_10 = t.talla_16
      WHERE ad.idasignacionmain_10 = $1
      ORDER BY p.prenda_07
    `;

    const result = await pool.query<DetalleAsignacionPrenda>(query, [id]);

    const response: ApiResponse<DetalleAsignacionPrenda[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener los detalles',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Crear una nueva asignación de prendas
 */
export const createAsignacion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      idtrabajador_09,
      fecha_09,
      hora_09,
      idresponsableentrega_09,
      detalles
    }: CreateAsignacionPrendaDTO = req.body;

    // Validaciones
    if (!idtrabajador_09 || !fecha_09 || !hora_09 || !idresponsableentrega_09) {
      await client.query('ROLLBACK');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Todos los campos de la asignación son requeridos'
      };
      res.status(400).json(response);
      return;
    }

    if (!detalles || detalles.length === 0) {
      await client.query('ROLLBACK');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Debe agregar al menos un detalle (prenda)'
      };
      res.status(400).json(response);
      return;
    }

    // Insertar asignación principal
    const asignacionQuery = `
      INSERT INTO ${TABLA_ASIGNACION} (idtrabajador_09, fecha_09, hora_09, idresponsableentrega_09)
      VALUES ($1, $2, $3, $4)
      RETURNING idasignacionmain_09
    `;

    const asignacionResult = await client.query(asignacionQuery, [
      idtrabajador_09,
      fecha_09,
      hora_09,
      idresponsableentrega_09
    ]);

    const idAsignacion = asignacionResult.rows[0].idasignacionmain_09;

    // Insertar detalles
    for (const detalle of detalles) {
      const detalleQuery = `
        INSERT INTO ${TABLA_DETALLE} (idasignacionmain_10, idprenda_10, talla_10, cantidad_10)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(detalleQuery, [
        idAsignacion,
        detalle.idprenda_10,
        detalle.talla_10,
        detalle.cantidad_10
      ]);
    }

    await client.query('COMMIT');

    // Obtener la asignación completa
    const asignacionCompletaQuery = `
      SELECT 
        am.idasignacionmain_09,
        am.idtrabajador_09,
        am.fecha_09,
        am.hora_09,
        am.idresponsableentrega_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      WHERE am.idasignacionmain_09 = $1
    `;

    const asignacionCompleta = await pool.query<AsignacionPrenda>(asignacionCompletaQuery, [idAsignacion]);

    const response: ApiResponse<AsignacionPrenda> = {
      success: true,
      data: asignacionCompleta.rows[0],
      message: 'Asignación creada exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear asignación:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al crear la asignación',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  } finally {
    client.release();
  }
};

/**
 * Actualizar una asignación de prendas
 */
export const updateAsignacion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      idtrabajador_09,
      fecha_09,
      hora_09,
      idresponsableentrega_09,
      detalles
    }: UpdateAsignacionPrendaDTO = req.body;

    // Verificar que la asignación existe
    const checkQuery = `SELECT idasignacionmain_09 FROM ${TABLA_ASIGNACION} WHERE idasignacionmain_09 = $1`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Asignación no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    // Actualizar asignación principal si se proporcionan campos
    if (idtrabajador_09 || fecha_09 || hora_09 || idresponsableentrega_09) {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (idtrabajador_09 !== undefined) {
        updates.push(`idtrabajador_09 = $${paramCount}`);
        values.push(idtrabajador_09);
        paramCount++;
      }

      if (fecha_09 !== undefined) {
        updates.push(`fecha_09 = $${paramCount}`);
        values.push(fecha_09);
        paramCount++;
      }

      if (hora_09 !== undefined) {
        updates.push(`hora_09 = $${paramCount}`);
        values.push(hora_09);
        paramCount++;
      }

      if (idresponsableentrega_09 !== undefined) {
        updates.push(`idresponsableentrega_09 = $${paramCount}`);
        values.push(idresponsableentrega_09);
        paramCount++;
      }

      if (updates.length > 0) {
        values.push(id);
        const updateQuery = `
          UPDATE ${TABLA_ASIGNACION}
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE idasignacionmain_09 = $${paramCount}
        `;
        await client.query(updateQuery, values);
      }
    }

    // Si se proporcionan detalles, eliminar los existentes y crear nuevos
    if (detalles && detalles.length > 0) {
      // Eliminar detalles existentes
      await client.query(`DELETE FROM ${TABLA_DETALLE} WHERE idasignacionmain_10 = $1`, [id]);

      // Insertar nuevos detalles
      for (const detalle of detalles) {
        const detalleQuery = `
          INSERT INTO ${TABLA_DETALLE} (idasignacionmain_10, idprenda_10, talla_10, cantidad_10)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(detalleQuery, [
          id,
          detalle.idprenda_10,
          detalle.talla_10,
          detalle.cantidad_10
        ]);
      }
    }

    await client.query('COMMIT');

    // Obtener la asignación actualizada
    const asignacionQuery = `
      SELECT 
        am.idasignacionmain_09,
        am.idtrabajador_09,
        am.fecha_09,
        am.hora_09,
        am.idresponsableentrega_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      WHERE am.idasignacionmain_09 = $1
    `;

    const asignacionResult = await client.query<AsignacionPrenda>(asignacionQuery, [id]);

    const response: ApiResponse<AsignacionPrenda> = {
      success: true,
      data: asignacionResult.rows[0],
      message: 'Asignación actualizada exitosamente'
    };

    res.json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar asignación:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al actualizar la asignación',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  } finally {
    client.release();
  }
};

/**
 * Eliminar una asignación de prendas
 */
export const deleteAsignacion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar que la asignación existe
    const checkQuery = `SELECT idasignacionmain_09 FROM ${TABLA_ASIGNACION} WHERE idasignacionmain_09 = $1`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Asignación no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    // Eliminar detalles primero
    await client.query(`DELETE FROM ${TABLA_DETALLE} WHERE idasignacionmain_10 = $1`, [id]);

    // Eliminar asignación principal
    await client.query(`DELETE FROM ${TABLA_ASIGNACION} WHERE idasignacionmain_09 = $1`, [id]);

    await client.query('COMMIT');

    const response: ApiResponse<null> = {
      success: true,
      message: 'Asignación eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar asignación:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al eliminar la asignación',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  } finally {
    client.release();
  }
};

/**
 * Obtener todas las prendas
 */
export const getAllPrendas = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT idprenda_07, prenda_07
      FROM ${TABLA_PRENDA}
      ORDER BY prenda_07 ASC
    `;

    const result = await pool.query<Prenda>(query);

    const response: ApiResponse<Prenda[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener prendas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las prendas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener todas las tallas
 */
export const getAllTallas = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT id_16, talla_16, tipo_16
      FROM ${TABLA_TALLA}
      ORDER BY tipo_16, talla_16 ASC
    `;

    const result = await pool.query<Talla>(query);

    const response: ApiResponse<Talla[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener tallas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las tallas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

























