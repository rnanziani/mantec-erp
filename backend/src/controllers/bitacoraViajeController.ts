import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import { pool } from '../db.js';

const COMBUSTIBLE = new Set(['E', '1/4', '1/2', '3/4', 'F']);
const LIMPIEZA = new Set(['Limpio', 'Sucio']);

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function upper(value: unknown, max?: number): string | null {
  if (value == null) return null;
  const t = String(value).trim().toUpperCase();
  if (!t) return null;
  return max ? t.slice(0, max) : t;
}

type ControlIn = {
  kilometraje_97: number;
  nivel_combustible_97: string;
  estado_limpieza_97: string;
  tiene_danos_97: boolean;
  descripcion_danos_97: string | null;
  observaciones_97: string | null;
  id_responsable_entrega_97: number;
};

function parseControl(raw: unknown): ControlIn | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const km = num(body.kilometraje_97);
  const comb = String(body.nivel_combustible_97 || '').trim();
  const limpia = String(body.estado_limpieza_97 || 'Limpio').trim();
  const idResp = num(body.id_responsable_entrega_97);
  if (km < 0 || !COMBUSTIBLE.has(comb) || !LIMPIEZA.has(limpia) || !idResp) return null;
  return {
    kilometraje_97: km,
    nivel_combustible_97: comb,
    estado_limpieza_97: limpia,
    tiene_danos_97: body.tiene_danos_97 === true,
    descripcion_danos_97: upper(body.descripcion_danos_97),
    observaciones_97: upper(body.observaciones_97),
    id_responsable_entrega_97: idResp,
  };
}

const SELECT_CAB = `
  SELECT b.*,
         v.patente_95,
         v.marca_95,
         v.modelo_95,
         v.kilometraje_actual_95,
         v.estado_vehiculo_95,
         TRIM(CONCAT_WS(' ', t.nombre_06, t.apaterno_06, t.amaterno_06)) AS conductor_nombre,
         t.ruttrabajador_06,
         TRIM(CONCAT_WS(' ', r.nombreresponsableentrega_08, r.apaternoresponsableentrega_08)) AS autoriza_nombre
  FROM tbl_96_bitacora_viaje b
  JOIN tbl_95_vehiculo v ON b.id_vehiculo_96 = v.id_vehiculo_95
  JOIN tbl_06_trabajador t ON b.id_conductor_96 = t.idtrabajador_06
  JOIN tbl_08_responsable_entrega r ON b.id_responsable_autoriza_96 = r.idresponsableentrega_08
`;

async function cargarBitacora(id: string | number) {
  const cab = await pool.query(`${SELECT_CAB} WHERE b.id_bitacora_96 = $1`, [id]);
  if ((cab.rowCount ?? 0) === 0) return null;
  const det = await pool.query(
    `SELECT c.*,
            TRIM(CONCAT_WS(' ', r.nombreresponsableentrega_08, r.apaternoresponsableentrega_08)) AS responsable_nombre
     FROM tbl_97_control_estado_vehiculo c
     JOIN tbl_08_responsable_entrega r ON c.id_responsable_entrega_97 = r.idresponsableentrega_08
     WHERE c.id_bitacora_97 = $1
     ORDER BY c.tipo_control_97`,
    [id]
  );
  return { ...cab.rows[0], controles: det.rows };
}

