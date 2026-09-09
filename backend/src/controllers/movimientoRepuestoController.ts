import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateMovimientoRepuestoDTO,
  MovimientoRepuesto,
  TipoMovimientoRepuesto,
  UbicacionRepuesto,
} from '../types.js';

const SELECT_MOV = `
  SELECT
    m.idmovimiento_84,
    m.idunidad_84,
    m.idubicacion_origen_84,
    m.idubicacion_destino_84,
    m.idtipo_84,
    m.idtecnico_84,
    m.idmaquina_84,
    m.idproveedor_84,
    m.fecha_84,
    m.hora_84,
    m.observacion_84,
    un.codigo_81,
    rd.codigo_57 AS codigo_tipo_57,
    rd.nombre_57 AS nombre_tipo_57,
    uo.descripcion_82 AS origen_descripcion,
    ud.descripcion_82 AS destino_descripcion,
    tp.codigo_83 AS tipo_codigo,
    tp.descripcion_83 AS tipo_descripcion,
    CONCAT(tec.nombres_21, ' ', tec.a_paterno_21, ' ', tec.a_materno_21) AS tecnico_nombre,
    maq.numinterno_11 AS maquina_numinterno,
    maq.ppu_11 AS maquina_ppu,
    pr.nombre_58 AS proveedor_nombre
  FROM tbl_84_movimiento_repuesto m
  INNER JOIN tbl_81_unidad_repuesto un ON un.idunidad_81 = m.idunidad_84
  INNER JOIN tbl_57_repuesto_danado rd ON rd.idrepuestodanado_57 = un.idrepuesto_81
  INNER JOIN tbl_82_ubicacion_repuesto uo ON uo.idubicacion_82 = m.idubicacion_origen_84
  INNER JOIN tbl_82_ubicacion_repuesto ud ON ud.idubicacion_82 = m.idubicacion_destino_84
  INNER JOIN tbl_83_tipo_movimiento_repuesto tp ON tp.idtipo_83 = m.idtipo_84
  LEFT JOIN tbl_21_tecnico tec ON tec.id_tecnico_21 = m.idtecnico_84
  LEFT JOIN tbl_11_maquina maq ON maq.idmaquina_11 = m.idmaquina_84
  LEFT JOIN tbl_58_proveedor pr ON pr.idproveedor_58 = m.idproveedor_84
`;

function normalizarObservacion(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim().toUpperCase();
  return t ? t.slice(0, 250) : null;
}

