import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateMaestroPanolDTO,
  DetallePanol,
  MaestroPanol,
  UpdateMaestroPanolDTO,
} from '../types.js';

const TABLA_M = 'tbl_49_m_panol';
const TABLA_D = 'tbl_50_d_panol';

const TIPOS = new Set(['SALIDA', 'DEVOLUCION']);
const ESTADOS_MOV = new Set(['PENDIENTE', 'COMPLETADA', 'ANULADA']);
const ESTADOS_ENTREGA = new Set(['BUENA', 'REGULAR', 'DANADA']);
const ESTADOS_DEV = new Set(['BUENA', 'REGULAR', 'DANADA', 'PERDIDA']);

const MAESTRO_SELECT = `
  SELECT
    m.idmpanol_49,
    m.folio_49,
    m.tipomovimiento_49,
    m.idtrabajador_49,
    m.idusuario_49,
    m.idresponsableentrega_49,
    m.fecha_49,
    m.fechadevolucion_49,
    m.estado_49,
    m.observacion_49,
    m.firmatrabajador_49,
    m.firmapanolero_49,
    m.creado_en,
    m.actualizado_en,
    CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre,
    t.ruttrabajador_06 AS trabajador_rut,
    u.username AS usuario_nombre,
    CONCAT(
      COALESCE(r.nombreresponsableentrega_08, ''), ' ',
      COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(r.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'idherramienta', h.idherramienta_48,
            'codigo', h.codigo_48,
            'nombre', h.nombre_48,
            'estado', h.estado_48,
            'stock', h.stock_48,
            'stock_disponible', h.stock_disponible_48,
            'cantidad', d.cantidad_50
          )
          ORDER BY h.codigo_48
        ),
        '[]'::json
      )
      FROM ${TABLA_D} d
      INNER JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
      WHERE d.idmpanol_50 = m.idmpanol_49
    ) AS herramientas_detalle
  FROM ${TABLA_M} m
  INNER JOIN tbl_06_trabajador t ON m.idtrabajador_49 = t.idtrabajador_06
  LEFT JOIN tbl_00_usuario u ON m.idusuario_49 = u.id_usuario_00
  LEFT JOIN tbl_08_responsable_entrega r ON m.idresponsableentrega_49 = r.idresponsableentrega_08
`;

const DETALLE_SELECT = `
  SELECT
    d.iddpanol_50,
    d.idmpanol_50,
    d.idherramienta_50,
    d.estadoentrega_50,
    d.estadodevolucion_50,
    d.cantidad_50,
    d.observacion_50,
    d.foto_50,
    d.creado_en,
    d.actualizado_en,
    h.codigo_48 AS herramienta_codigo,
    h.nombre_48 AS herramienta_nombre,
    h.estado_48 AS herramienta_estado,
    h.stock_disponible_48 AS herramienta_stock_disponible
  FROM ${TABLA_D} d
  INNER JOIN tbl_48_d_herramienta h ON d.idherramienta_50 = h.idherramienta_48
`;

function validarDetalles(
  tipo: string,
  detalles: CreateMaestroPanolDTO['detalles']
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos una herramienta';
  const seen = new Set<number>();
  for (const d of detalles) {
    if (!d.idherramienta_50) return 'Cada línea debe tener una herramienta';
    if (seen.has(d.idherramienta_50)) return 'No se puede repetir la misma herramienta en el detalle';
    seen.add(d.idherramienta_50);
    if (!d.cantidad_50 || d.cantidad_50 < 1) return 'La cantidad debe ser mayor a 0';
    const entrega = String(d.estadoentrega_50 || 'BUENA').toUpperCase();
    if (!ESTADOS_ENTREGA.has(entrega)) return 'Estado de entrega inválido';
    if (tipo === 'DEVOLUCION') {
      const dev = d.estadodevolucion_50 ? String(d.estadodevolucion_50).toUpperCase() : '';
      if (!dev || !ESTADOS_DEV.has(dev)) {
        return 'En devolución debe indicar estado de devolución válido';
      }
    }
  }
  return null;
}