async function insertControl(client: PoolClient, idBitacora: number, tipo: 'SALIDA' | 'REGRESO', c: ControlIn) {
  await client.query(
    `INSERT INTO tbl_97_control_estado_vehiculo (
       id_bitacora_97, tipo_control_97, kilometraje_97, nivel_combustible_97,
       estado_limpieza_97, tiene_danos_97, descripcion_danos_97, observaciones_97, id_responsable_entrega_97
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      idBitacora,
      tipo,
      c.kilometraje_97,
      c.nivel_combustible_97,
      c.estado_limpieza_97,
      c.tiene_danos_97,
      c.descripcion_danos_97,
      c.observaciones_97,
      c.id_responsable_entrega_97,
    ]
  );
  await client.query(
    `UPDATE tbl_95_vehiculo SET kilometraje_actual_95 = $2 WHERE id_vehiculo_95 = (
       SELECT id_vehiculo_96 FROM tbl_96_bitacora_viaje WHERE id_bitacora_96 = $1
     )`,
    [idBitacora, c.kilometraje_97]
  );
}

export const getAllBitacoras = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`${SELECT_CAB} ORDER BY b.fecha_hora_salida_96 DESC, b.id_bitacora_96 DESC`);
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener bitácoras',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getVerificadorFlota = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_control_flota ORDER BY fecha_hora_salida_96 DESC, id_bitacora_96 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el verificador de flota',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getBitacoraById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await cargarBitacora(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Bitácora no encontrada' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la bitácora',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createBitacora = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const idVehiculo = num(req.body.id_vehiculo_96);
    const idConductor = num(req.body.id_conductor_96);
    const idAutoriza = num(req.body.id_responsable_autoriza_96);
    const salida = parseControl(req.body.salida);
    if (!idVehiculo || !idConductor || !idAutoriza || !salida) {
      res.status(400).json({
        success: false,
        error: 'Vehículo, conductor, quien autoriza y el control de SALIDA son requeridos',
      });
      return;
    }

    const veh = await pool.query(
      `SELECT kilometraje_actual_95, estado_vehiculo_95 FROM tbl_95_vehiculo WHERE id_vehiculo_95 = $1`,
      [idVehiculo]
    );
    if ((veh.rowCount ?? 0) === 0) {
      res.status(400).json({ success: false, error: 'Vehículo no encontrado' });
      return;
    }
    if (veh.rows[0].estado_vehiculo_95 !== 'Activo') {
      res.status(400).json({ success: false, error: 'Solo sale un vehículo Activo' });
      return;
    }
    const kmActual = num(veh.rows[0].kilometraje_actual_95);
    if (salida.kilometraje_97 < kmActual) {
      res.status(400).json({
        success: false,
        error: `El km de salida (${salida.kilometraje_97}) no puede ser menor al actual (${kmActual})`,
      });
      return;
    }

    await client.query('BEGIN');
    const cab = await client.query(
      `INSERT INTO tbl_96_bitacora_viaje (
         id_vehiculo_96, id_conductor_96, id_responsable_autoriza_96,
         motivo_salida_96, destino_96, fecha_hora_salida_96
       ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamp, CURRENT_TIMESTAMP))
       RETURNING id_bitacora_96`,
      [
        idVehiculo,
        idConductor,
        idAutoriza,
        upper(req.body.motivo_salida_96),
        upper(req.body.destino_96, 150),
        req.body.fecha_hora_salida_96 || null,
      ]
    );
    const idBitacora = cab.rows[0].id_bitacora_96 as number;
    await insertControl(client, idBitacora, 'SALIDA', salida);
    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      data: await cargarBitacora(idBitacora),
      message: 'Salida registrada. El vehículo queda En Curso',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /uk_96_vehiculo_en_curso/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Ese vehículo ya tiene un viaje En Curso' : 'Error al registrar la salida',
      message: msg,
    });
  } finally {
    client.release();
  }
};

export const registrarRegreso = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const id = num(req.params.id);
    const regreso = parseControl(req.body);
    if (!regreso) {
      res.status(400).json({ success: false, error: 'Complete km, combustible y quién recepciona' });
      return;
    }
    await client.query('BEGIN');
    const cab = await client.query(
      `SELECT estado_bitacora_96 FROM tbl_96_bitacora_viaje WHERE id_bitacora_96 = $1 FOR UPDATE`,
      [id]
    );
    if ((cab.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Bitácora no encontrada' });
      return;
    }
    if (cab.rows[0].estado_bitacora_96 !== 'En Curso') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Solo se registra regreso de un viaje En Curso' });
      return;
    }
    const sal = await client.query(
      `SELECT kilometraje_97 FROM tbl_97_control_estado_vehiculo
       WHERE id_bitacora_97 = $1 AND tipo_control_97 = 'SALIDA'`,
      [id]
    );
    const kmSalida = num(sal.rows[0]?.kilometraje_97);
    if (regreso.kilometraje_97 < kmSalida) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: `El km de regreso (${regreso.kilometraje_97}) no puede ser menor al de salida (${kmSalida})`,
      });
      return;
    }
    await insertControl(client, id, 'REGRESO', regreso);
    await client.query(
      `UPDATE tbl_96_bitacora_viaje
       SET estado_bitacora_96 = 'Finalizado',
           fecha_hora_regreso_96 = COALESCE($2::timestamp, CURRENT_TIMESTAMP)
       WHERE id_bitacora_96 = $1`,
      [id, req.body.fecha_hora_regreso_96 || null]
    );
    await client.query('COMMIT');
    res.json({ success: true, data: await cargarBitacora(id), message: 'Regreso registrado' });
  } catch (error) {
    await client.query('ROLLBACK');
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /uk_97_bitacora_tipo/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Este viaje ya tiene control de REGRESO' : 'Error al registrar el regreso',
      message: msg,
    });
  } finally {
    client.release();
  }
};

export const updateBitacora = async (req: Request, res: Response): Promise<void> => {
  try {
    const actual = await cargarBitacora(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Bitácora no encontrada' });
      return;
    }
    const idConductor = num(req.body.id_conductor_96);
    const idAutoriza = num(req.body.id_responsable_autoriza_96);
    if (!idConductor || !idAutoriza) {
      res.status(400).json({ success: false, error: 'Conductor y quien autoriza son requeridos' });
      return;
    }
    await pool.query(
      `UPDATE tbl_96_bitacora_viaje
       SET id_conductor_96 = $1,
           id_responsable_autoriza_96 = $2,
           destino_96 = $3,
           motivo_salida_96 = $4
       WHERE id_bitacora_96 = $5`,
      [
        idConductor,
        idAutoriza,
        upper(req.body.destino_96, 150),
        upper(req.body.motivo_salida_96),
        req.params.id,
      ]
    );
    res.json({
      success: true,
      data: await cargarBitacora(req.params.id),
      message: 'Datos del viaje actualizados',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la bitácora',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const anularBitacora = async (req: Request, res: Response): Promise<void> => {
  try {
    const actual = await cargarBitacora(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Bitácora no encontrada' });
      return;
    }
    if (actual.estado_bitacora_96 !== 'En Curso') {
      res.status(400).json({ success: false, error: 'Solo se anula un viaje En Curso' });
      return;
    }
    await pool.query(
      `UPDATE tbl_96_bitacora_viaje SET estado_bitacora_96 = 'Anulado' WHERE id_bitacora_96 = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: await cargarBitacora(req.params.id), message: 'Viaje anulado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al anular la bitácora',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteBitacora = async (req: Request, res: Response): Promise<void> => {
  try {
    const actual = await cargarBitacora(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Bitácora no encontrada' });
      return;
    }
    if (actual.estado_bitacora_96 === 'Finalizado') {
      res.status(400).json({ success: false, error: 'No se elimina un viaje finalizado. Queda en el verificador.' });
      return;
    }
    await pool.query('DELETE FROM tbl_96_bitacora_viaje WHERE id_bitacora_96 = $1', [req.params.id]);
    res.json({ success: true, message: 'Bitácora eliminada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la bitácora',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