export const getUbicacionesRepuesto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<UbicacionRepuesto>(
      `SELECT idubicacion_82, codigo_82, descripcion_82, activo_82
       FROM tbl_82_ubicacion_repuesto
       WHERE activo_82 = true
       ORDER BY idubicacion_82`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener ubicaciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getTiposMovimientoRepuesto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<TipoMovimientoRepuesto>(
      `SELECT idtipo_83, codigo_83, descripcion_83, valor_accion_83,
              codigo_origen_83, codigo_destino_83, activo_83
       FROM tbl_83_tipo_movimiento_repuesto
       WHERE activo_83 = true
       ORDER BY idtipo_83`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getAllMovimientosRepuesto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MovimientoRepuesto>(
      `${SELECT_MOV} ORDER BY m.fecha_84 DESC, m.hora_84 DESC, m.idmovimiento_84 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener movimientos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createMovimientoRepuesto = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateMovimientoRepuestoDTO = req.body;
    if (!body.idunidad_84 || !body.idtipo_84) {
      res.status(400).json({ success: false, error: 'Unidad y tipo de movimiento son requeridos' });
      return;
    }

    const tipoRes = await pool.query<TipoMovimientoRepuesto>(
      `SELECT * FROM tbl_83_tipo_movimiento_repuesto WHERE idtipo_83 = $1 AND activo_83 = true`,
      [body.idtipo_84]
    );
    if (tipoRes.rowCount === 0) {
      res.status(400).json({ success: false, error: 'Tipo de movimiento no válido' });
      return;
    }
    const tipo = tipoRes.rows[0];

    const ubRes = await pool.query<UbicacionRepuesto>(
      `SELECT idubicacion_82, codigo_82, descripcion_82, activo_82
       FROM tbl_82_ubicacion_repuesto WHERE activo_82 = true`
    );
    const byCodigo = Object.fromEntries(ubRes.rows.map((u) => [u.codigo_82, u]));
    const origen = byCodigo[tipo.codigo_origen_83];
    const destino = byCodigo[tipo.codigo_destino_83];
    if (!origen || !destino) {
      res.status(400).json({ success: false, error: 'Ubicaciones del tipo no están configuradas' });
      return;
    }

    const usaMaquina = tipo.codigo_origen_83 === 'MAQUINA' || tipo.codigo_destino_83 === 'MAQUINA';
    const usaProveedor = tipo.codigo_origen_83 === 'PROVEEDOR' || tipo.codigo_destino_83 === 'PROVEEDOR';
    if (usaMaquina && !body.idmaquina_84) {
      res.status(400).json({
        success: false,
        error: 'Debe indicar la máquina',
        message: tipo.codigo_83 === 'MBD'
          ? 'Elija de qué máquina baja el repuesto dañado.'
          : 'Elija en qué máquina se instala el repuesto reparado.',
      });
      return;
    }
    if (usaProveedor && !body.idproveedor_84) {
      res.status(400).json({
        success: false,
        error: 'Debe indicar el proveedor',
        message: 'El ciclo pasa por el proveedor que repara la pieza.',
      });
      return;
    }

    const stockRes = await pool.query<{ codigo_82: string; descripcion_82: string }>(
      `SELECT u.codigo_82, u.descripcion_82
       FROM tbl_85_existencia_repuesto e
       JOIN tbl_82_ubicacion_repuesto u ON u.idubicacion_82 = e.idubicacion_85
       WHERE e.idunidad_85 = $1 AND e.cantidad_85 >= 1`,
      [body.idunidad_84]
    );
    const actual = stockRes.rows[0];
    if (!actual && tipo.codigo_83 !== 'MBD') {
      res.status(400).json({
        success: false,
        error: 'Paso incorrecto del ciclo',
        message: 'La pieza aún no está en bodega. Primero: Máquina → Bodega (dañado).',
      });
      return;
    }
    if (actual && actual.codigo_82 !== tipo.codigo_origen_83) {
      const siguiente: Record<string, string> = {
        MAQUINA: 'Máquina → Bodega (dañado)',
        BODEGA: 'Bodega → Proveedor, o Bodega → Máquina si ya está reparado',
        PROVEEDOR: 'Proveedor → Bodega (reparado)',
      };
      res.status(400).json({
        success: false,
        error: 'Paso incorrecto del ciclo',
        message: `La pieza está en ${actual.descripcion_82}. Siguiente paso: ${siguiente[actual.codigo_82] || 'revise el stock'}.`,
      });
      return;
    }

    if (actual?.codigo_82 === 'BODEGA' && tipo.codigo_83 === 'BMA') {
      const lastTipo = await pool.query<{ codigo_83: string }>(
        `SELECT tp.codigo_83
         FROM tbl_84_movimiento_repuesto m
         JOIN tbl_83_tipo_movimiento_repuesto tp ON tp.idtipo_83 = m.idtipo_84
         WHERE m.idunidad_84 = $1
         ORDER BY m.fecha_84 DESC, m.hora_84 DESC, m.idmovimiento_84 DESC
         LIMIT 1`,
        [body.idunidad_84]
      );
      if (lastTipo.rows[0]?.codigo_83 === 'MBD') {
        res.status(400).json({
          success: false,
          error: 'Paso incorrecto del ciclo',
          message: 'La pieza acaba de bajar dañada. Primero Bodega → Proveedor, luego vuelva reparada y recién instale.',
        });
        return;
      }
    }

    const fecha = body.fecha_84 || new Date().toISOString().split('T')[0];
    const hora = body.hora_84 || new Date().toTimeString().slice(0, 5);

    const inserted = await pool.query<{ idmovimiento_84: number }>(
      `INSERT INTO tbl_84_movimiento_repuesto (
        idunidad_84, idubicacion_origen_84, idubicacion_destino_84, idtipo_84,
        idtecnico_84, idmaquina_84, idproveedor_84, fecha_84, hora_84, observacion_84
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING idmovimiento_84`,
      [
        body.idunidad_84,
        origen.idubicacion_82,
        destino.idubicacion_82,
        body.idtipo_84,
        body.idtecnico_84 || null,
        usaMaquina ? body.idmaquina_84 : null,
        usaProveedor ? body.idproveedor_84 : null,
        fecha,
        hora,
        normalizarObservacion(body.observacion_84),
      ]
    );

    const created = await pool.query<MovimientoRepuesto>(
      `${SELECT_MOV} WHERE m.idmovimiento_84 = $1`,
      [inserted.rows[0].idmovimiento_84]
    );
    res.status(201).json({
      success: true,
      data: created.rows[0],
      message: 'Movimiento registrado',
    });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === 'P0001' || /stock insuficiente/i.test(String(pgError.message || ''))) {
      res.status(400).json({
        success: false,
        error: 'Stock insuficiente en origen',
        message: pgError.message || 'La pieza no está en esa ubicación.',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error al registrar el movimiento',
      message: pgError.message || (error instanceof Error ? error.message : 'Error desconocido'),
    });
  }
};

export const deleteMovimientoRepuesto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const mov = await pool.query<{ idunidad_84: number; idmovimiento_84: number }>(
      `SELECT idunidad_84, idmovimiento_84 FROM tbl_84_movimiento_repuesto WHERE idmovimiento_84 = $1`,
      [id]
    );
    if (mov.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Movimiento no encontrado' });
      return;
    }
    const last = await pool.query<{ idmovimiento_84: number }>(
      `SELECT idmovimiento_84 FROM tbl_84_movimiento_repuesto
       WHERE idunidad_84 = $1
       ORDER BY fecha_84 DESC, hora_84 DESC, idmovimiento_84 DESC
       LIMIT 1`,
      [mov.rows[0].idunidad_84]
    );
    if (last.rows[0]?.idmovimiento_84 !== Number(id)) {
      res.status(400).json({
        success: false,
        error: 'Solo se puede eliminar el último movimiento de la pieza',
      });
      return;
    }
    await pool.query('BEGIN');
    try {
      const row = await pool.query<{
        idunidad_84: number;
        idubicacion_origen_84: number;
        idubicacion_destino_84: number;
        idmaquina_84: number | null;
        idproveedor_84: number | null;
        codigo_origen: string;
      }>(
        `SELECT m.idunidad_84, m.idubicacion_origen_84, m.idubicacion_destino_84,
                m.idmaquina_84, m.idproveedor_84, uo.codigo_82 AS codigo_origen
         FROM tbl_84_movimiento_repuesto m
         JOIN tbl_82_ubicacion_repuesto uo ON uo.idubicacion_82 = m.idubicacion_origen_84
         WHERE m.idmovimiento_84 = $1`,
        [id]
      );
      const r = row.rows[0];
      await pool.query(
        `UPDATE tbl_85_existencia_repuesto
         SET cantidad_85 = cantidad_85 - 1, actualizado_en = NOW()
         WHERE idunidad_85 = $1 AND idubicacion_85 = $2 AND cantidad_85 >= 1`,
        [r.idunidad_84, r.idubicacion_destino_84]
      );
      const otros = await pool.query(
        `SELECT 1 FROM tbl_84_movimiento_repuesto
         WHERE idunidad_84 = $1 AND idmovimiento_84 <> $2 LIMIT 1`,
        [r.idunidad_84, id]
      );
      if ((otros.rowCount ?? 0) > 0) {
        await pool.query(
          `INSERT INTO tbl_85_existencia_repuesto
             (idunidad_85, idubicacion_85, cantidad_85, idmaquina_85, idproveedor_85)
           VALUES ($1, $2, 1,
             CASE WHEN $3 = 'MAQUINA' THEN $4 ELSE NULL END,
             CASE WHEN $3 = 'PROVEEDOR' THEN $5 ELSE NULL END)
           ON CONFLICT (idunidad_85, idubicacion_85) DO UPDATE
             SET cantidad_85 = tbl_85_existencia_repuesto.cantidad_85 + 1,
                 idmaquina_85 = EXCLUDED.idmaquina_85,
                 idproveedor_85 = EXCLUDED.idproveedor_85,
                 actualizado_en = NOW()`,
          [r.idunidad_84, r.idubicacion_origen_84, r.codigo_origen, r.idmaquina_84, r.idproveedor_84]
        );
      }
      await pool.query(`DELETE FROM tbl_84_movimiento_repuesto WHERE idmovimiento_84 = $1`, [id]);
      await pool.query('COMMIT');
    } catch (inner) {
      await pool.query('ROLLBACK');
      throw inner;
    }
    res.json({ success: true, message: 'Movimiento eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
