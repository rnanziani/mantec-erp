import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Transaccion, CreateTransaccionDTO, UpdateTransaccionDTO, ApiResponse } from '../types.js';
import PdfPrinter from 'pdfmake';
import type { PdfDocumentDefinition } from '../utils/pdfTypes.js';

/**
 * Obtener todas las transacciones con información de alternador, marca, ubicación y tipo
 */
export const getAllTransacciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        t.id_transaccion_28,
        t.id_alternador_28,
        t.id_ubicacion_origen_28,
        t.id_ubicacion_destino_28,
        t.id_tipo_transaccion_28,
        t.id_tecnico_28,
        t.id_maquina_28,
        t.fecha_28,
        t.hora_28,
        t.created_at,
        t.updated_at,
        a.cod_alternador_19,
        m.marca_18,
        uo.descripcion_27 AS ubicacion_origen_descripcion,
        ud.descripcion_27 AS ubicacion_destino_descripcion,
        tt.descripcion_25 AS tipo_descripcion,
        tt.cod_accion_25 AS tipo_codigo,
        tt.valor_accion_25 AS valor_accion,
        CONCAT(tec.nombres_21, ' ', tec.a_paterno_21, ' ', tec.a_materno_21) AS tecnico_nombre,
        maq.numinterno_11 AS maquina_numinterno,
        maq.ppu_11 AS maquina_ppu,
        tc.tipo_comp_alternador_30 AS tipo_comp_descripcion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion uo ON t.id_ubicacion_origen_28 = uo.id_ubicacion_27
      INNER JOIN tbl_27_ubicacion ud ON t.id_ubicacion_destino_28 = ud.id_ubicacion_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      LEFT JOIN tbl_21_tecnico tec ON t.id_tecnico_28 = tec.id_tecnico_21
      LEFT JOIN tbl_11_maquina maq ON t.id_maquina_28 = maq.idmaquina_11
      LEFT JOIN tbl_30_tipo_comp_alternador tc ON a.id_tipo_comp_alternador_19 = tc.id_tipo_comp_alternador_30
      ORDER BY t.fecha_28 DESC, t.hora_28 DESC, t.id_transaccion_28 DESC
    `;

    const result = await pool.query<Transaccion>(query);

    const response: ApiResponse<Transaccion[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las transacciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener transacción por ID
 */
export const getTransaccionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        t.id_transaccion_28,
        t.id_alternador_28,
        t.id_ubicacion_origen_28,
        t.id_ubicacion_destino_28,
        t.id_tipo_transaccion_28,
        t.id_tecnico_28,
        t.id_maquina_28,
        t.fecha_28,
        t.hora_28,
        t.created_at,
        t.updated_at,
        a.cod_alternador_19,
        m.marca_18,
        uo.descripcion_27 AS ubicacion_origen_descripcion,
        ud.descripcion_27 AS ubicacion_destino_descripcion,
        tt.descripcion_25 AS tipo_descripcion,
        tt.cod_accion_25 AS tipo_codigo,
        tt.valor_accion_25 AS valor_accion,
        CONCAT(tec.nombres_21, ' ', tec.a_paterno_21, ' ', tec.a_materno_21) AS tecnico_nombre,
        maq.numinterno_11 AS maquina_numinterno,
        maq.ppu_11 AS maquina_ppu,
        tc.tipo_comp_alternador_30 AS tipo_comp_descripcion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion uo ON t.id_ubicacion_origen_28 = uo.id_ubicacion_27
      INNER JOIN tbl_27_ubicacion ud ON t.id_ubicacion_destino_28 = ud.id_ubicacion_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      LEFT JOIN tbl_21_tecnico tec ON t.id_tecnico_28 = tec.id_tecnico_21
      LEFT JOIN tbl_11_maquina maq ON t.id_maquina_28 = maq.idmaquina_11
      LEFT JOIN tbl_30_tipo_comp_alternador tc ON a.id_tipo_comp_alternador_19 = tc.id_tipo_comp_alternador_30
      WHERE t.id_transaccion_28 = $1
    `;

    const result = await pool.query<Transaccion>(query, [id]);

    if (result.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Transacción no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Transaccion> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener transacción:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener la transacción',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Crear una nueva transacción
 * NOTA: Esto debería actualizar automáticamente la existencia mediante un trigger en la BD
 */
export const createTransaccion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      id_alternador_28, 
      id_ubicacion_origen_28, 
      id_ubicacion_destino_28, 
      id_tipo_transaccion_28,
      id_tecnico_28,
      id_maquina_28,
      fecha_28, 
      hora_28 
    }: CreateTransaccionDTO = req.body;

    // Validación
    if (!id_alternador_28 || !id_ubicacion_origen_28 || !id_ubicacion_destino_28 || !id_tipo_transaccion_28) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'id_alternador_28, id_ubicacion_origen_28, id_ubicacion_destino_28 e id_tipo_transaccion_28 son requeridos'
      };
      res.status(400).json(response);
      return;
    }

    // Validar que origen y destino sean diferentes
    if (id_ubicacion_origen_28 === id_ubicacion_destino_28) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'La ubicación de origen y destino deben ser diferentes'
      };
      res.status(400).json(response);
      return;
    }

    // Usar fecha y hora proporcionadas o valores por defecto
    const fecha = fecha_28 || new Date().toISOString().split('T')[0];
    const hora = hora_28 || new Date().toTimeString().split(' ')[0].substring(0, 5);

    const query = `
      INSERT INTO tbl_28_transaccion (
        id_alternador_28, 
        id_ubicacion_origen_28, 
        id_ubicacion_destino_28, 
        id_tipo_transaccion_28,
        id_tecnico_28,
        id_maquina_28,
        fecha_28, 
        hora_28
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query<Transaccion>(query, [
      id_alternador_28,
      id_ubicacion_origen_28,
      id_ubicacion_destino_28,
      id_tipo_transaccion_28,
      id_tecnico_28 || null,
      id_maquina_28 || null,
      fecha,
      hora
    ]);

    const response: ApiResponse<Transaccion> = {
      success: true,
      data: result.rows[0],
      message: 'Transacción creada exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al crear transacción:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al crear la transacción',
      message: msg
    };
    res.status(500).json(response);
  }
};

/**
 * Actualizar una transacción existente
 */
export const updateTransaccion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      id_alternador_28, 
      id_ubicacion_origen_28, 
      id_ubicacion_destino_28, 
      id_tipo_transaccion_28,
      id_tecnico_28,
      id_maquina_28,
      fecha_28, 
      hora_28 
    }: UpdateTransaccionDTO = req.body;

    // Validar que origen y destino sean diferentes si ambos están presentes
    if (id_ubicacion_origen_28 !== undefined && id_ubicacion_destino_28 !== undefined) {
      if (id_ubicacion_origen_28 === id_ubicacion_destino_28) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'La ubicación de origen y destino deben ser diferentes'
        };
        res.status(400).json(response);
        return;
      }
    }

    // Construir query dinámicamente según los campos proporcionados
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (id_alternador_28 !== undefined) {
      updates.push(`id_alternador_28 = $${paramCount++}`);
      values.push(id_alternador_28);
    }
    if (id_ubicacion_origen_28 !== undefined) {
      updates.push(`id_ubicacion_origen_28 = $${paramCount++}`);
      values.push(id_ubicacion_origen_28);
    }
    if (id_ubicacion_destino_28 !== undefined) {
      updates.push(`id_ubicacion_destino_28 = $${paramCount++}`);
      values.push(id_ubicacion_destino_28);
    }
    if (id_tipo_transaccion_28 !== undefined) {
      updates.push(`id_tipo_transaccion_28 = $${paramCount++}`);
      values.push(id_tipo_transaccion_28);
    }
    if (id_tecnico_28 !== undefined) {
      updates.push(`id_tecnico_28 = $${paramCount++}`);
      values.push(id_tecnico_28 || null);
    }
    if (id_maquina_28 !== undefined) {
      updates.push(`id_maquina_28 = $${paramCount++}`);
      values.push(id_maquina_28 || null);
    }
    if (fecha_28 !== undefined) {
      updates.push(`fecha_28 = $${paramCount++}`);
      values.push(fecha_28);
    }
    if (hora_28 !== undefined) {
      updates.push(`hora_28 = $${paramCount++}`);
      values.push(hora_28);
    }

    if (updates.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No se proporcionaron campos para actualizar'
      };
      res.status(400).json(response);
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tbl_28_transaccion
      SET ${updates.join(', ')}
      WHERE id_transaccion_28 = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query<Transaccion>(query, values);

    if (result.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Transacción no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Transaccion> = {
      success: true,
      data: result.rows[0],
      message: 'Transacción actualizada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al actualizar transacción:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al actualizar la transacción',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Eliminar una transacción
 */
export const deleteTransaccion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_28_transaccion WHERE id_transaccion_28 = $1 RETURNING id_transaccion_28',
      [id]
    );

    if (result.rowCount === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Transacción no encontrada'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Transacción eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al eliminar la transacción',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener transacciones filtradas para reporte
 */
export const getTransaccionesFiltradas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha_desde, fecha_hasta, id_tipo_transaccion, id_marca, id_destino, id_maquina, id_alternador } = req.query;

    // Validar que las fechas sean requeridas
    if (!fecha_desde || !fecha_hasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Las fechas desde y hasta son requeridas'
      };
      res.status(400).json(response);
      return;
    }

    // Construir query con filtros dinámicos
    let query = `
      SELECT 
        t.id_transaccion_28,
        t.id_alternador_28,
        t.id_ubicacion_origen_28,
        t.id_ubicacion_destino_28,
        t.id_tipo_transaccion_28,
        t.id_tecnico_28,
        t.id_maquina_28,
        t.fecha_28,
        t.hora_28,
        t.created_at,
        t.updated_at,
        a.cod_alternador_19,
        m.marca_18,
        uo.descripcion_27 AS ubicacion_origen_descripcion,
        ud.descripcion_27 AS ubicacion_destino_descripcion,
        tt.descripcion_25 AS tipo_descripcion,
        tt.cod_accion_25 AS tipo_codigo,
        tt.valor_accion_25 AS valor_accion,
        CONCAT(tec.nombres_21, ' ', tec.a_paterno_21, ' ', tec.a_materno_21) AS tecnico_nombre,
        maq.numinterno_11 AS maquina_numinterno,
        maq.ppu_11 AS maquina_ppu
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion uo ON t.id_ubicacion_origen_28 = uo.id_ubicacion_27
      INNER JOIN tbl_27_ubicacion ud ON t.id_ubicacion_destino_28 = ud.id_ubicacion_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      LEFT JOIN tbl_21_tecnico tec ON t.id_tecnico_28 = tec.id_tecnico_21
      LEFT JOIN tbl_11_maquina maq ON t.id_maquina_28 = maq.idmaquina_11
      WHERE t.fecha_28 >= $1 AND t.fecha_28 <= $2
    `;

    const params: any[] = [fecha_desde, fecha_hasta];
    let paramCount = 3;

    // Agregar filtros opcionales
    if (id_tipo_transaccion) {
      query += ` AND t.id_tipo_transaccion_28 = $${paramCount++}`;
      params.push(id_tipo_transaccion);
    }

    if (id_marca) {
      query += ` AND a.id_marca_19 = $${paramCount++}`;
      params.push(id_marca);
    }

    if (id_destino) {
      query += ` AND t.id_ubicacion_destino_28 = $${paramCount++}`;
      params.push(id_destino);
    }

    if (id_maquina) {
      query += ` AND t.id_maquina_28 = $${paramCount++}`;
      params.push(id_maquina);
    }

    if (id_alternador) {
      query += ` AND t.id_alternador_28 = $${paramCount++}`;
      params.push(id_alternador);
    }

    query += ` ORDER BY t.fecha_28 DESC, t.hora_28 DESC, t.id_transaccion_28 DESC`;

    const result = await pool.query<Transaccion>(query, params);

    const response: ApiResponse<Transaccion[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener transacciones filtradas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las transacciones filtradas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Generar reporte PDF de transacciones
 */
export const generarReportePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha_desde, fecha_hasta, id_tipo_transaccion, id_marca, id_destino, id_maquina, id_alternador } = req.query;

    // Validar que las fechas sean requeridas
    if (!fecha_desde || !fecha_hasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Las fechas desde y hasta son requeridas'
      };
      res.status(400).json(response);
      return;
    }

    // Obtener transacciones filtradas
    let query = `
      SELECT 
        t.id_transaccion_28,
        t.id_alternador_28,
        t.id_ubicacion_origen_28,
        t.id_ubicacion_destino_28,
        t.id_tipo_transaccion_28,
        t.id_tecnico_28,
        t.id_maquina_28,
        t.fecha_28,
        t.hora_28,
        a.cod_alternador_19,
        m.marca_18,
        uo.descripcion_27 AS ubicacion_origen_descripcion,
        ud.descripcion_27 AS ubicacion_destino_descripcion,
        tt.descripcion_25 AS tipo_descripcion,
        tt.cod_accion_25 AS tipo_codigo,
        tt.valor_accion_25 AS valor_accion,
        CONCAT(tec.nombres_21, ' ', tec.a_paterno_21, ' ', tec.a_materno_21) AS tecnico_nombre,
        maq.numinterno_11 AS maquina_numinterno,
        maq.ppu_11 AS maquina_ppu,
        tc.tipo_comp_alternador_30 AS tipo_comp_descripcion
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion uo ON t.id_ubicacion_origen_28 = uo.id_ubicacion_27
      INNER JOIN tbl_27_ubicacion ud ON t.id_ubicacion_destino_28 = ud.id_ubicacion_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      LEFT JOIN tbl_21_tecnico tec ON t.id_tecnico_28 = tec.id_tecnico_21
      LEFT JOIN tbl_11_maquina maq ON t.id_maquina_28 = maq.idmaquina_11
      LEFT JOIN tbl_30_tipo_comp_alternador tc ON a.id_tipo_comp_alternador_19 = tc.id_tipo_comp_alternador_30
      WHERE t.fecha_28 >= $1 AND t.fecha_28 <= $2
    `;

    const params: any[] = [fecha_desde, fecha_hasta];
    let paramCount = 3;

    // Agregar filtros opcionales
    if (id_tipo_transaccion) {
      query += ` AND t.id_tipo_transaccion_28 = $${paramCount++}`;
      params.push(id_tipo_transaccion);
    }

    if (id_marca) {
      query += ` AND a.id_marca_19 = $${paramCount++}`;
      params.push(id_marca);
    }

    if (id_destino) {
      query += ` AND t.id_ubicacion_destino_28 = $${paramCount++}`;
      params.push(id_destino);
    }

    if (id_maquina) {
      query += ` AND t.id_maquina_28 = $${paramCount++}`;
      params.push(id_maquina);
    }

    if (id_alternador) {
      query += ` AND t.id_alternador_28 = $${paramCount++}`;
      params.push(id_alternador);
    }

    query += ` ORDER BY t.fecha_28 DESC, t.hora_28 DESC, t.id_transaccion_28 DESC`;

    const result = await pool.query<Transaccion>(query, params);
    const transacciones = result.rows;

    // Obtener información de filtros aplicados para el reporte
    let filtrosAplicados: string[] = [];
    if (id_alternador) {
      const altResult = await pool.query('SELECT a.cod_alternador_19, m.marca_18 FROM tbl_19_alternador a LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18 WHERE a.id_alternador_19 = $1', [id_alternador]);
      if (altResult.rows.length > 0) {
        const row = altResult.rows[0];
        filtrosAplicados.push(`Alternador: ${row.cod_alternador_19 || ''} - ${row.marca_18 || 'Sin marca'}`);
      }
    }
    if (id_tipo_transaccion) {
      const tipoResult = await pool.query('SELECT descripcion_25 FROM tbl_25_tipo_transaccion WHERE id_tipo_transaccion_25 = $1', [id_tipo_transaccion]);
      if (tipoResult.rows.length > 0) {
        filtrosAplicados.push(`Tipo: ${tipoResult.rows[0].descripcion_25}`);
      }
    }
    if (id_marca) {
      const marcaResult = await pool.query('SELECT marca_18 FROM tbl_18_marca_alternador WHERE id_marca_18 = $1', [id_marca]);
      if (marcaResult.rows.length > 0) {
        filtrosAplicados.push(`Marca: ${marcaResult.rows[0].marca_18}`);
      }
    }
    if (id_destino) {
      const destinoResult = await pool.query('SELECT descripcion_27 FROM tbl_27_ubicacion WHERE id_ubicacion_27 = $1', [id_destino]);
      if (destinoResult.rows.length > 0) {
        filtrosAplicados.push(`Destino: ${destinoResult.rows[0].descripcion_27}`);
      }
    }
    if (id_maquina) {
      const maquinaResult = await pool.query('SELECT numinterno_11, ppu_11 FROM tbl_11_maquina WHERE idmaquina_11 = $1', [id_maquina]);
      if (maquinaResult.rows.length > 0) {
        filtrosAplicados.push(`Máquina: ${maquinaResult.rows[0].numinterno_11} (${maquinaResult.rows[0].ppu_11})`);
      }
    }

    // Configurar fuentes para pdfmake (usando fuentes estándar del sistema)
    // Para usar fuentes personalizadas, necesitarías cargar archivos .ttf
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
    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Preparar datos de la tabla
    const tableBody: any[] = [
      [
        { text: 'ID', style: 'tableHeader', alignment: 'center' },
        { text: 'Fecha', style: 'tableHeader', alignment: 'center' },
        { text: 'Hora', style: 'tableHeader', alignment: 'center' },
        { text: 'Alternador', style: 'tableHeader', alignment: 'center' },
        { text: 'Marca', style: 'tableHeader', alignment: 'left' },
        { text: 'Origen', style: 'tableHeader', alignment: 'left' },
        { text: 'Destino', style: 'tableHeader', alignment: 'left' },
        { text: 'Tipo', style: 'tableHeader', alignment: 'left' },
        { text: 'Técnico', style: 'tableHeader', alignment: 'left' },
        { text: 'Máquina', style: 'tableHeader', alignment: 'left' }
      ]
    ];

    transacciones.forEach((t) => {
      tableBody.push([
        { text: t.id_transaccion_28.toString(), style: 'tableCell', alignment: 'center' },
        { text: formatDate(t.fecha_28), style: 'tableCell', alignment: 'center' },
        { text: t.hora_28 || 'N/A', style: 'tableCell', alignment: 'center' },
        { text: t.cod_alternador_19 || 'N/A', style: 'tableCell', alignment: 'center' },
        { text: t.marca_18 || 'N/A', style: 'tableCell', alignment: 'left' },
        { text: t.ubicacion_origen_descripcion || 'N/A', style: 'tableCell', alignment: 'left' },
        { text: t.ubicacion_destino_descripcion || 'N/A', style: 'tableCell', alignment: 'left' },
        { text: t.tipo_descripcion || 'N/A', style: 'tableCell', alignment: 'left' },
        { text: t.tecnico_nombre || 'N/A', style: 'tableCell', alignment: 'left' },
        { text: t.maquina_numinterno ? `${t.maquina_numinterno}${t.maquina_ppu ? ` (${t.maquina_ppu})` : ''}` : 'N/A', style: 'tableCell', alignment: 'left' }
      ]);
    });

    // Definir el documento PDF
    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 120, 40, 60], // Margen izquierdo reducido 50% (40 -> 20)
      header: {
        margin: [20, 20, 40, 0], // Margen izquierdo reducido 50% (40 -> 20)
        columns: [
          {
            width: 100,
            // Espacio reservado para el logo (100x100 puntos)
            // Para agregar un logo, reemplaza este objeto con:
            // { image: 'ruta/al/logo.png', fit: [100, 100], alignment: 'left' }
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 100,
                h: 100,
                color: '#f0f0f0',
                lineColor: '#cccccc',
                lineWidth: 1
              }
            ],
            alignment: 'left'
          },
          {
            width: '*',
            text: 'REPORTE DE MOVIMIENTOS DE INVENTARIO',
            style: 'headerTitle',
            alignment: 'center',
            margin: [0, 30, 0, 0]
          }
        ]
      },
      content: [
        // Información del reporte
        {
          text: 'INFORMACIÓN DEL REPORTE',
          style: 'sectionTitle',
          margin: [0, 0, 0, 10]
        },
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Período: ', bold: true },
                { text: `${formatDate(fecha_desde as string)} - ${formatDate(fecha_hasta as string)}` }
              ],
              margin: [0, 0, 0, 5]
            },
            {
              width: '*',
              text: [
                { text: 'Fecha de generación: ', bold: true },
                { text: formatDate(new Date()) }
              ],
              alignment: 'right',
              margin: [0, 0, 0, 5]
            }
          ],
          margin: [0, 0, 0, 10]
        },
        // Filtros aplicados
        ...(filtrosAplicados.length > 0 ? [{
          text: [
            { text: 'Filtros aplicados: ', bold: true },
            { text: filtrosAplicados.join(' | ') }
          ],
          margin: [0, 0, 0, 15] as [number, number, number, number]
        }] : []),
        // Resumen
        {
          text: [
            { text: 'Total de transacciones: ', bold: true },
            { text: transacciones.length.toString(), bold: true, color: '#007bff' }
          ],
          margin: [0, 0, 0, 15] as [number, number, number, number]
        },
        // Tabla de transacciones
        {
          text: 'DETALLE DE TRANSACCIONES',
          style: 'sectionTitle',
          margin: [0, 20, 0, 10] as [number, number, number, number]
        },
        {
          table: {
            headerRows: 1,
            // ID, Fecha, Hora, Alternador, Marca, Origen, Destino, Tipo, Técnico, Máquina, Impacto
            // Fecha: 10% menos adicional (54 -> 49)
            // Hora: 10% menos adicional (39 -> 35)
            // Alternador: 10% menos adicional (54 -> 49)
            // Marca: 10% menos adicional (68 -> 61)
            // Origen: 10% menos adicional (43 -> 39)
            // Destino: 10% menos adicional (43 -> 39)
            // Máquina: 50% menos (130 -> 65), luego 30% menos adicional (65 -> 45), luego 10% más (45 -> 50), luego 10% más adicional (50 -> 55)
            // Técnico: 20% menos (150 -> 120), luego 10% más (120 -> 132)
            // Columna Impacto eliminada
            widths: [50, 49, 35, 49, 61, 39, 39, 162, 132, 55],
            body: tableBody
          },
          layout: {
            hLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.widths.length ? 1 : 0.5;
            },
            hLineColor: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? '#333333' : '#cccccc';
            },
            vLineColor: function (i: number, node: any) {
              return i === 0 || i === node.table.widths.length ? '#333333' : '#cccccc';
            },
            paddingLeft: function (i: number) {
              return i === 0 ? 5 : 5;
            },
            paddingRight: function (i: number, node: any) {
              return i === node.table.widths.length - 1 ? 5 : 5;
            },
            paddingTop: function () {
              return 5;
            },
            paddingBottom: function () {
              return 5;
            }
          }
        }
      ],
      footer: function (currentPage: number, pageCount: number) {
        return {
          margin: [20, 10, 40, 0], // Margen izquierdo reducido 50% (40 -> 20)
          text: [
            { text: 'Página ', style: 'footer' },
            { text: currentPage.toString(), style: 'footer' },
            { text: ' de ', style: 'footer' },
            { text: pageCount.toString(), style: 'footer' }
          ],
          alignment: 'center',
          fontSize: 9,
          color: '#666666'
        };
      },
      styles: {
        headerTitle: {
          fontSize: 18,
          bold: true,
          color: '#1a1a1a'
        },
        sectionTitle: {
          fontSize: 14,
          bold: true,
          color: '#2c3e50',
          margin: [0, 10, 0, 10]
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
    res.setHeader('Content-Disposition', `attachment; filename=reporte-transacciones-${fecha_desde}-${fecha_hasta}.pdf`);

    // Enviar PDF
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
 * Generar reporte PDF de cantidad de componentes
 */
export const generarReporteCantidadComponentesPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha_desde, fecha_hasta, id_tipo_transaccion, id_marca, id_destino, id_maquina, id_tipo_comp_alternador, id_alternador } = req.query;

    // Validar que las fechas sean requeridas
    if (!fecha_desde || !fecha_hasta) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Las fechas desde y hasta son requeridas'
      };
      res.status(400).json(response);
      return;
    }

    // Query para obtener cantidad de componentes agrupados por tipo de componente
    let query = `
      SELECT 
        COALESCE(tc.tipo_comp_alternador_30, 'Sin tipo') AS tipo_componente,
        COUNT(DISTINCT t.id_alternador_28) AS cantidad_alternadores,
        COUNT(t.id_transaccion_28) AS cantidad_transacciones,
        SUM(CASE WHEN tt.valor_accion_25 = 1 THEN 1 ELSE 0 END) AS entradas,
        SUM(CASE WHEN tt.valor_accion_25 = -1 THEN 1 ELSE 0 END) AS salidas
      FROM tbl_28_transaccion t
      INNER JOIN tbl_19_alternador a ON t.id_alternador_28 = a.id_alternador_19
      LEFT JOIN tbl_30_tipo_comp_alternador tc ON a.id_tipo_comp_alternador_19 = tc.id_tipo_comp_alternador_30
      LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
      INNER JOIN tbl_27_ubicacion ud ON t.id_ubicacion_destino_28 = ud.id_ubicacion_27
      INNER JOIN tbl_25_tipo_transaccion tt ON t.id_tipo_transaccion_28 = tt.id_tipo_transaccion_25
      LEFT JOIN tbl_11_maquina maq ON t.id_maquina_28 = maq.idmaquina_11
      WHERE t.fecha_28 >= $1 AND t.fecha_28 <= $2
    `;

    const params: any[] = [fecha_desde, fecha_hasta];
    let paramCount = 3;

    // Aplicar filtros opcionales
    if (id_tipo_transaccion) {
      query += ` AND t.id_tipo_transaccion_28 = $${paramCount}`;
      params.push(id_tipo_transaccion);
      paramCount++;
    }

    if (id_marca) {
      query += ` AND a.id_marca_19 = $${paramCount}`;
      params.push(id_marca);
      paramCount++;
    }

    if (id_destino) {
      query += ` AND t.id_ubicacion_destino_28 = $${paramCount}`;
      params.push(id_destino);
      paramCount++;
    }

    if (id_maquina) {
      query += ` AND t.id_maquina_28 = $${paramCount}`;
      params.push(id_maquina);
      paramCount++;
    }

    if (id_tipo_comp_alternador) {
      const tipoCompId = parseInt(id_tipo_comp_alternador as string);
      query += ` AND a.id_tipo_comp_alternador_19 = $${paramCount}`;
      params.push(tipoCompId);
      paramCount++;
    }

    if (id_alternador) {
      query += ` AND t.id_alternador_28 = $${paramCount}`;
      params.push(id_alternador);
      paramCount++;
    }

    query += ` GROUP BY tc.tipo_comp_alternador_30, tc.id_tipo_comp_alternador_30 ORDER BY tc.tipo_comp_alternador_30`;

    // Log para depuración
    console.log('=== REPORTE CANTIDAD COMPONENTES ===');
    console.log('Query:', query);
    console.log('Params:', params);
    console.log('Filtro tipo componente:', id_tipo_comp_alternador);

    const result = await pool.query(query, params);
    const datos = result.rows;

    // Log para depuración
    console.log('Resultados encontrados:', datos.length);
    if (datos.length > 0) {
      console.log('Primeros datos:', datos[0]);
    } else {
      console.log('⚠️ No se encontraron resultados con los filtros aplicados');
    }

    // Construir filtros aplicados para mostrar en el reporte
    const filtrosAplicados: string[] = [];
    if (id_alternador) {
      const altResult = await pool.query('SELECT a.cod_alternador_19, m.marca_18 FROM tbl_19_alternador a LEFT JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18 WHERE a.id_alternador_19 = $1', [id_alternador]);
      if (altResult.rows.length > 0) {
        const row = altResult.rows[0];
        filtrosAplicados.push(`Componente: ${row.cod_alternador_19 || ''} - ${row.marca_18 || 'Sin marca'}`);
      }
    }
    if (id_tipo_transaccion) {
      const tipoResult = await pool.query('SELECT descripcion_25 FROM tbl_25_tipo_transaccion WHERE id_tipo_transaccion_25 = $1', [id_tipo_transaccion]);
      if (tipoResult.rows.length > 0) {
        filtrosAplicados.push(`Tipo: ${tipoResult.rows[0].descripcion_25}`);
      }
    }
    if (id_marca) {
      const marcaResult = await pool.query('SELECT marca_18 FROM tbl_18_marca_alternador WHERE id_marca_18 = $1', [id_marca]);
      if (marcaResult.rows.length > 0) {
        filtrosAplicados.push(`Marca: ${marcaResult.rows[0].marca_18}`);
      }
    }
    if (id_destino) {
      const destinoResult = await pool.query('SELECT descripcion_27 FROM tbl_27_ubicacion WHERE id_ubicacion_27 = $1', [id_destino]);
      if (destinoResult.rows.length > 0) {
        filtrosAplicados.push(`Destino: ${destinoResult.rows[0].descripcion_27}`);
      }
    }
    if (id_maquina) {
      const maquinaResult = await pool.query('SELECT numinterno_11, ppu_11 FROM tbl_11_maquina WHERE idmaquina_11 = $1', [id_maquina]);
      if (maquinaResult.rows.length > 0) {
        filtrosAplicados.push(`Máquina: ${maquinaResult.rows[0].numinterno_11} - ${maquinaResult.rows[0].ppu_11}`);
      }
    }
    if (id_tipo_comp_alternador) {
      const tipoCompResult = await pool.query('SELECT tipo_comp_alternador_30 FROM tbl_30_tipo_comp_alternador WHERE id_tipo_comp_alternador_30 = $1', [id_tipo_comp_alternador]);
      if (tipoCompResult.rows.length > 0) {
        filtrosAplicados.push(`Tipo Componente: ${tipoCompResult.rows[0].tipo_comp_alternador_30}`);
      }
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
    const formatDate = (date: string): string => {
      const d = new Date(date);
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Preparar datos de la tabla
    const tableBody: any[] = [
      [
        { text: 'TIPO COMPONENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'CANT. ALTERNADORES', style: 'tableHeader', alignment: 'center' },
        { text: 'CANT. TRANSACCIONES', style: 'tableHeader', alignment: 'center' },
        { text: 'ENTRADAS', style: 'tableHeader', alignment: 'center' },
        { text: 'SALIDAS', style: 'tableHeader', alignment: 'center' }
      ]
    ];

    let totalAlternadores = 0;
    let totalTransacciones = 0;
    let totalEntradas = 0;
    let totalSalidas = 0;

    if (datos.length === 0) {
      // Si no hay datos, agregar un mensaje informativo
      tableBody.push([
        { text: 'No se encontraron transacciones con los filtros aplicados', style: 'tableCell', alignment: 'center', colSpan: 5, color: '#666' }
      ]);
    } else {
      datos.forEach((row: any) => {
        const cantAlternadores = parseInt(row.cantidad_alternadores) || 0;
        const cantTransacciones = parseInt(row.cantidad_transacciones) || 0;
        const entradas = parseInt(row.entradas) || 0;
        const salidas = parseInt(row.salidas) || 0;

        totalAlternadores += cantAlternadores;
        totalTransacciones += cantTransacciones;
        totalEntradas += entradas;
        totalSalidas += salidas;

        tableBody.push([
          { text: row.tipo_componente || 'N/A', style: 'tableCell', alignment: 'left' },
          { text: cantAlternadores.toString(), style: 'tableCell', alignment: 'center', bold: true },
          { text: cantTransacciones.toString(), style: 'tableCell', alignment: 'center' },
          { text: entradas.toString(), style: 'tableCell', alignment: 'center', color: '#28a745' },
          { text: salidas.toString(), style: 'tableCell', alignment: 'center', color: '#dc3545' }
        ]);
      });
    }

    // Agregar fila de totales solo si hay datos
    if (datos.length > 0) {
      tableBody.push([
        { text: 'TOTALES', style: 'tableHeader', alignment: 'left', bold: true },
        { text: totalAlternadores.toString(), style: 'tableHeader', alignment: 'center', bold: true },
        { text: totalTransacciones.toString(), style: 'tableHeader', alignment: 'center', bold: true },
        { text: totalEntradas.toString(), style: 'tableHeader', alignment: 'center', bold: true, color: '#28a745' },
        { text: totalSalidas.toString(), style: 'tableHeader', alignment: 'center', bold: true, color: '#dc3545' }
      ]);
    }

    // Definir el documento PDF
    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [20, 120, 40, 60],
      header: {
        margin: [20, 20, 40, 0],
        columns: [
          {
            width: '*',
            text: 'REPORTE DE CANTIDAD DE COMPONENTES',
            style: 'headerTitle',
            alignment: 'center',
            margin: [0, 30, 0, 0]
          }
        ]
      },
      content: [
        // Información del reporte
        {
          text: 'INFORMACIÓN DEL REPORTE',
          style: 'sectionTitle',
          margin: [0, 0, 0, 10]
        },
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Período: ', bold: true },
                { text: `${formatDate(fecha_desde as string)} - ${formatDate(fecha_hasta as string)}` }
              ],
              margin: [0, 0, 0, 5]
            }
          ],
          margin: [0, 0, 0, 10]
        },
        // Filtros aplicados
        ...(filtrosAplicados.length > 0 ? [{
          text: [
            { text: 'Filtros aplicados: ', bold: true },
            { text: filtrosAplicados.join(' | ') }
          ],
          margin: [0, 0, 0, 15] as [number, number, number, number]
        }] : []),
        // Tabla de datos
        {
          text: 'CANTIDAD DE COMPONENTES POR TIPO',
          style: 'sectionTitle',
          margin: [0, 20, 0, 10] as [number, number, number, number]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 100, 120, 80, 80],
            body: tableBody
          },
          layout: {
            hLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.widths.length ? 1 : 0.5;
            },
            hLineColor: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? '#333333' : '#cccccc';
            },
            vLineColor: function (i: number, node: any) {
              return i === 0 || i === node.table.widths.length ? '#333333' : '#cccccc';
            },
            paddingLeft: function (i: number) {
              return i === 0 ? 5 : 5;
            },
            paddingRight: function (i: number, node: any) {
              return i === node.table.widths.length - 1 ? 5 : 5;
            },
            paddingTop: function () {
              return 5;
            },
            paddingBottom: function () {
              return 5;
            }
          }
        }
      ],
      footer: function (currentPage: number, pageCount: number) {
        return {
          margin: [20, 10, 40, 0],
          text: [
            { text: 'Página ', style: 'footer' },
            { text: currentPage.toString(), style: 'footer' },
            { text: ' de ', style: 'footer' },
            { text: pageCount.toString(), style: 'footer' }
          ],
          alignment: 'center',
          fontSize: 9,
          color: '#666666'
        };
      },
      styles: {
        headerTitle: {
          fontSize: 18,
          bold: true,
          color: '#1a1a1a'
        },
        sectionTitle: {
          fontSize: 14,
          bold: true,
          color: '#2c3e50',
          margin: [0, 10, 0, 10]
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: '#ffffff',
          fillColor: '#34495e',
          alignment: 'center'
        },
        tableCell: {
          fontSize: 9,
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
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-cantidad-componentes-${fecha_desde}-${fecha_hasta}.pdf`);

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error('Error al generar reporte de cantidad de componentes:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al generar el reporte de cantidad de componentes',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};