function firmaValida(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

const ESTADOS_NO_PRESTABLES = new Set(['PERDIDA', 'DANADA', 'DE_BAJA', 'EN_MANTENCION']);

/**
 * Control de stock para SALIDA (sin columna nueva):
 * 1) stock_disponible_48 / estado_48 (actualizados por el trigger al COMPLETAR)
 * 2) saldo neto de movimientos (SALIDA - DEVOLUCION) por si quedó PENDIENTE
 *    y el trigger aún no bajó el stock
 */
async function validarStockSalida(
  client: { query: typeof pool.query },
  detalles: CreateMaestroPanolDTO['detalles'],
  excludeIdMaestro?: number
): Promise<string | null> {
  for (const d of detalles) {
    const result = await client.query<{
      codigo_48: string;
      stock_48: number;
      stock_disponible_48: number;
      estado_48: string;
      activo_48: boolean;
    }>(
      `SELECT codigo_48, stock_48, stock_disponible_48, estado_48, activo_48
       FROM tbl_48_d_herramienta
       WHERE idherramienta_48 = $1
       FOR UPDATE`,
      [d.idherramienta_50]
    );

    if (result.rowCount === 0) {
      return `Herramienta ${d.idherramienta_50} no encontrada`;
    }

    const h = result.rows[0];
    const codigo = h.codigo_48;
    const cant = Number(d.cantidad_50);

    if (!h.activo_48) {
      return `${codigo} está inactiva y no se puede prestar`;
    }
    if (ESTADOS_NO_PRESTABLES.has(String(h.estado_48 || '').toUpperCase())) {
      return `${codigo} no está disponible (estado: ${h.estado_48})`;
    }

    // En create: stock_disponible basta. En update: el propio movimiento ya pudo bajar stock,
    // por eso ahí confiamos en el saldo neto (excluyendo el movimiento actual).
    if (excludeIdMaestro == null) {
      if (Number(h.stock_disponible_48) < cant) {
        return `${codigo} no tiene stock disponible (disponible: ${h.stock_disponible_48}, solicitado: ${cant})`;
      }
      if (String(h.estado_48).toUpperCase() === 'PRESTADA' && Number(h.stock_disponible_48) <= 0) {
        return `${codigo} ya está prestada y no tiene unidades disponibles`;
      }
    }

    // Neto comprometido aunque el movimiento esté PENDIENTE (el préstamo ya compromete stock)
    const netoRes = await client.query<{ neto: string }>(
      `SELECT COALESCE(SUM(
         CASE
           WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA' THEN d.cantidad_50
           WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'DEVOLUCION' THEN -d.cantidad_50
           ELSE 0
         END
       ), 0)::text AS neto
       FROM tbl_50_d_panol d
       INNER JOIN tbl_49_m_panol m ON m.idmpanol_49 = d.idmpanol_50
       WHERE d.idherramienta_50 = $1
         AND UPPER(TRIM(m.estado_49)) IN ('PENDIENTE', 'COMPLETADA')
         AND ($2::int IS NULL OR m.idmpanol_49 <> $2)`,
      [d.idherramienta_50, excludeIdMaestro ?? null]
    );
    const netoPrestado = Number(netoRes.rows[0]?.neto || 0);
    const stockTotal = Number(h.stock_48);
    if (netoPrestado + cant > stockTotal) {
      return `${codigo} ya tiene unidades prestadas/comprometidas (${netoPrestado} de ${stockTotal})`;
    }
  }
  return null;
}

/**
 * Control para DEVOLUCION ligada a una SALIDA concreta (botón Devolver):
 * admite PENDIENTE o COMPLETADA “huérfana” (cerrada sin haber devuelto stock).
 * Las cantidades no pueden superar ese préstamo.
 */
async function validarDevolucionDesdeSalida(
  client: { query: typeof pool.query },
  idSalida: number,
  detalles: CreateMaestroPanolDTO['detalles']
): Promise<string | null> {
  const salidaRes = await client.query<{
    tipomovimiento_49: string;
    estado_49: string;
    folio_49: string | null;
  }>(
    `SELECT tipomovimiento_49, estado_49, folio_49
     FROM ${TABLA_M}
     WHERE idmpanol_49 = $1
     FOR UPDATE`,
    [idSalida]
  );

  if (salidaRes.rowCount === 0) {
    return 'Préstamo de origen no encontrado';
  }

  const salida = salidaRes.rows[0];
  const tipoSalida = String(salida.tipomovimiento_49 || '').toUpperCase();
  const estadoSalida = String(salida.estado_49 || '').toUpperCase();
  const folio = salida.folio_49 || `ID-${idSalida}`;

  if (tipoSalida !== 'SALIDA') {
    return 'El movimiento de origen debe ser una SALIDA';
  }
  if (estadoSalida === 'ANULADA') {
    return `El préstamo ${folio} está anulado`;
  }
  if (estadoSalida !== 'PENDIENTE' && estadoSalida !== 'COMPLETADA') {
    return `El préstamo ${folio} no admite devolución (estado: ${estadoSalida})`;
  }

  const detsRes = await client.query<{
    idherramienta_50: number;
    cantidad_50: number;
    codigo_48: string;
  }>(
    `SELECT d.idherramienta_50, d.cantidad_50, h.codigo_48
     FROM ${TABLA_D} d
     INNER JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
     WHERE d.idmpanol_50 = $1`,
    [idSalida]
  );

  const porHerramienta = new Map<number, { cantidad: number; codigo: string }>();
  for (const row of detsRes.rows) {
    porHerramienta.set(Number(row.idherramienta_50), {
      cantidad: Number(row.cantidad_50),
      codigo: row.codigo_48,
    });
  }

  for (const d of detalles) {
    const idH = Number(d.idherramienta_50);
    const cant = Number(d.cantidad_50);
    const enPrestamo = porHerramienta.get(idH);

    const toolRes = await client.query<{ codigo_48: string; activo_48: boolean }>(
      `SELECT codigo_48, activo_48
       FROM tbl_48_d_herramienta
       WHERE idherramienta_48 = $1
       FOR UPDATE`,
      [idH]
    );
    if (toolRes.rowCount === 0) {
      return `Herramienta ${idH} no encontrada`;
    }
    const codigo = toolRes.rows[0].codigo_48;
    if (!toolRes.rows[0].activo_48) {
      return `${codigo} está inactiva`;
    }
    if (!enPrestamo) {
      return `${codigo} no pertenece al préstamo ${folio}`;
    }
    if (cant > enPrestamo.cantidad) {
      return `${codigo}: el préstamo ${folio} solo tiene ${enPrestamo.cantidad} unidad(es) (solicitado: ${cant})`;
    }

    // Si la salida quedó COMPLETADA sin devolver, exigir que aún haya unidades prestadas
    if (estadoSalida === 'COMPLETADA') {
      const netoRes = await client.query<{ neto: string }>(
        `SELECT COALESCE(SUM(
           CASE
             WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA' THEN d.cantidad_50
             WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'DEVOLUCION' THEN -d.cantidad_50
             ELSE 0
           END
         ), 0)::text AS neto
         FROM ${TABLA_D} d
         INNER JOIN ${TABLA_M} m ON m.idmpanol_49 = d.idmpanol_50
         WHERE d.idherramienta_50 = $1
           AND UPPER(TRIM(m.estado_49)) IN ('PENDIENTE', 'COMPLETADA')`,
        [idH]
      );
      const neto = Number(netoRes.rows[0]?.neto || 0);
      if (neto <= 0) {
        return `${codigo}: el préstamo ${folio} ya no tiene unidades pendientes de devolver`;
      }
    }
  }

  return null;
}

/**
 * Control para DEVOLUCION libre (sin salida origen):
 * solo se puede devolver lo que aún está prestado (neto SALIDA - DEVOLUCION > 0)
 */
async function validarDevolucion(
  client: { query: typeof pool.query },
  detalles: CreateMaestroPanolDTO['detalles'],
  excludeIdMaestro?: number
): Promise<string | null> {
  for (const d of detalles) {
    const result = await client.query<{
      codigo_48: string;
      estado_48: string;
      activo_48: boolean;
    }>(
      `SELECT codigo_48, estado_48, activo_48
       FROM tbl_48_d_herramienta
       WHERE idherramienta_48 = $1
       FOR UPDATE`,
      [d.idherramienta_50]
    );

    if (result.rowCount === 0) {
      return `Herramienta ${d.idherramienta_50} no encontrada`;
    }

    const h = result.rows[0];
    const codigo = h.codigo_48;
    const cant = Number(d.cantidad_50);

    if (!h.activo_48) {
      return `${codigo} está inactiva`;
    }

    const netoRes = await client.query<{ neto: string }>(
      `SELECT COALESCE(SUM(
         CASE
           WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA' THEN d.cantidad_50
           WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'DEVOLUCION' THEN -d.cantidad_50
           ELSE 0
         END
       ), 0)::text AS neto
       FROM tbl_50_d_panol d
       INNER JOIN tbl_49_m_panol m ON m.idmpanol_49 = d.idmpanol_50
       WHERE d.idherramienta_50 = $1
         AND UPPER(TRIM(m.estado_49)) IN ('PENDIENTE', 'COMPLETADA')
         AND ($2::int IS NULL OR m.idmpanol_49 <> $2)`,
      [d.idherramienta_50, excludeIdMaestro ?? null]
    );
    const netoPrestado = Number(netoRes.rows[0]?.neto || 0);

    if (netoPrestado <= 0) {
      return `${codigo} no tiene unidades prestadas para devolver (estado: ${h.estado_48})`;
    }
    if (cant > netoPrestado) {
      return `${codigo}: solo se pueden devolver ${netoPrestado} unidad(es) (solicitado: ${cant})`;
    }
  }
  return null;
}

export const getAllPanol = async (_req: Request, res: Response): Promise<void> => {
  try {
    // DISTINCT ON evita filas duplicadas si algún JOIN multiplica (p. ej. datos sucios en prod)
    const result = await pool.query<MaestroPanol>(
      `SELECT * FROM (
         SELECT DISTINCT ON (m.idmpanol_49)
           m.idmpanol_49,
           m.folio_49,
           m.tipomovimiento_49,
           m.idtrabajador_49,
           m.idusuario_49,
           m.idresponsableentrega_49,
           m.fecha_49,
           m.fechadevolucion_49,
           m.estado_49,
           m.observacion_49,
           m.firmatrabajador_49,
           m.firmapanolero_49,
           m.creado_en,
           m.actualizado_en,
           CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre,
           t.ruttrabajador_06 AS trabajador_rut,
           u.username AS usuario_nombre,
           CONCAT(
             COALESCE(r.nombreresponsableentrega_08, ''), ' ',
             COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
             COALESCE(r.amaternoresponsableentrega_08, '')
           ) AS responsable_nombre,
           (
             SELECT COALESCE(
               json_agg(
                 json_build_object(
                   'idherramienta', h.idherramienta_48,
                   'codigo', h.codigo_48,
                   'nombre', h.nombre_48,
                   'estado', h.estado_48,
                   'stock', h.stock_48,
                   'stock_disponible', h.stock_disponible_48,
                   'cantidad', d.cantidad_50
                 )
                 ORDER BY h.codigo_48
               ),
               '[]'::json
             )
             FROM ${TABLA_D} d
             INNER JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
             WHERE d.idmpanol_50 = m.idmpanol_49
           ) AS herramientas_detalle
         FROM ${TABLA_M} m
         INNER JOIN tbl_06_trabajador t ON m.idtrabajador_49 = t.idtrabajador_06
         LEFT JOIN tbl_00_usuario u ON m.idusuario_49 = u.id_usuario_00
         LEFT JOIN tbl_08_responsable_entrega r ON m.idresponsableentrega_49 = r.idresponsableentrega_08
         ORDER BY m.idmpanol_49 DESC
       ) panol_uniq
       ORDER BY fecha_49 DESC, idmpanol_49 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener movimientos de pañol',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getPanolById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestroResult = await pool.query<MaestroPanol>(
      `${MAESTRO_SELECT} WHERE m.idmpanol_49 = $1`,
      [id]
    );
    if (maestroResult.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Movimiento de pañol no encontrado' });
      return;
    }
    const detallesResult = await pool.query<DetallePanol>(
      `${DETALLE_SELECT} WHERE d.idmpanol_50 = $1 ORDER BY h.nombre_48 ASC`,
      [id]
    );
    res.json({
      success: true,
      data: { maestro: maestroResult.rows[0], detalles: detallesResult.rows },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el movimiento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getDetallesPanol = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<DetallePanol>(
      `${DETALLE_SELECT} WHERE d.idmpanol_50 = $1 ORDER BY h.nombre_48 ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalles',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createPanol = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const idUsuario = req.authUser?.id;
    if (!idUsuario) {
      res.status(401).json({ success: false, error: 'Usuario no autenticado' });
      return;
    }

    const body: CreateMaestroPanolDTO = req.body;
    const tipo = String(body.tipomovimiento_49 || '').toUpperCase();
    // Flujo operativo: SALIDA queda PENDIENTE hasta la devolución; DEVOLUCION cierra en COMPLETADA
    const estado =
      tipo === 'SALIDA'
        ? 'PENDIENTE'
        : tipo === 'DEVOLUCION'
          ? 'COMPLETADA'
          : String(body.estado_49 || 'COMPLETADA').toUpperCase();
    const idSalidaOrigen = body.idsalidaorigen_49
      ? Number(body.idsalidaorigen_49)
      : null;
    const firmaTrab = firmaValida(body.firmatrabajador_49);
    const firmaPanol = firmaValida(body.firmapanolero_49);

    if (!TIPOS.has(tipo)) {
      res.status(400).json({ success: false, error: 'Tipo de movimiento inválido' });
      return;
    }
    if (!ESTADOS_MOV.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado de movimiento inválido' });
      return;
    }
    if (!body.idtrabajador_49) {
      res.status(400).json({ success: false, error: 'Trabajador es requerido' });
      return;
    }
    if (!body.idresponsableentrega_49) {
      res.status(400).json({ success: false, error: 'Responsable de entrega es requerido' });
      return;
    }
    if (!firmaTrab || !firmaPanol) {
      res.status(400).json({
        success: false,
        error: 'Se requieren firma del trabajador y del pañolero',
      });
      return;
    }
    if (idSalidaOrigen != null && (Number.isNaN(idSalidaOrigen) || idSalidaOrigen < 1)) {
      res.status(400).json({ success: false, error: 'idsalidaorigen_49 inválido' });
      return;
    }
    if (idSalidaOrigen != null && tipo !== 'DEVOLUCION') {
      res.status(400).json({
        success: false,
        error: 'idsalidaorigen_49 solo aplica a movimientos DEVOLUCION',
      });
      return;
    }

    const detalleError = validarDetalles(tipo, body.detalles);
    if (detalleError) {
      res.status(400).json({ success: false, error: detalleError });
      return;
    }

    await client.query('BEGIN');

    if (tipo === 'SALIDA') {
      const stockError = await validarStockSalida(client, body.detalles);
      if (stockError) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: stockError });
        return;
      }
    }
    if (tipo === 'DEVOLUCION') {
      const devError = idSalidaOrigen
        ? await validarDevolucionDesdeSalida(client, idSalidaOrigen, body.detalles)
        : await validarDevolucion(client, body.detalles);
      if (devError) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: devError });
        return;
      }
    }

    const insertM = await client.query(
      `INSERT INTO ${TABLA_M} (
        tipomovimiento_49, idtrabajador_49, idusuario_49, idresponsableentrega_49,
        fecha_49, fechadevolucion_49, estado_49, observacion_49,
        firmatrabajador_49, firmapanolero_49
      ) VALUES (
        $1, $2, $3, $4,
        COALESCE($5::timestamp, NOW()), $6, $7, $8,
        $9, $10
      ) RETURNING idmpanol_49`,
      [
        tipo,
        body.idtrabajador_49,
        idUsuario,
        body.idresponsableentrega_49,
        body.fecha_49 || null,
        body.fechadevolucion_49 || null,
        estado,
        body.observacion_49?.trim() || null,
        firmaTrab,
        firmaPanol,
      ]
    );
    const idMaestro = insertM.rows[0].idmpanol_49;

    for (const d of body.detalles) {
      await client.query(
        `INSERT INTO ${TABLA_D} (
          idmpanol_50, idherramienta_50, estadoentrega_50, estadodevolucion_50,
          cantidad_50, observacion_50, foto_50
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          idMaestro,
          d.idherramienta_50,
          String(d.estadoentrega_50 || 'BUENA').toUpperCase(),
          d.estadodevolucion_50 ? String(d.estadodevolucion_50).toUpperCase() : null,
          d.cantidad_50,
          d.observacion_50?.trim() || null,
          d.foto_50 || null,
        ]
      );
    }

    // Al registrar la devolución, cerrar el préstamo origen (PENDIENTE o COMPLETADA huérfana)
    if (tipo === 'DEVOLUCION' && idSalidaOrigen) {
      const fechaCierre = body.fecha_49 || null;
      const cierre = await client.query(
        `UPDATE ${TABLA_M}
         SET estado_49 = 'COMPLETADA',
             fechadevolucion_49 = GREATEST(
               fecha_49,
               COALESCE($2::timestamp, NOW())
             ),
             actualizado_en = CURRENT_TIMESTAMP
         WHERE idmpanol_49 = $1
           AND UPPER(TRIM(tipomovimiento_49)) = 'SALIDA'
           AND UPPER(TRIM(estado_49)) IN ('PENDIENTE', 'COMPLETADA')
         RETURNING idmpanol_49`,
        [idSalidaOrigen, fechaCierre]
      );
      if (cierre.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          error: 'No se pudo cerrar el préstamo de origen (anulado o inexistente)',
        });
        return;
      }
    }

    await client.query('COMMIT');

    const maestro = await pool.query<MaestroPanol>(
      `${MAESTRO_SELECT} WHERE m.idmpanol_49 = $1`,
      [idMaestro]
    );
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: 'Movimiento de pañol creado exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const pgMessage = error instanceof Error ? error.message : 'Error desconocido';
    let errorAmigable = 'Error al crear movimiento de pañol';
    if (pgMessage.includes('chk_tbl_49_fechas_validas')) {
      errorAmigable =
        'La fecha de devolución no puede ser anterior a la fecha del préstamo. Ajuste la fecha e intente de nuevo.';
    } else if (pgMessage.includes('chk_tbl_48_stock_valido')) {
      errorAmigable =
        'El stock de la herramienta quedaría inválido. Revise préstamos pendientes o ejecute el script de corrección de pañol en la BD.';
    } else if (pgMessage.includes('chk_tbl_49_firmas_no_vacias')) {
      errorAmigable = 'Las firmas del trabajador y del pañolero son obligatorias';
    } else if (pgMessage.includes('uq_tbl_50_d_panol_herramienta')) {
      errorAmigable = 'No se puede repetir la misma herramienta en el detalle';
    }
    res.status(500).json({
      success: false,
      error: errorAmigable,
      message: pgMessage,
    });
  } finally {
    client.release();
  }
};

export const updatePanol = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroPanolDTO = req.body;

    const exists = await client.query(
      `SELECT idmpanol_49, tipomovimiento_49, estado_49 FROM ${TABLA_M} WHERE idmpanol_49 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Movimiento de pañol no encontrado' });
      return;
    }

    const actual = exists.rows[0];
    if (actual.estado_49 === 'ANULADA') {
      res.status(400).json({ success: false, error: 'No se puede editar un movimiento anulado' });
      return;
    }

    const tipo = body.tipomovimiento_49
      ? String(body.tipomovimiento_49).toUpperCase()
      : actual.tipomovimiento_49;

    if (body.tipomovimiento_49 && !TIPOS.has(tipo)) {
      res.status(400).json({ success: false, error: 'Tipo de movimiento inválido' });
      return;
    }
    if (body.estado_49 && !ESTADOS_MOV.has(String(body.estado_49).toUpperCase())) {
      res.status(400).json({ success: false, error: 'Estado de movimiento inválido' });
      return;
    }
    if (body.detalles !== undefined) {
      const detalleError = validarDetalles(tipo, body.detalles);
      if (detalleError) {
        res.status(400).json({ success: false, error: detalleError });
        return;
      }
    }

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const push = (col: string, val: unknown) => {
      updates.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (body.tipomovimiento_49 !== undefined) push('tipomovimiento_49', tipo);
    if (body.idtrabajador_49 !== undefined) push('idtrabajador_49', body.idtrabajador_49);
    if (body.idresponsableentrega_49 !== undefined) {
      if (!body.idresponsableentrega_49) {
        res.status(400).json({ success: false, error: 'Responsable de entrega es requerido' });
        await client.query('ROLLBACK');
        return;
      }
      push('idresponsableentrega_49', body.idresponsableentrega_49);
    }
    if (body.fecha_49 !== undefined) push('fecha_49', body.fecha_49);
    if (body.fechadevolucion_49 !== undefined) push('fechadevolucion_49', body.fechadevolucion_49 || null);
    if (body.estado_49 !== undefined) {
      const nuevoEstado = String(body.estado_49).toUpperCase();
      // Una SALIDA no se cierra a mano: solo por devolución (o anulación)
      if (String(tipo).toUpperCase() === 'SALIDA' && nuevoEstado === 'COMPLETADA') {
        res.status(400).json({
          success: false,
          error: 'Una SALIDA no se puede marcar COMPLETADA manualmente. Use el botón Devolver',
        });
        await client.query('ROLLBACK');
        return;
      }
      push('estado_49', nuevoEstado);
    }
    if (body.observacion_49 !== undefined) push('observacion_49', body.observacion_49?.trim() || null);
    if (body.firmatrabajador_49 !== undefined) {
      const f = firmaValida(body.firmatrabajador_49);
      if (!f) {
        res.status(400).json({ success: false, error: 'Firma del trabajador inválida' });
        await client.query('ROLLBACK');
        return;
      }
      push('firmatrabajador_49', f);
    }
    if (body.firmapanolero_49 !== undefined) {
      const f = firmaValida(body.firmapanolero_49);
      if (!f) {
        res.status(400).json({ success: false, error: 'Firma del pañolero inválida' });
        await client.query('ROLLBACK');
        return;
      }
      push('firmapanolero_49', f);
    }

    if (updates.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE ${TABLA_M} SET ${updates.join(', ')} WHERE idmpanol_49 = $${idx}`,
        values
      );
    }

    if (body.detalles !== undefined && tipo === 'SALIDA') {
      const stockError = await validarStockSalida(client, body.detalles, Number(id));
      if (stockError) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: stockError });
        return;
      }
    }
    if (body.detalles !== undefined && tipo === 'DEVOLUCION') {
      const devError = await validarDevolucion(client, body.detalles, Number(id));
      if (devError) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: devError });
        return;
      }
    }

    if (body.detalles !== undefined) {
      await client.query(`DELETE FROM ${TABLA_D} WHERE idmpanol_50 = $1`, [id]);
      for (const d of body.detalles) {
        await client.query(
          `INSERT INTO ${TABLA_D} (
            idmpanol_50, idherramienta_50, estadoentrega_50, estadodevolucion_50,
            cantidad_50, observacion_50, foto_50
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            id,
            d.idherramienta_50,
            String(d.estadoentrega_50 || 'BUENA').toUpperCase(),
            d.estadodevolucion_50 ? String(d.estadodevolucion_50).toUpperCase() : null,
            d.cantidad_50,
            d.observacion_50?.trim() || null,
            d.foto_50 || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    const maestro = await pool.query<MaestroPanol>(
      `${MAESTRO_SELECT} WHERE m.idmpanol_49 = $1`,
      [id]
    );
    res.json({
      success: true,
      data: maestro.rows[0],
      message: 'Movimiento de pañol actualizado exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar movimiento de pañol',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deletePanol = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Soft-delete operativo: anular (evita deshacer stock del trigger de forma incorrecta)
    const result = await pool.query(
      `UPDATE ${TABLA_M}
       SET estado_49 = 'ANULADA'
       WHERE idmpanol_49 = $1
       RETURNING idmpanol_49`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Movimiento de pañol no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Movimiento anulado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al anular movimiento de pañol',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
