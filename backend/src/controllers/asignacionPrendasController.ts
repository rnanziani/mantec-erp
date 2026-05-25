import { Request, Response } from 'express';
import { pool } from '../db.js';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  AsignacionPrenda,
  DetalleAsignacionPrenda,
  Prenda,
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
const TABLA_EMPRESA = 'tbl_15_empresas';

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
        am.idempresa_09,
        am.observaciones_09,
        COALESCE(am.entregado, false) as entregado,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
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
        am.idempresa_09,
        am.observaciones_09,
        COALESCE(am.entregado, false) as entregado,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
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
        COALESCE(ad.entregado_10, false) as entregado_10,
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
      idempresa_09,
      observaciones_09,
      entregado,
      detalles
    }: CreateAsignacionPrendaDTO = req.body;

    // Validaciones
    if (!idtrabajador_09 || !fecha_09 || !hora_09 || !idresponsableentrega_09 || !idempresa_09) {
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
      INSERT INTO ${TABLA_ASIGNACION} (idtrabajador_09, fecha_09, hora_09, idresponsableentrega_09, idempresa_09, observaciones_09, entregado)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING idasignacionmain_09
    `;

    const asignacionResult = await client.query(asignacionQuery, [
      idtrabajador_09,
      fecha_09,
      hora_09,
      idresponsableentrega_09,
      idempresa_09,
      observaciones_09 || null,
      entregado === true
    ]);

    const idAsignacion = asignacionResult.rows[0].idasignacionmain_09;

    // Insertar detalles
    for (const detalle of detalles) {
      const entregado = detalle.entregado_10 === true;
      const detalleQuery = `
        INSERT INTO ${TABLA_DETALLE} (idasignacionmain_10, idprenda_10, talla_10, cantidad_10, entregado_10)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(detalleQuery, [
        idAsignacion,
        detalle.idprenda_10,
        detalle.talla_10,
        detalle.cantidad_10,
        entregado
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
        am.idempresa_09,
        am.observaciones_09,
        COALESCE(am.entregado, false) as entregado,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
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
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al crear asignación:', error);
    const pgMessage = error instanceof Error ? error.message : 'Error desconocido';
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al crear la asignación',
      message: pgMessage
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
      idempresa_09,
      observaciones_09,
      entregado,
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
    if (idtrabajador_09 !== undefined || fecha_09 !== undefined || hora_09 !== undefined || idresponsableentrega_09 !== undefined || idempresa_09 !== undefined || observaciones_09 !== undefined || entregado !== undefined) {
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

      if (idempresa_09 !== undefined) {
        if (!idempresa_09) {
          await client.query('ROLLBACK');
          const response: ApiResponse<null> = {
            success: false,
            error: 'Empresa es requerida'
          };
          res.status(400).json(response);
          return;
        }
        updates.push(`idempresa_09 = $${paramCount}`);
        values.push(idempresa_09);
        paramCount++;
      }

      if (observaciones_09 !== undefined) {
        updates.push(`observaciones_09 = $${paramCount}`);
        values.push(observaciones_09 || null);
        paramCount++;
      }

      if (entregado !== undefined) {
        updates.push(`entregado = $${paramCount}`);
        values.push(entregado === true);
        paramCount++;
      }

      if (updates.length > 0) {
        values.push(id);
        const updateQuery = `
          UPDATE ${TABLA_ASIGNACION}
          SET ${updates.join(', ')}
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
        const entregado = detalle.entregado_10 === true;
        const detalleQuery = `
          INSERT INTO ${TABLA_DETALLE} (idasignacionmain_10, idprenda_10, talla_10, cantidad_10, entregado_10)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(detalleQuery, [
          id,
          detalle.idprenda_10,
          detalle.talla_10,
          detalle.cantidad_10,
          entregado
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
        am.idempresa_09,
        am.observaciones_09,
        COALESCE(am.entregado, false) as entregado,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
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
 * Obtener datos del Acta de Entrega para vista previa (JSON)
 */
export const getActaDatos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const asignacionQuery = `
      SELECT 
        am.idasignacionmain_09,
        am.fecha_09,
        am.hora_09,
        am.observaciones_09,
        t.nombre_06,
        t.apaterno_06,
        t.amaterno_06,
        t.ruttrabajador_06,
        c.cargo_14 as nombre_cargo,
        r.nombreresponsableentrega_08,
        r.apaternoresponsableentrega_08,
        r.amaternoresponsableentrega_08,
        e.nombreempresa_15 as empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
      WHERE am.idasignacionmain_09 = $1
    `;

    const asignacionResult = await pool.query(asignacionQuery, [id]);
    if (asignacionResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Asignación no encontrada' });
      return;
    }

    const asignacion = asignacionResult.rows[0];

    const detallesQuery = `
      SELECT ad.idprenda_10, ad.talla_10, ad.cantidad_10, COALESCE(ad.entregado_10, false) as entregado_10, p.prenda_07 as prenda_nombre
      FROM ${TABLA_DETALLE} ad
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      WHERE ad.idasignacionmain_10 = $1
      ORDER BY p.prenda_07
    `;
    const detallesResult = await pool.query(detallesQuery, [id]);
    const detalles = detallesResult.rows;

    const prendasAgrupadas = new Map<string, { prenda: string; cantidad: number; talla: string; entregado: boolean }>();
    detalles.forEach((d: { prenda_nombre: string; talla_10: string; cantidad_10: number; entregado_10: boolean }) => {
      const prenda = d.prenda_nombre || 'N/A';
      const talla = d.talla_10 || 'N/A';
      const entregado = d.entregado_10 === true;
      const key = `${prenda}__${talla}__${entregado}`;
      const actual = prendasAgrupadas.get(key);

      if (actual) {
        actual.cantidad += Number(d.cantidad_10 || 0);
      } else {
        prendasAgrupadas.set(key, {
          prenda,
          cantidad: Number(d.cantidad_10 || 0),
          talla,
          entregado
        });
      }
    });
    const filasPrendas = Array.from(prendasAgrupadas.values());

    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const fechaObj = new Date(asignacion.fecha_09);
    const dia = fechaObj.getDate();
    const mes = meses[fechaObj.getMonth()];
    const anio = fechaObj.getFullYear();

    const formatHora = (time: string): string => {
      if (!time) return '';
      const parts = String(time).split(':');
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
    };

    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const nombreTrabajador = `${asignacion.nombre_06 || ''} ${asignacion.apaterno_06 || ''} ${asignacion.amaterno_06 || ''}`.trim();
    const nombreResponsable = 'Ricardo Nuñez Anziani';

    const response: ApiResponse<object> = {
      success: true,
      data: {
        intro: { dia, mes, anio },
        trabajador: {
          nombre: nombreTrabajador,
          rut: asignacion.ruttrabajador_06 || '',
          cargo: asignacion.nombre_cargo || '',
          empresa: asignacion.empresa_nombre || ''
        },
        prendas: filasPrendas,
        observaciones: asignacion.observaciones_09 || null,
        responsable: {
          nombre: nombreResponsable,
          fecha: formatDate(asignacion.fecha_09),
          hora: formatHora(asignacion.hora_09)
        }
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error al obtener datos del acta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los datos del acta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Generar PDF del Acta de Entrega de Uniforme (SIG F-622-005)
 * Todo en una sola página, tabla de prendas dinámica según cantidad entregada
 */
export const generarActaEntregaPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const asignacionQuery = `
      SELECT 
        am.idasignacionmain_09,
        am.fecha_09,
        am.hora_09,
        am.observaciones_09,
        t.nombre_06,
        t.apaterno_06,
        t.amaterno_06,
        t.ruttrabajador_06,
        c.cargo_14 as nombre_cargo,
        r.nombreresponsableentrega_08,
        r.apaternoresponsableentrega_08,
        r.amaternoresponsableentrega_08,
        e.nombreempresa_15 as empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
      WHERE am.idasignacionmain_09 = $1
    `;

    const asignacionResult = await pool.query(asignacionQuery, [id]);
    if (asignacionResult.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Asignación no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    const asignacion = asignacionResult.rows[0];

    const detallesQuery = `
      SELECT 
        ad.idprenda_10,
        ad.talla_10,
        ad.cantidad_10,
        COALESCE(ad.entregado_10, false) as entregado_10,
        p.prenda_07 as prenda_nombre
      FROM ${TABLA_DETALLE} ad
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      WHERE ad.idasignacionmain_10 = $1
      ORDER BY p.prenda_07
    `;

    const detallesResult = await pool.query(detallesQuery, [id]);
    const detalles = detallesResult.rows;

    // Consolidar detalles: una línea por prenda+talla con cantidad total
    const prendasAgrupadas = new Map<string, { prenda: string; cantidad: number; talla: string; entregado: boolean }>();
    detalles.forEach((d: { prenda_nombre: string; talla_10: string; cantidad_10: number; entregado_10: boolean }) => {
      const prenda = d.prenda_nombre || 'N/A';
      const talla = d.talla_10 || 'N/A';
      const entregado = d.entregado_10 === true;
      const key = `${prenda}__${talla}__${entregado}`;
      const actual = prendasAgrupadas.get(key);

      if (actual) {
        actual.cantidad += Number(d.cantidad_10 || 0);
      } else {
        prendasAgrupadas.set(key, {
          prenda,
          cantidad: Number(d.cantidad_10 || 0),
          talla,
          entregado
        });
      }
    });
    const filasPrendas = Array.from(prendasAgrupadas.values());

    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatHora = (time: string): string => {
      if (!time) return '';
      const parts = time.split(':');
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
    };

    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const fechaObj = new Date(asignacion.fecha_09);
    const dia = fechaObj.getDate();
    const mes = meses[fechaObj.getMonth()];
    const anio = fechaObj.getFullYear();

    const nombreTrabajador = `${asignacion.nombre_06 || ''} ${asignacion.apaterno_06 || ''} ${asignacion.amaterno_06 || ''}`.trim();
    const nombreResponsable = 'Ricardo Nuñez Anziani';

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);

    const tableHeader = [
      { text: 'Item', style: 'tableHeader', alignment: 'center' },
      { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
      { text: 'Talla', style: 'tableHeader', alignment: 'center' },
      { text: 'Estado', style: 'tableHeader', alignment: 'center' },
      { text: 'Estado Entrega', style: 'tableHeader', alignment: 'center' }
    ];

    const tableBody: any[] = [tableHeader];

    filasPrendas.forEach((fila) => {
      tableBody.push([
        { text: fila.prenda, style: 'tableCell' },
        { text: String(fila.cantidad), style: 'tableCell', alignment: 'center' },
        { text: fila.talla, style: 'tableCell', alignment: 'center' },
        { text: 'Nuevo', style: 'tableCell', alignment: 'center' },
        { text: fila.entregado ? 'Entregado' : 'Pendiente', style: 'tableCell', alignment: 'center' }
      ]);
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'LETTER',
      pageMargins: [40, 30, 40, 30],
      content: [
        { text: 'ACTA DE ENTREGA DE CARGO', style: 'title', alignment: 'center', margin: [0, 0, 0, 4] },
        { text: 'SIG F-622-005 Versión 001', style: 'version', alignment: 'right', margin: [0, 0, 0, 8] },
        {
          text: `En la ciudad de Santiago, ${dia} días del mes de ${mes} del año ${anio}, se procede a dejar constancia de la entrega de cargo al trabajador que a continuación se detalla:`,
          style: 'intro',
          margin: [0, 0, 0, 10]
        },
        { text: 'Datos del Trabajador:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
        {
          columns: [
            { text: 'Nombre:', style: 'fieldLabel', width: 60 },
            { text: nombreTrabajador, style: 'fieldValue', width: '*' }
          ],
          margin: [0, 0, 0, 4]
        },
        {
          columns: [
            { text: 'Rut:', style: 'fieldLabel', width: 60 },
            { text: asignacion.ruttrabajador_06 || '', style: 'fieldValue', width: '*' }
          ],
          margin: [0, 0, 0, 4]
        },
        {
          columns: [
            { text: 'Cargo:', style: 'fieldLabel', width: 60 },
            { text: asignacion.nombre_cargo || '', style: 'fieldValue', width: '*' }
          ],
          margin: [0, 0, 0, 4]
        },
        {
          columns: [
            { text: 'Empresa:', style: 'fieldLabel', width: 60 },
            { text: asignacion.empresa_nombre || '', style: 'fieldValue', width: '*' }
          ],
          margin: [0, 0, 0, 10]
        },
        { text: 'Detalle de insumos entregados', style: 'sectionTitle', margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 55, 50, 50, 65],
            body: tableBody
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5
          },
          margin: [0, 0, 0, 10]
        },
        ...(asignacion.observaciones_09 ? [
          {
            columns: [
              { text: 'Observaciones:', style: 'fieldLabel', width: 80 },
              { text: asignacion.observaciones_09, style: 'fieldValue', width: '*' }
            ],
            margin: [0, 0, 0, 10]
          }
        ] : []),
        { text: 'Responsabilidades:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
        { text: 'Usted se compromete a', style: 'paragraph', margin: [0, 0, 0, 4] },
        {
          ul: [
            'Usar los insumos únicamente durante sus funciones laborales.',
            'Mantener los insumos en condiciones limpias y presentables.',
            'No alterar ni modificar los insumos entregados.',
            'Responder por el cuidado y conservación de los insumos entregados.',
            'Reportar inmediatamente cualquier daño o pérdida al área correspondiente.',
            'El mal uso o la negligencia en el cuidado de los insumos podrá ser objeto de observaciones o medidas disciplinarias conforme al reglamento interno.'
          ],
          style: 'listItem',
          margin: [0, 0, 0, 10]
        },
        { text: 'Uso de Insumos de Cargo:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
        {
          text: 'La empresa hace hincapié en la obligatoriedad del uso de los insumos de cargo durante todo el periodo de servicio activo. Su uso contribuye a:',
          style: 'paragraph',
          margin: [0, 0, 0, 6]
        },
        {
          ul: [
            'Proyectar una imagen profesional y ordenada de la empresa.',
            'Generar confianza en los pasajeros.',
            'Facilitar la identificación del personal por parte de usuarios.'
          ],
          style: 'listItem',
          margin: [0, 0, 0, 10]
        },
        { text: 'Declaración del Trabajador:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
        {
          text: 'Declaro haber recibido a conformidad los insumos antes detallados, los cuales se encuentran en buen estado y son de uso obligatorio durante mi jornada laboral. Asimismo, me comprometo a dar un uso adecuado y a conservarlos en buenas condiciones, haciéndome responsable de su cuidado.',
          style: 'paragraph',
          margin: [0, 0, 0, 10]
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: 'Firma', style: 'tableHeader', alignment: 'center' },
                { text: 'Huella', style: 'tableHeader', alignment: 'center' }
              ],
              [
                { text: '', style: 'tableCell', margin: [0, 25, 0, 0] },
                { text: '', style: 'tableCell', margin: [0, 25, 0, 0] }
              ]
            ]
          },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
          margin: [0, 0, 0, 12]
        },
        { text: 'Firma del encargado de Entrega', style: 'sectionTitle', margin: [0, 0, 0, 8] },
        {
          columns: [
            { text: 'Nombre: ' + nombreResponsable, style: 'field', width: '*' },
            { text: 'Fecha: ' + formatDate(asignacion.fecha_09) + ' ' + formatHora(asignacion.hora_09), style: 'field', width: 150 }
          ]
        }
      ],
      styles: {
        title: { fontSize: 14, bold: true },
        version: { fontSize: 8, color: '#666' },
        intro: { fontSize: 9 },
        fieldLabel: { fontSize: 9 },
        fieldValue: { fontSize: 9 },
        field: { fontSize: 9 },
        sectionTitle: { fontSize: 10, bold: true },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#e8e8e8' },
        tableCell: { fontSize: 8 },
        listItem: { fontSize: 8 },
        paragraph: { fontSize: 8 }
      },
      defaultStyle: { font: 'Roboto', fontSize: 9 }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=acta-entrega-cargo-${id}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error('Error al generar acta PDF:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al generar el acta de entrega',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener datos del reporte de asignaciones por intervalo de fechas, trabajador, prenda e ID de asignación
 * Query params: fechaDesde, fechaHasta, idTrabajador?, idPrenda?, idDesde?, idHasta? (rango de idasignacionmain_09)
 */
export const getReporteDatos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, idTrabajador, idPrenda, idDesde, idHasta } = req.query;

    if (!fechaDesde || !fechaHasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Los parámetros fechaDesde y fechaHasta son requeridos (formato YYYY-MM-DD)'
      };
      res.status(400).json(response);
      return;
    }

    const nd = idDesde !== undefined && idDesde !== '' ? Number(idDesde) : NaN;
    const nh = idHasta !== undefined && idHasta !== '' ? Number(idHasta) : NaN;
    if (!Number.isNaN(nd) && !Number.isNaN(nh) && nd > nh) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El ID inicial debe ser menor o igual al ID final'
      };
      res.status(400).json(response);
      return;
    }

    const params: (string | number)[] = [fechaDesde, fechaHasta];
    let paramIdx = 3;

    let whereClause = `WHERE am.fecha_09 >= $1::date AND am.fecha_09 <= $2::date`;
    if (idTrabajador) {
      whereClause += ` AND am.idtrabajador_09 = $${paramIdx}`;
      params.push(Number(idTrabajador));
      paramIdx++;
    }
    if (idPrenda) {
      whereClause += ` AND ad.idprenda_10 = $${paramIdx}`;
      params.push(Number(idPrenda));
      paramIdx++;
    }
    if (!Number.isNaN(nd)) {
      whereClause += ` AND am.idasignacionmain_09 >= $${paramIdx}`;
      params.push(nd);
      paramIdx++;
    }
    if (!Number.isNaN(nh)) {
      whereClause += ` AND am.idasignacionmain_09 <= $${paramIdx}`;
      params.push(nh);
      paramIdx++;
    }

    const query = `
      SELECT 
        am.idasignacionmain_09,
        am.fecha_09,
        am.hora_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        t.idtrabajador_06,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre,
        p.prenda_07 as prenda_nombre,
        p.idprenda_07,
        ad.talla_10,
        ad.cantidad_10,
        COALESCE(ad.entregado_10, false) as entregado_10
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
      INNER JOIN ${TABLA_DETALLE} ad ON am.idasignacionmain_09 = ad.idasignacionmain_10
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      ${whereClause}
      ORDER BY am.idasignacionmain_09 DESC, p.prenda_07 ASC
    `;

    const result = await pool.query(query, params);

    const response: ApiResponse<object[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener reporte:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener el reporte',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Inconsistencias: maestro (acta) marcado entregado pero con al menos una línea de detalle pendiente.
 * Devuelve solo filas de detalle pendientes de esas asignaciones.
 * Query params: fechaDesde, fechaHasta, idTrabajador?, idPrenda?, idDesde?, idHasta?
 */
export const getReporteInconsistenciaActaEntregadoDetallePendiente = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, idTrabajador, idPrenda, idDesde, idHasta } = req.query;

    if (!fechaDesde || !fechaHasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Los parámetros fechaDesde y fechaHasta son requeridos (formato YYYY-MM-DD)'
      };
      res.status(400).json(response);
      return;
    }

    const nd = idDesde !== undefined && idDesde !== '' ? Number(idDesde) : NaN;
    const nh = idHasta !== undefined && idHasta !== '' ? Number(idHasta) : NaN;
    if (!Number.isNaN(nd) && !Number.isNaN(nh) && nd > nh) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El ID inicial debe ser menor o igual al ID final'
      };
      res.status(400).json(response);
      return;
    }

    const params: (string | number)[] = [fechaDesde, fechaHasta];
    let paramIdx = 3;

    let whereClause = `WHERE am.fecha_09 >= $1::date AND am.fecha_09 <= $2::date
      AND COALESCE(am.entregado, false) = true
      AND COALESCE(ad.entregado_10, false) = false`;

    if (idTrabajador) {
      whereClause += ` AND am.idtrabajador_09 = $${paramIdx}`;
      params.push(Number(idTrabajador));
      paramIdx++;
    }
    if (idPrenda) {
      whereClause += ` AND ad.idprenda_10 = $${paramIdx}`;
      params.push(Number(idPrenda));
      paramIdx++;
    }
    if (!Number.isNaN(nd)) {
      whereClause += ` AND am.idasignacionmain_09 >= $${paramIdx}`;
      params.push(nd);
      paramIdx++;
    }
    if (!Number.isNaN(nh)) {
      whereClause += ` AND am.idasignacionmain_09 <= $${paramIdx}`;
      params.push(nh);
      paramIdx++;
    }

    const query = `
      SELECT 
        am.idasignacionmain_09,
        am.fecha_09,
        am.hora_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        t.idtrabajador_06,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre,
        p.prenda_07 as prenda_nombre,
        p.idprenda_07,
        ad.talla_10,
        ad.cantidad_10,
        COALESCE(ad.entregado_10, false) as entregado_10
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
      INNER JOIN ${TABLA_DETALLE} ad ON am.idasignacionmain_09 = ad.idasignacionmain_10
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      ${whereClause}
      ORDER BY am.idasignacionmain_09 DESC, p.prenda_07 ASC
    `;

    const result = await pool.query(query, params);

    const response: ApiResponse<object[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener reporte de inconsistencias acta/detalle:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener el reporte de inconsistencias',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Reporte maestro de asignaciones (solo tabla principal)
 * Query params: fechaDesde, fechaHasta, idTrabajador?, entregado? (true|false)
 */
export const getReporteMaestro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, idTrabajador, entregado } = req.query;

    if (!fechaDesde || !fechaHasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Los parámetros fechaDesde y fechaHasta son requeridos (formato YYYY-MM-DD)'
      };
      res.status(400).json(response);
      return;
    }

    const params: (string | number | boolean)[] = [fechaDesde, fechaHasta];
    let paramIdx = 3;

    let whereClause = `WHERE am.fecha_09 >= $1::date AND am.fecha_09 <= $2::date`;

    if (idTrabajador) {
      whereClause += ` AND am.idtrabajador_09 = $${paramIdx}`;
      params.push(Number(idTrabajador));
      paramIdx++;
    }

    if (entregado === 'true' || entregado === 'false') {
      whereClause += ` AND am.entregado = $${paramIdx}`;
      params.push(entregado === 'true');
      paramIdx++;
    }

    const query = `
      SELECT
        am.idasignacionmain_09,
        am.fecha_09,
        am.hora_09,
        am.idtrabajador_09,
        am.idresponsableentrega_09,
        am.idempresa_09,
        am.observaciones_09,
        COALESCE(am.entregado, false) AS entregado,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') AS trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') AS responsable_nombre,
        e.nombreempresa_15 AS empresa_nombre
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
      ${whereClause}
      ORDER BY am.idasignacionmain_09 DESC
    `;

    const result = await pool.query(query, params);

    const response: ApiResponse<object[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener reporte maestro:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener el reporte maestro',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Resumen agregado: suma de cantidades por tipo de prenda en el período
 * Query params: fechaDesde, fechaHasta, idTrabajador?, idPrenda?, idDesde?, idHasta?
 */
export const getReporteResumenPorPrenda = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, idTrabajador, idPrenda, idDesde, idHasta } = req.query;

    if (!fechaDesde || !fechaHasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Los parámetros fechaDesde y fechaHasta son requeridos (formato YYYY-MM-DD)'
      };
      res.status(400).json(response);
      return;
    }

    const nd = idDesde !== undefined && idDesde !== '' ? Number(idDesde) : NaN;
    const nh = idHasta !== undefined && idHasta !== '' ? Number(idHasta) : NaN;
    if (!Number.isNaN(nd) && !Number.isNaN(nh) && nd > nh) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El ID inicial debe ser menor o igual al ID final'
      };
      res.status(400).json(response);
      return;
    }

    const params: (string | number)[] = [fechaDesde, fechaHasta];
    let paramIdx = 3;

    let whereClause = `WHERE am.fecha_09 >= $1::date AND am.fecha_09 <= $2::date`;
    if (idTrabajador) {
      whereClause += ` AND am.idtrabajador_09 = $${paramIdx}`;
      params.push(Number(idTrabajador));
      paramIdx++;
    }
    if (idPrenda) {
      whereClause += ` AND ad.idprenda_10 = $${paramIdx}`;
      params.push(Number(idPrenda));
      paramIdx++;
    }
    if (!Number.isNaN(nd)) {
      whereClause += ` AND am.idasignacionmain_09 >= $${paramIdx}`;
      params.push(nd);
      paramIdx++;
    }
    if (!Number.isNaN(nh)) {
      whereClause += ` AND am.idasignacionmain_09 <= $${paramIdx}`;
      params.push(nh);
      paramIdx++;
    }

    const query = `
      SELECT
        p.idprenda_07,
        p.prenda_07 AS prenda_nombre,
        SUM(ad.cantidad_10)::bigint AS total_cantidad,
        COUNT(*)::int AS lineas_detalle
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_DETALLE} ad ON am.idasignacionmain_09 = ad.idasignacionmain_10
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      ${whereClause}
      GROUP BY p.idprenda_07, p.prenda_07
      ORDER BY p.prenda_07 ASC
    `;

    const result = await pool.query(query, params);

    const response: ApiResponse<object[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener resumen por prenda:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener el resumen por tipo de prenda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Generar PDF del reporte de asignaciones (formato carta, horizontal)
 * Query params: fechaDesde, fechaHasta, idTrabajador?, idPrenda?, idDesde?, idHasta?, usuario?
 */
export const generarReportePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, idTrabajador, idPrenda, idDesde, idHasta, usuario } = req.query;

    if (!fechaDesde || !fechaHasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Los parámetros fechaDesde y fechaHasta son requeridos'
      };
      res.status(400).json(response);
      return;
    }

    const nd = idDesde !== undefined && idDesde !== '' ? Number(idDesde) : NaN;
    const nh = idHasta !== undefined && idHasta !== '' ? Number(idHasta) : NaN;
    if (!Number.isNaN(nd) && !Number.isNaN(nh) && nd > nh) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'El ID inicial debe ser menor o igual al ID final'
      };
      res.status(400).json(response);
      return;
    }

    const params: (string | number)[] = [fechaDesde, fechaHasta];
    let paramIdx = 3;

    let whereClause = `WHERE am.fecha_09 >= $1::date AND am.fecha_09 <= $2::date`;
    if (idTrabajador) {
      whereClause += ` AND am.idtrabajador_09 = $${paramIdx}`;
      params.push(Number(idTrabajador));
      paramIdx++;
    }
    if (idPrenda) {
      whereClause += ` AND ad.idprenda_10 = $${paramIdx}`;
      params.push(Number(idPrenda));
      paramIdx++;
    }
    if (!Number.isNaN(nd)) {
      whereClause += ` AND am.idasignacionmain_09 >= $${paramIdx}`;
      params.push(nd);
      paramIdx++;
    }
    if (!Number.isNaN(nh)) {
      whereClause += ` AND am.idasignacionmain_09 <= $${paramIdx}`;
      params.push(nh);
      paramIdx++;
    }

    const query = `
      SELECT 
        am.idasignacionmain_09,
        am.fecha_09,
        am.hora_09,
        t.nombre_06 || ' ' || COALESCE(t.apaterno_06, '') || ' ' || COALESCE(t.amaterno_06, '') as trabajador_nombre,
        r.nombreresponsableentrega_08 || ' ' || COALESCE(r.apaternoresponsableentrega_08, '') || ' ' || COALESCE(r.amaternoresponsableentrega_08, '') as responsable_nombre,
        e.nombreempresa_15 as empresa_nombre,
        p.prenda_07 as prenda_nombre,
        ad.talla_10,
        ad.cantidad_10,
        COALESCE(ad.entregado_10, false) as entregado_10
      FROM ${TABLA_ASIGNACION} am
      INNER JOIN ${TABLA_TRABAJADOR} t ON am.idtrabajador_09 = t.idtrabajador_06
      INNER JOIN ${TABLA_RESPONSABLE} r ON am.idresponsableentrega_09 = r.idresponsableentrega_08
      LEFT JOIN ${TABLA_EMPRESA} e ON am.idempresa_09 = e.idempresa_15
      INNER JOIN ${TABLA_DETALLE} ad ON am.idasignacionmain_09 = ad.idasignacionmain_10
      INNER JOIN ${TABLA_PRENDA} p ON ad.idprenda_10 = p.idprenda_07
      ${whereClause}
      ORDER BY am.idasignacionmain_09 DESC, p.prenda_07 ASC
    `;

    const result = await pool.query(query, params);
    const filas = result.rows as Array<Record<string, unknown> & { idasignacionmain_09: number }>;

    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatHora = (time: string): string => {
      if (!time) return '';
      const parts = String(time).split(':');
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
    };

    const fechaHoraImpresion = new Date().toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tituloReporte = `REPORTE DE ASIGNACIÓN DE PRENDAS — ${fechaHoraImpresion}`;
    const stampArchivo = (() => {
      const d = new Date();
      const fecha = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      const hora = `${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}`;
      return `impresion_${fecha}_${hora}`;
    })();

    const subtituloRangoId =
      !Number.isNaN(nd) && !Number.isNaN(nh)
        ? `Rango de ID asignación: ${nd} – ${nh}`
        : !Number.isNaN(nd)
          ? `ID asignación desde: ${nd}`
          : !Number.isNaN(nh)
            ? `ID asignación hasta: ${nh}`
            : '';

    // Agrupar por asignación (maestro-detalle)
    const grupos = new Map<
      number,
      {
        maestro: Record<string, unknown>;
        detalles: Array<{ prenda_nombre: string; talla_10: string; cantidad_10: number; entregado_10: boolean }>;
      }
    >();
    filas.forEach((f) => {
      const id = f.idasignacionmain_09;
      if (!grupos.has(id)) {
        grupos.set(id, {
          maestro: f,
          detalles: []
        });
      }
      grupos.get(id)!.detalles.push({
        prenda_nombre: String(f.prenda_nombre || 'N/A'),
        talla_10: String(f.talla_10 || 'N/A'),
        cantidad_10: Number(f.cantidad_10 ?? 0),
        entregado_10: Boolean(f.entregado_10)
      });
    });

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);

    const tableHeaderRow = [
      { text: 'ID', style: 'tableHeader', alignment: 'center' },
      { text: 'Fecha', style: 'tableHeader', alignment: 'center' },
      { text: 'Hora', style: 'tableHeader', alignment: 'center' },
      { text: 'Trabajador', style: 'tableHeader', alignment: 'center' },
      { text: 'Prenda', style: 'tableHeader', alignment: 'center' },
      { text: 'Talla', style: 'tableHeader', alignment: 'center' },
      { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
      { text: 'Entregado', style: 'tableHeader', alignment: 'center' },
      { text: 'Responsable', style: 'tableHeader', alignment: 'center' },
      { text: 'Empresa', style: 'tableHeader', alignment: 'center' }
    ];

    const tableBody: any[] = [tableHeaderRow];

    Array.from(grupos.values())
      .sort((a, b) => Number(b.maestro.idasignacionmain_09) - Number(a.maestro.idasignacionmain_09))
      .forEach(({ maestro, detalles }) => {
      detalles.forEach((det, dIdx) => {
        if (dIdx === 0) {
          tableBody.push([
            { text: String(maestro.idasignacionmain_09 ?? ''), style: 'tableCell', alignment: 'center', fontSize: 8, rowSpan: detalles.length },
            { text: formatDate(maestro.fecha_09 as string), style: 'tableCell', fontSize: 8, rowSpan: detalles.length },
            { text: formatHora(maestro.hora_09 as string), style: 'tableCell', alignment: 'center', fontSize: 8, rowSpan: detalles.length },
            { text: String(maestro.trabajador_nombre || 'N/A'), style: 'tableCell', fontSize: 8, rowSpan: detalles.length },
            { text: det.prenda_nombre, style: 'tableCell', fontSize: 8 },
            { text: det.talla_10, style: 'tableCell', alignment: 'center', fontSize: 8 },
            { text: String(det.cantidad_10), style: 'tableCell', alignment: 'center', fontSize: 8 },
            { text: det.entregado_10 ? 'Verdadero' : 'Falso', style: 'tableCell', alignment: 'center', fontSize: 8 },
            { text: String(maestro.responsable_nombre || 'N/A'), style: 'tableCell', fontSize: 8, rowSpan: detalles.length },
            { text: String(maestro.empresa_nombre || 'N/A'), style: 'tableCell', fontSize: 8, rowSpan: detalles.length }
          ]);
        } else {
          // Celdas vacías para columnas con rowSpan (ID, Fecha, Hora, Trabajador, Responsable, Empresa)
          tableBody.push([
            '', '', '', '',
            { text: det.prenda_nombre, style: 'tableCell', fontSize: 8 },
            { text: det.talla_10, style: 'tableCell', alignment: 'center', fontSize: 8 },
            { text: String(det.cantidad_10), style: 'tableCell', alignment: 'center', fontSize: 8 },
            { text: det.entregado_10 ? 'Verdadero' : 'Falso', style: 'tableCell', alignment: 'center', fontSize: 8 },
            '', ''
          ]);
        }
      });
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'LETTER',
      pageOrientation: 'landscape',
      pageMargins: [30, 50, 30, 30],
      header: (currentPage: number) => (currentPage > 1 ? {
        stack: [
          { text: tituloReporte, style: 'title', alignment: 'center', margin: [0, 0, 0, 2] },
          { text: `Período: ${formatDate(fechaDesde as string)} - ${formatDate(fechaHasta as string)}`, style: 'subtitle', alignment: 'center', margin: [0, 0, 0, 2] },
          ...(subtituloRangoId
            ? [{ text: subtituloRangoId, style: 'subtitle', alignment: 'center', margin: [0, 0, 0, 2] }]
            : []),
          {
            columns: [
              { text: usuario ? `Usuario: ${String(usuario)}` : '', style: 'subtitle', width: '*' },
              { text: '', style: 'subtitle', width: 'auto' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: [32, 55, 35, '*', '*', 40, 45, 55, '*', '*'],
              body: [tableHeaderRow]
            },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 }
          }
        ],
        margin: [30, 5, 30, 0]
      } : {}),
      content: [
        {
          text: tituloReporte,
          style: 'title',
          alignment: 'center',
          margin: [0, 0, 0, 4]
        },
        {
          text: `Período: ${formatDate(fechaDesde as string)} - ${formatDate(fechaHasta as string)}`,
          style: 'subtitle',
          alignment: 'center',
          margin: [0, 0, 0, 4]
        },
        ...(subtituloRangoId
          ? [
              {
                text: subtituloRangoId,
                style: 'subtitle',
                alignment: 'center',
                margin: [0, 0, 0, 4]
              }
            ]
          : []),
        {
          columns: [
            { text: usuario ? `Usuario: ${String(usuario)}` : '', style: 'subtitle', width: '*' },
            { text: '', style: 'subtitle', width: 'auto' }
          ],
          margin: [0, 0, 0, 12]
        },
        {
          table: {
            headerRows: 1,
              widths: [32, 55, 35, '*', '*', 40, 45, 55, '*', '*'],
            body: tableBody
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5
          }
        }
      ],
      styles: {
        title: { fontSize: 14, bold: true },
        subtitle: { fontSize: 10, color: '#555' },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#e8e8e8' },
        tableCell: { fontSize: 8 }
      },
      defaultStyle: { font: 'Roboto', fontSize: 9 }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte-asignacion-prendas-${fechaDesde}-${fechaHasta}_${stampArchivo}.pdf`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al generar el reporte PDF',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
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

















































