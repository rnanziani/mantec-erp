import { Request, Response } from 'express';
import PdfPrinter from 'pdfmake';
import { pool } from '../db.js';
import type { PdfDocumentDefinition } from '../utils/pdfTypes.js';

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
    m.balanceo_76,
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
    balanceo_76?: boolean;
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
        (cod_neumatico_34, id_conductor_34, id_maquina_34, kilometraje_34, id_tecnico_34, balanceo_34, fecha_movimiento_34, observaciones_34)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), $8)`,
      [codigo, cab.idconductor_76, cab.idmaquina_76, cab.km_maquina_76, cab.idtecnico_76, cab.balanceo_76 === true, fechaMov, obs]
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
    `SELECT d.*, n.cod_neumatico_31 AS neumatico_codigo, mk.marca_32 AS neumatico_marca,
            p.codigo_73 AS posicion_codigo
     FROM tbl_77_d_montaje_neumatico d
     JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_77
     LEFT JOIN tbl_32_marca_neumatico mk ON mk.id_marca_32 = n.id_marca_31
     JOIN tbl_73_posicion_neumatico p ON p.idposicion_73 = d.idposicion_77
     WHERE d.idtrazabilidad_77 = $1 ORDER BY d.iddetalle_77`,
    [id]
  );
  const rotaciones = await pool.query(
    `SELECT d.*, n.cod_neumatico_31 AS neumatico_codigo, mk.marca_32 AS neumatico_marca,
            po.codigo_73 AS posicion_origen_codigo, pd.codigo_73 AS posicion_destino_codigo,
            pat.codigo_patron_35 AS patron_codigo
     FROM tbl_78_d_rotacion_neumatico d
     JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_78
     LEFT JOIN tbl_32_marca_neumatico mk ON mk.id_marca_32 = n.id_marca_31
     JOIN tbl_73_posicion_neumatico po ON po.idposicion_73 = d.idposicion_origen_78
     JOIN tbl_73_posicion_neumatico pd ON pd.idposicion_73 = d.idposicion_destino_78
     LEFT JOIN tbl_35_patron_rotacion pat ON pat.id_patron_35 = d.idpatron_78
     WHERE d.idtrazabilidad_78 = $1 ORDER BY d.iddetalle_78`,
    [id]
  );
  const llantas = await pool.query(
    `SELECT d.*, l.descripcion_llanta_36 AS llanta_descripcion, l.codigo_36 AS llanta_codigo,
            dn.codigo_75 AS dano_codigo, dn.descripcion_75 AS dano_descripcion
     FROM tbl_79_d_llanta_trazabilidad d
     JOIN tbl_36_llanta l ON l.id_llanta_36 = d.idllanta_79
     LEFT JOIN tbl_75_tipo_dano_llanta dn ON dn.iddano_llanta_75 = d.iddano_llanta_79
     WHERE d.idtrazabilidad_79 = $1 ORDER BY d.iddetalle_79`,
    [id]
  );
  const bajas = await pool.query(
    `SELECT d.*, n.cod_neumatico_31 AS neumatico_codigo, mk.marca_32 AS neumatico_marca,
            dn.codigo_74 AS dano_codigo, dn.descripcion_74 AS dano_descripcion
     FROM tbl_80_d_baja_neumatico d
     JOIN tbl_31_neumatico n ON n.id_neumatico_31 = d.idneumatico_80
     LEFT JOIN tbl_32_marca_neumatico mk ON mk.id_marca_32 = n.id_marca_31
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
      balanceo_76?: boolean;
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
         idmaquina_76, idconductor_76, idtecnico_76, km_maquina_76, fecha_76, hora_76, observacion_76, balanceo_76
       ) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), COALESCE($6::time, CURRENT_TIME), $7, $8)
       RETURNING idtrazabilidad_76`,
      [
        body.idmaquina_76,
        body.idconductor_76,
        body.idtecnico_76,
        body.km_maquina_76,
        body.fecha_76 || null,
        body.hora_76 || null,
        body.observacion_76?.trim() || null,
        body.balanceo_76 === true,
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
      balanceo_76?: boolean;
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
           balanceo_76 = $8,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE idtrazabilidad_76 = $9
       RETURNING idtrazabilidad_76`,
      [
        body.idmaquina_76,
        body.idconductor_76,
        body.idtecnico_76,
        body.km_maquina_76,
        body.fecha_76 || null,
        body.hora_76 || null,
        body.observacion_76?.trim() || null,
        body.balanceo_76 === true,
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

function txt(v: unknown): string {
  if (v == null || v === '') return '—';
  return String(v);
}

function formatKmPdf(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('es-CL');
}

function formatFechaPdf(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  return s.slice(0, 10);
}

function formatHoraPdf(v: unknown): string {
  if (!v) return '—';
  return String(v).slice(0, 5);
}

function stampArchivoActa(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const normalized = formatted.replace('T', ' ');
  const [fechaPart, horaPart = '00:00'] = normalized.split(' ');
  const [anio, mes, dia] = fechaPart.split('-');
  const [hh, mm] = horaPart.split(':');
  return `${anio.slice(-2)}${mes}${dia}_${hh}${mm}`;
}

function headerRow(cols: string[]) {
  return cols.map((c) => ({
    text: c,
    bold: true,
    color: 'white',
    fillColor: '#1e3a5f',
    fontSize: 8,
  }));
}

function emptyRow(colSpan: number) {
  return [{ text: 'Sin líneas', colSpan, alignment: 'center', italics: true, color: '#666' }, ...Array.from({ length: colSpan - 1 }, () => ({}))];
}

function sectionTable(title: string, headers: string[], rows: unknown[][]) {
  const body = [headerRow(headers), ...(rows.length ? rows : [emptyRow(headers.length)])];
  return [
    { text: title, style: 'sectionTitle', margin: [0, 10, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: headers.map(() => '*'),
        body,
      },
      layout: 'lightHorizontalLines',
    },
  ];
}

export const generarActaTrazabilidadPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ success: false, error: 'Identificador inválido' });
      return;
    }
    const maestroRes = await pool.query(`${MAESTRO_SELECT} WHERE m.idtrazabilidad_76 = $1`, [id]);
    if (maestroRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Intervención no encontrada' });
      return;
    }
    const m = maestroRes.rows[0] as Record<string, unknown>;
    const d = await cargarDetalles(id);

    const cabecera = {
      table: {
        widths: [120, '*', 90, '*'],
        body: [
          [
            { text: 'Folio', bold: true, fillColor: '#e8eef5' },
            txt(m.folio_76),
            { text: 'Fecha', bold: true, fillColor: '#e8eef5' },
            `${formatFechaPdf(m.fecha_76)} ${formatHoraPdf(m.hora_76)}`,
          ],
          [
            { text: 'Máquina', bold: true, fillColor: '#e8eef5' },
            `${txt(m.maquina_numinterno)}  ${txt(m.maquina_ppu)}`,
            { text: 'Odómetro', bold: true, fillColor: '#e8eef5' },
            formatKmPdf(m.km_maquina_76),
          ],
          [
            { text: 'Conductor', bold: true, fillColor: '#e8eef5' },
            txt(m.conductor_nombre),
            { text: 'Técnico', bold: true, fillColor: '#e8eef5' },
            txt(m.tecnico_nombre),
          ],
          [
            { text: 'Balanceo', bold: true, fillColor: '#e8eef5' },
            m.balanceo_76 === true ? 'SÍ' : 'NO',
            { text: 'Observación', bold: true, fillColor: '#e8eef5' },
            txt(m.observacion_76),
          ],
        ],
      },
      layout: 'lightHorizontalLines',
    };

    const montajes = (d.montajes as Array<Record<string, unknown>>).map((x) => [
      txt(x.neumatico_codigo),
      txt(x.neumatico_marca),
      txt(x.posicion_codigo),
    ]);
    const rotaciones = (d.rotaciones as Array<Record<string, unknown>>).map((x) => [
      txt(x.neumatico_codigo),
      txt(x.neumatico_marca),
      txt(x.posicion_origen_codigo),
      txt(x.posicion_destino_codigo),
      txt(x.patron_codigo),
    ]);
    const llantas = (d.llantas as Array<Record<string, unknown>>).map((x) => [
      txt(x.llanta_codigo || x.llanta_descripcion),
      txt(x.dano_codigo),
    ]);
    const bajas = (d.bajas as Array<Record<string, unknown>>).map((x) => [
      txt(x.neumatico_codigo),
      txt(x.neumatico_marca),
      txt(x.dano_codigo),
    ]);

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    const printer = new PdfPrinter(fonts);
    const folio = txt(m.folio_76).replace(/[^\w-]/g, '_');
    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'LETTER',
      pageMargins: [36, 36, 36, 40],
      content: [
        { text: 'ACTA DE INTERVENCIÓN — TRAZABILIDAD DE NEUMÁTICOS', style: 'title' },
        { text: 'Cabecera', style: 'sectionTitle', margin: [0, 8, 0, 4] },
        cabecera,
        ...sectionTable('1. Montaje (neumático nuevo)', ['Neumático', 'Marca', 'Posición'], montajes),
        ...sectionTable('2. Rotación (usado)', ['Neumático', 'Marca', 'Origen', 'Destino', 'Patrón'], rotaciones),
        ...sectionTable('3. Llanta', ['Llanta', 'Daño'], llantas),
        ...sectionTable('4. Baja', ['Neumático', 'Marca', 'Daño'], bajas),
        {
          text: 'El conductor corresponde a quien conducía en esta intervención, no necesariamente al responsable del daño.',
          style: 'nota',
          margin: [0, 14, 0, 0],
        },
      ],
      styles: {
        title: { fontSize: 13, bold: true, color: '#1e3a5f', alignment: 'center' },
        sectionTitle: { fontSize: 10, bold: true, color: '#1e3a5f' },
        nota: { fontSize: 8, italics: true, color: '#555' },
      },
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      footer: (currentPage: number, pageCount: number) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#666',
        margin: [0, 8, 0, 0],
      }),
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const filename = `ACTA_${folio}_${stampArchivoActa()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error('Error al generar acta de trazabilidad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el acta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
