import { Request, Response } from 'express';
import { pool } from '../db.js';

const MAESTRO = 'tbl_76_m_trazabilidad_neumatico';

const MAESTRO_SELECT = `
  SELECT
    m.idtrazabilidad_76,
    m.folio_76,
    m.idmaquina_76,
    m.idconductor_76,
    m.idtecnico_76,
    m.km_maquina_76,
    m.fecha_76,
    m.hora_76,
    m.observacion_76,
    m.creado_en,
    m.actualizado_en,
    mq.numinterno_11 AS maquina_numinterno,
    mq.ppu_11 AS maquina_ppu,
    CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS conductor_nombre,
    CONCAT(tec.nombres_21, ' ', COALESCE(tec.a_paterno_21, ''), ' ', COALESCE(tec.a_materno_21, '')) AS tecnico_nombre
  FROM ${MAESTRO} m
  INNER JOIN tbl_11_maquina mq ON mq.idmaquina_11 = m.idmaquina_76
  INNER JOIN tbl_06_trabajador t ON t.idtrabajador_06 = m.idconductor_76
  INNER JOIN tbl_21_tecnico tec ON tec.id_tecnico_21 = m.idtecnico_76
`;

type DetallesBody = {
  montajes?: Array<{ idneumatico_77: number; idposicion_77: number; observacion_77?: string | null }>;
  rotaciones?: Array<{
    idneumatico_78: number;
    idposicion_origen_78: number;
    idposicion_destino_78: number;
    idpatron_78?: number | null;
    observacion_78?: string | null;
  }>;
  llantas?: Array<{ idllanta_79: number; iddano_llanta_79?: number | null; observacion_79?: string | null }>;
  bajas?: Array<{ idneumatico_80: number; iddano_neumatico_80: number; observacion_80?: string | null }>;
};

function validarCabecera(body: {
  idmaquina_76?: number;
  idconductor_76?: number;
  idtecnico_76?: number;
  km_maquina_76?: number;
}): string | null {
  if (!body.idmaquina_76) return 'Máquina es requerida';
  if (!body.idconductor_76) return 'Conductor es requerido';
  if (!body.idtecnico_76) return 'Técnico es requerido';
  if (body.km_maquina_76 == null || Number(body.km_maquina_76) < 0) return 'Odómetro / km inválido';
  return null;
}

function validarDetalles(d: DetallesBody): string | null {
  const n =
    (d.montajes?.length || 0) +
    (d.rotaciones?.length || 0) +
    (d.llantas?.length || 0) +
    (d.bajas?.length || 0);
  if (n < 1) return 'Debe cargar al menos una línea en algún detalle';
  for (const r of d.rotaciones || []) {
    if (Number(r.idposicion_origen_78) === Number(r.idposicion_destino_78)) {
      return 'En rotación el origen y el destino deben ser distintos';
    }
  }
  for (const b of d.bajas || []) {
    if (!b.iddano_neumatico_80) return 'En baja debe indicar el tipo de daño';
  }
  return null;
}

async function idEstado(client: { query: typeof pool.query }, nombre: string): Promise<number | null> {
  const r = await client.query<{ id_estado_33: number }>(
    `SELECT id_estado_33 FROM tbl_33_estado_neumatico WHERE UPPER(TRIM(estado_33)) = $1 LIMIT 1`,
    [nombre]
  );
  return r.rows[0]?.id_estado_33 ?? null;
}

async function insertarDetalles(
  client: { query: typeof pool.query },
  idMaestro: number,
  d: DetallesBody
): Promise<void> {
  for (const x of d.montajes || []) {
    await client.query(
      `INSERT INTO tbl_77_d_montaje_neumatico (idtrazabilidad_77, idneumatico_77, idposicion_77, observacion_77)
       VALUES ($1, $2, $3, $4)`,
      [idMaestro, x.idneumatico_77, x.idposicion_77, x.observacion_77?.trim() || null]
    );
  }
  for (const x of d.rotaciones || []) {
    await client.query(
      `INSERT INTO tbl_78_d_rotacion_neumatico
        (idtrazabilidad_78, idneumatico_78, idposicion_origen_78, idposicion_destino_78, idpatron_78, observacion_78)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        idMaestro,
        x.idneumatico_78,
        x.idposicion_origen_78,
        x.idposicion_destino_78,
        x.idpatron_78 || null,
        x.observacion_78?.trim() || null,
      ]
    );
  }
  for (const x of d.llantas || []) {
    await client.query(
      `INSERT INTO tbl_79_d_llanta_trazabilidad (idtrazabilidad_79, idllanta_79, iddano_llanta_79, observacion_79)
       VALUES ($1, $2, $3, $4)`,
      [idMaestro, x.idllanta_79, x.iddano_llanta_79 || null, x.observacion_79?.trim() || null]
    );
  }
  for (const x of d.bajas || []) {
    await client.query(
      `INSERT INTO tbl_80_d_baja_neumatico (idtrazabilidad_80, idneumatico_80, iddano_neumatico_80, observacion_80)
       VALUES ($1, $2, $3, $4)`,
      [idMaestro, x.idneumatico_80, x.iddano_neumatico_80, x.observacion_80?.trim() || null]
    );
  }
}

async function aplicarEfectos(
  client: { query: typeof pool.query },
  cab: {
    idconductor_76: number;
    idmaquina_76: number;
    idtecnico_76: number;
    km_maquina_76: number;
    fecha_76?: string | null;
    hora_76?: string | null;
  },
  d: DetallesBody
): Promise<void> {
  const idMontado = await idEstado(client, 'MONTADO');
  const idBaja = await idEstado(client, 'BAJA');
  const fechaMov = cab.fecha_76
    ? `${cab.fecha_76} ${cab.hora_76 || '00:00:00'}`
    : null;

  const registrar = async (idNeu: number, obs: string) => {
    const cod = await client.query<{ cod_neumatico_31: string }>(
      `SELECT cod_neumatico_31 FROM tbl_31_neumatico WHERE id_neumatico_31 = $1`,
      [idNeu]
    );
    const codigo = cod.rows[0]?.cod_neumatico_31;
    if (!codigo) return;
    await client.query(
      `INSERT INTO tbl_34_historial_neumatico
        (cod_neumatico_34, id_conductor_34, id_maquina_34, kilometraje_34, id_tecnico_34, fecha_movimiento_34, observaciones_34)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()), $7)`,
      [codigo, cab.idconductor_76, cab.idmaquina_76, cab.km_maquina_76, cab.idtecnico_76, fechaMov, obs]
    );
  };

  for (const x of d.montajes || []) {
    if (idMontado) {
      await client.query(
        `UPDATE tbl_31_neumatico SET id_estado_31 = $1 WHERE id_neumatico_31 = $2`,
        [idMontado, x.idneumatico_77]
      );
    }
    await registrar(x.idneumatico_77, 'Montaje (trazabilidad)');
  }
  for (const x of d.rotaciones || []) {
    if (idMontado) {
      await client.query(
        `UPDATE tbl_31_neumatico SET id_estado_31 = $1 WHERE id_neumatico_31 = $2`,
        [idMontado, x.idneumatico_78]
      );
    }
    await registrar(x.idneumatico_78, 'Rotación (trazabilidad)');
  }
  for (const x of d.bajas || []) {
    if (idBaja) {
      await client.query(
        `UPDATE tbl_31_neumatico SET id_estado_31 = $1 WHERE id_neumatico_31 = $2`,
        [idBaja, x.idneumatico_80]
      );
    }
    await registrar(x.idneumatico_80, 'Baja (trazabilidad)');
  }
}

async function cargarDetalles(id: number) {
  const montajes = await pool.query(
    `SELECT d.*, n.cod_neumatico_31 AS neumatico_codigo, p.codigo_73 AS posicion_codigo
     FROM tbl_77_d_montaje_neumatico d
     JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_77
     JOIN tbl_73_posicion_neumatico p ON p.idposicion_73 = d.idposicion_77
     WHERE d.idtrazabilidad_77 = $1 ORDER BY d.iddetalle_77`,
    [id]
  );
  const rotaciones = await pool.query(
    `SELECT d.*, n.cod_neumatico_31 AS neumatico_codigo,
            po.codigo_73 AS posicion_origen_codigo, pd.codigo_73 AS posicion_destino_codigo,
            pat.codigo_patron_35 AS patron_codigo
     FROM tbl_78_d_rotacion_neumatico d
     JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_78
     JOIN tbl_73_posicion_neumatico po ON po.idposicion_73 = d.idposicion_origen_78
     JOIN tbl_73_posicion_neumatico pd ON pd.idposicion_73 = d.idposicion_destino_78
     LEFT JOIN tbl_35_patron_rotacion pat ON pat.id_patron_35 = d.idpatron_78
     WHERE d.idtrazabilidad_78 = $1 ORDER BY d.iddetalle_78`,
    [id]
  );
  const llantas = await pool.query(
    `SELECT d.*, l.descripcion_llanta_36 AS llanta_descripcion, l.codigo_36 AS llanta_codigo,
            dn.codigo_75 AS dano_codigo
     FROM tbl_79_d_llanta_trazabilidad d
     JOIN tbl_36_llanta l ON l.id_llanta_36 = d.idllanta_79
     LEFT JOIN tbl_75_tipo_dano_llanta dn ON dn.iddano_llanta_75 = d.iddano_llanta_79
     WHERE d.idtrazabilidad_79 = $1 ORDER BY d.iddetalle_79`,
    [id]
  );
  const bajas = await pool.query(
    `SELECT d.*, n.cod_neumatico_31 AS neumatico_codigo, dn.codigo_74 AS dano_codigo
     FROM tbl_80_d_baja_neumatico d
     JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_80
     JOIN tbl_74_tipo_dano_neumatico dn ON dn.iddano_neumatico_74 = d.iddano_neumatico_80
     WHERE d.idtrazabilidad_80 = $1 ORDER BY d.iddetalle_80`,
    [id]
  );
  return {
    montajes: montajes.rows,
    rotaciones: rotaciones.rows,
    llantas: llantas.rows,
    bajas: bajas.rows,
  };
}

export const getAllTrazabilidadNeumatico = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`${MAESTRO_SELECT} ORDER BY m.fecha_76 DESC, m.idtrazabilidad_76 DESC`);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener intervenciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getTrazabilidadNeumaticoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const maestro = await pool.query(`${MAESTRO_SELECT} WHERE m.idtrazabilidad_76 = $1`, [req.params.id]);
    if (maestro.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Intervención no encontrada' });
      return;
    }
    const detalles = await cargarDetalles(Number(req.params.id));
    res.json({ success: true, data: { maestro: maestro.rows[0], ...detalles } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la intervención',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createTrazabilidadNeumatico = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body = req.body as DetallesBody & {
      idmaquina_76: number;
      idconductor_76: number;
      idtecnico_76: number;
      km_maquina_76: number;
      fecha_76?: string;
      hora_76?: string;
      observacion_76?: string;
    };
    const cabErr = validarCabecera(body);
    if (cabErr) {
      res.status(400).json({ success: false, error: cabErr });
      return;
    }
    const detErr = validarDetalles(body);
    if (detErr) {
      res.status(400).json({ success: false, error: detErr });
      return;
    }

    await client.query('BEGIN');
    const ins = await client.query<{ idtrazabilidad_76: number }>(
      `INSERT INTO ${MAESTRO} (
         idmaquina_76, idconductor_76, idtecnico_76, km_maquina_76, fecha_76, hora_76, observacion_76
       ) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), COALESCE($6::time, CURRENT_TIME), $7)
       RETURNING idtrazabilidad_76`,
      [
        body.idmaquina_76,
        body.idconductor_76,
        body.idtecnico_76,
        body.km_maquina_76,
        body.fecha_76 || null,
        body.hora_76 || null,
        body.observacion_76?.trim() || null,
      ]
    );
    const id = ins.rows[0].idtrazabilidad_76;
    await insertarDetalles(client, id, body);
    await aplicarEfectos(client, body, body);
    await client.query('COMMIT');

    const maestro = await pool.query(`${MAESTRO_SELECT} WHERE m.idtrazabilidad_76 = $1`, [id]);
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: `Intervención ${maestro.rows[0].folio_76} creada`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear la intervención',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const updateTrazabilidadNeumatico = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body = req.body as DetallesBody & {
      idmaquina_76: number;
      idconductor_76: number;
      idtecnico_76: number;
      km_maquina_76: number;
      fecha_76?: string;
      hora_76?: string;
      observacion_76?: string;
    };
    const cabErr = validarCabecera(body);
    if (cabErr) {
      res.status(400).json({ success: false, error: cabErr });
      return;
    }
    const detErr = validarDetalles(body);
    if (detErr) {
      res.status(400).json({ success: false, error: detErr });
      return;
    }

    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE ${MAESTRO}
       SET idmaquina_76 = $1, idconductor_76 = $2, idtecnico_76 = $3, km_maquina_76 = $4,
           fecha_76 = COALESCE($5::date, fecha_76),
           hora_76 = COALESCE($6::time, hora_76),
           observacion_76 = $7,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE idtrazabilidad_76 = $8
       RETURNING idtrazabilidad_76`,
      [
        body.idmaquina_76,
        body.idconductor_76,
        body.idtecnico_76,
        body.km_maquina_76,
        body.fecha_76 || null,
        body.hora_76 || null,
        body.observacion_76?.trim() || null,
        req.params.id,
      ]
    );
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Intervención no encontrada' });
      return;
    }
    const id = Number(req.params.id);
    await client.query(`DELETE FROM tbl_77_d_montaje_neumatico WHERE idtrazabilidad_77 = $1`, [id]);
    await client.query(`DELETE FROM tbl_78_d_rotacion_neumatico WHERE idtrazabilidad_78 = $1`, [id]);
    await client.query(`DELETE FROM tbl_79_d_llanta_trazabilidad WHERE idtrazabilidad_79 = $1`, [id]);
    await client.query(`DELETE FROM tbl_80_d_baja_neumatico WHERE idtrazabilidad_80 = $1`, [id]);
    await insertarDetalles(client, id, body);
    // No reaplicar estados/historial: eso solo ocurre al crear.
    await client.query('COMMIT');

    const maestro = await pool.query(`${MAESTRO_SELECT} WHERE m.idtrazabilidad_76 = $1`, [id]);
    res.json({ success: true, data: maestro.rows[0], message: 'Intervención actualizada' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la intervención',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deleteTrazabilidadNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM ${MAESTRO} WHERE idtrazabilidad_76 = $1 RETURNING idtrazabilidad_76`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Intervención no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Intervención eliminada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la intervención',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
