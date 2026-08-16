import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PdfPrinter from 'pdfmake';
import type { PdfDocumentDefinition } from '../utils/pdfTypes.js';
import { pool } from '../db.js';
import {
  CreateMaestroEntregaEppDTO,
  DetalleEntregaEpp,
  MaestroEntregaEpp,
  UpdateMaestroEntregaEppDTO,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENCARGADO_BODEGA = {
  nombre: 'Ricardo Nuñez Anziani',
  rut: '10.050.993-8',
};

const EMPRESA_LEGAL = {
  nombre: 'Transporte Transantin',
  rut: '77.189.090-3',
};

function loadActaAssetDataUrl(fileName: string): string | null {
  try {
    const fullPath = path.join(__dirname, '../../assets/acta-epp', fileName);
    const base64 = fs.readFileSync(fullPath).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

async function cargarDatosActaEntrega(id: string) {
  const maestroRes = await pool.query(
    `${MAESTRO_SELECT} WHERE m.identregaepp_54 = $1`,
    [id]
  );
  if (maestroRes.rowCount === 0) return null;

  const m = maestroRes.rows[0];
  const detalleRes = await pool.query(
    `SELECT
       e.codigo_53 AS codigo,
       e.nombre_53 AS elemento,
       te.tipo_elemento_51 AS tipo,
       ce.categoria_52 AS categoria,
       d.cantidad_55 AS cantidad
     FROM ${TABLA_D} d
     INNER JOIN tbl_53_elemento e ON d.idelemento_55 = e.idelemento_53
     INNER JOIN tbl_51_tipo_elemento te ON e.idtipo_elemento_53 = te.idtipo_elemento_51
     INNER JOIN tbl_52_categoria_elemento ce ON e.idcategoria_53 = ce.idcategoria_elemento_52
     WHERE d.identregaepp_55 = $1
     ORDER BY e.codigo_53 ASC, e.nombre_53 ASC`,
    [id]
  );

  const fechaRaw = String(m.fecha_entrega_54).slice(0, 10);
  const [anioNum, mesNum, diaNum] = fechaRaw.split('-').map((n) => Number(n));
  const dia = diaNum || 1;
  const mes = MESES[(mesNum || 1) - 1] || 'enero';
  const anio = anioNum || new Date().getFullYear();

  const responsableNombre =
    (m.nombre_responsable_54 || m.responsable_nombre || ENCARGADO_BODEGA.nombre || '').trim() ||
    ENCARGADO_BODEGA.nombre;
  const responsableRut = (m.rut_responsable_54 || ENCARGADO_BODEGA.rut).trim();

  return {
    folio: m.folio_54 || '',
    intro: { dia, mes, anio },
    empresaLegal: EMPRESA_LEGAL,
    trabajador: {
      nombre: (m.trabajador_nombre || '').trim(),
      rut: m.trabajador_rut || '',
      cargo: m.cargo_nombre || '',
    },
    elementos: detalleRes.rows.map((r) => ({
      codigo: r.codigo || '',
      elemento: r.elemento || '',
      tipo: r.tipo || '',
      categoria: r.categoria || '',
      cantidad: Number(r.cantidad || 0),
    })),
    firmas: {
      trabajadorNombre: (m.trabajador_nombre || '').trim(),
      trabajadorRut: m.trabajador_rut || '',
      encargadoNombre: responsableNombre,
      encargadoRut: responsableRut,
    },
  };
}

const TABLA_M = 'tbl_54_m_entrega_epp';
const TABLA_D = 'tbl_55_d_entrega_epp';

const MOTIVOS = new Set([
  'DOTACION INICIAL',
  'REPOSICION',
  'RENUEVO',
  'PRIMERA VEZ',
  'CAMBIO DE CARGO',
]);
const ESTADOS_MAESTRO = new Set(['ENTREGADO', 'ANULADO', 'PENDIENTE_FIRMA']);
const ESTADOS_DETALLE = new Set(['NUEVO/A', 'BUENA', 'REGULAR', 'DANADA']);

const MAESTRO_SELECT = `
  SELECT
    m.identregaepp_54,
    m.folio_54,
    m.idtrabajador_54,
    m.idccosto_54,
    m.idempresa_54,
    m.idcargo_54,
    m.idresponsableentrega_54,
    m.fecha_entrega_54,
    m.hora_entrega_54,
    m.lugar_entrega_54,
    m.motivo_entrega_54,
    m.nombre_responsable_54,
    m.rut_responsable_54,
    m.observaciones_54,
    m.estado_54,
    m.creado_en,
    m.actualizado_en,
    CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre,
    t.ruttrabajador_06 AS trabajador_rut,
    emp.nombreempresa_15 AS empresa_nombre,
    car.cargo_14 AS cargo_nombre,
    cc.ccosto_45 AS ccosto_nombre,
    CONCAT(
      COALESCE(r.nombreresponsableentrega_08, ''), ' ',
      COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(r.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre
  FROM ${TABLA_M} m
  INNER JOIN tbl_06_trabajador t ON m.idtrabajador_54 = t.idtrabajador_06
  INNER JOIN tbl_15_empresas emp ON m.idempresa_54 = emp.idempresa_15
  INNER JOIN tbl_14_cargo car ON m.idcargo_54 = car.idcargo_14
  LEFT JOIN tbl_45_ccosto cc ON m.idccosto_54 = cc.id_ccosto_45
  LEFT JOIN tbl_08_responsable_entrega r ON m.idresponsableentrega_54 = r.idresponsableentrega_08
`;

const DETALLE_SELECT = `
  SELECT
    d.iddetalleentrega_55,
    d.identregaepp_55,
    d.idelemento_55,
    d.idtalla_55,
    d.idmarca_55,
    d.cantidad_55,
    d.valor_unitario_55,
    d.estadoentrega_55,
    d.observacion_55,
    d.creado_en,
    d.actualizado_en,
    e.codigo_53 AS elemento_codigo,
    e.nombre_53 AS elemento_nombre,
    e.stock_actual_53 AS elemento_stock,
    ta.talla_16 AS talla_nombre,
    mi.marca_insumo_37 AS marca_nombre
  FROM ${TABLA_D} d
  INNER JOIN tbl_53_elemento e ON d.idelemento_55 = e.idelemento_53
  LEFT JOIN tbl_16_tallas ta ON d.idtalla_55 = ta.id_16
  LEFT JOIN tbl_37_marca_insumo mi ON d.idmarca_55 = mi.id_marca_insumo_37
`;

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

function validarDetalles(
  detalles: CreateMaestroEntregaEppDTO['detalles']
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos un elemento EPP';
  const seen = new Set<number>();
  for (const d of detalles) {
    if (!d.idelemento_55) return 'Cada línea debe tener un elemento';
    if (seen.has(d.idelemento_55)) return 'No se puede repetir el mismo elemento en el detalle';
    seen.add(d.idelemento_55);
    if (!d.cantidad_55 || d.cantidad_55 < 1) return 'La cantidad debe ser mayor a 0';
    const estado = String(d.estadoentrega_55 || 'BUENA').toUpperCase();
    if (!ESTADOS_DETALLE.has(estado)) {
      return 'Estado de entrega inválido (NUEVO/A, BUENA, REGULAR, DANADA)';
    }
    if (d.valor_unitario_55 != null && Number(d.valor_unitario_55) < 0) {
      return 'El valor unitario no puede ser negativo';
    }
  }
  return null;
}

async function validarStock(
  client: { query: typeof pool.query },
  detalles: CreateMaestroEntregaEppDTO['detalles']
): Promise<string | null> {
  for (const d of detalles) {
    const result = await client.query<{
      codigo_53: string;
      nombre_53: string;
      stock_actual_53: number;
      activo_53: boolean;
    }>(
      `SELECT codigo_53, nombre_53, stock_actual_53, activo_53
       FROM tbl_53_elemento
       WHERE idelemento_53 = $1
       FOR UPDATE`,
      [d.idelemento_55]
    );

    if (result.rowCount === 0) {
      return `Elemento ${d.idelemento_55} no encontrado`;
    }

    const el = result.rows[0];
    const cant = Number(d.cantidad_55);

    if (!el.activo_53) {
      return `${el.codigo_53} está inactivo y no se puede entregar`;
    }
    if (Number(el.stock_actual_53) < cant) {
      return `${el.codigo_53} sin stock suficiente (disponible: ${el.stock_actual_53}, solicitado: ${cant})`;
    }
  }
  return null;
}

async function insertarDetalles(
  client: { query: typeof pool.query },
  idMaestro: number,
  detalles: CreateMaestroEntregaEppDTO['detalles']
): Promise<void> {
  for (const d of detalles) {
    let valor = d.valor_unitario_55 ?? null;
    if (valor == null) {
      const el = await client.query<{ valor_unitario_53: number | null }>(
        'SELECT valor_unitario_53 FROM tbl_53_elemento WHERE idelemento_53 = $1',
        [d.idelemento_55]
      );
      valor = el.rows[0]?.valor_unitario_53 ?? 0;
    }

    await client.query(
      `INSERT INTO ${TABLA_D} (
        identregaepp_55, idelemento_55, idtalla_55, idmarca_55,
        cantidad_55, valor_unitario_55, estadoentrega_55, observacion_55
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        idMaestro,
        d.idelemento_55,
        d.idtalla_55 || null,
        d.idmarca_55 || null,
        d.cantidad_55,
        valor,
        String(d.estadoentrega_55 || 'BUENA').toUpperCase(),
        d.observacion_55?.trim() ? String(d.observacion_55).trim().toUpperCase() : null,
      ]
    );
  }
}

export const getAllEntregasEpp = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroEntregaEpp>(
      `${MAESTRO_SELECT} ORDER BY m.fecha_entrega_54 DESC, m.identregaepp_54 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener entregas EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getEntregaEppById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestroResult = await pool.query<MaestroEntregaEpp>(
      `${MAESTRO_SELECT} WHERE m.identregaepp_54 = $1`,
      [id]
    );
    if (maestroResult.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Entrega EPP no encontrada' });
      return;
    }
    const detallesResult = await pool.query<DetalleEntregaEpp>(
      `${DETALLE_SELECT} WHERE d.identregaepp_55 = $1 ORDER BY e.nombre_53 ASC`,
      [id]
    );
    res.json({
      success: true,
      data: { maestro: maestroResult.rows[0], detalles: detallesResult.rows },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la entrega EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createEntregaEpp = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateMaestroEntregaEppDTO = req.body;
    const motivo = normalizeText(body.motivo_entrega_54) || 'DOTACION INICIAL';
    const estado = normalizeText(body.estado_54) || 'ENTREGADO';

    if (!body.idtrabajador_54) {
      res.status(400).json({ success: false, error: 'Trabajador es requerido' });
      return;
    }
    if (!body.idempresa_54) {
      res.status(400).json({ success: false, error: 'Empresa es requerida' });
      return;
    }
    if (!body.idcargo_54) {
      res.status(400).json({ success: false, error: 'Cargo es requerido' });
      return;
    }
    if (!body.fecha_entrega_54) {
      res.status(400).json({ success: false, error: 'Fecha de entrega es requerida' });
      return;
    }
    if (!MOTIVOS.has(motivo)) {
      res.status(400).json({ success: false, error: 'Motivo de entrega inválido' });
      return;
    }
    if (!ESTADOS_MAESTRO.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado de entrega inválido' });
      return;
    }

    const detalleError = validarDetalles(body.detalles);
    if (detalleError) {
      res.status(400).json({ success: false, error: detalleError });
      return;
    }

    await client.query('BEGIN');

    const stockError = await validarStock(client, body.detalles);
    if (stockError) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: stockError });
      return;
    }

    const insertM = await client.query(
      `INSERT INTO ${TABLA_M} (
        folio_54, idtrabajador_54, idccosto_54, idempresa_54, idcargo_54,
        idresponsableentrega_54, fecha_entrega_54, hora_entrega_54, lugar_entrega_54,
        motivo_entrega_54, nombre_responsable_54, rut_responsable_54,
        observaciones_54, estado_54
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, COALESCE($8::time, CURRENT_TIME), $9,
        $10, $11, $12,
        $13, $14
      ) RETURNING identregaepp_54`,
      [
        body.folio_54?.trim() || null,
        body.idtrabajador_54,
        body.idccosto_54 || null,
        body.idempresa_54,
        body.idcargo_54,
        body.idresponsableentrega_54 || null,
        body.fecha_entrega_54,
        body.hora_entrega_54 || null,
        normalizeText(body.lugar_entrega_54),
        motivo,
        normalizeText(body.nombre_responsable_54),
        body.rut_responsable_54?.trim() || null,
        body.observaciones_54?.trim() || null,
        estado,
      ]
    );
    const idMaestro = insertM.rows[0].identregaepp_54;

    await insertarDetalles(client, idMaestro, body.detalles);

    await client.query('COMMIT');

    const maestro = await pool.query<MaestroEntregaEpp>(
      `${MAESTRO_SELECT} WHERE m.identregaepp_54 = $1`,
      [idMaestro]
    );
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: 'Entrega EPP creada exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear entrega EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const updateEntregaEpp = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroEntregaEppDTO = req.body;

    const exists = await client.query(
      `SELECT identregaepp_54, estado_54 FROM ${TABLA_M} WHERE identregaepp_54 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Entrega EPP no encontrada' });
      return;
    }

    if (exists.rows[0].estado_54 === 'ANULADO') {
      res.status(400).json({ success: false, error: 'No se puede editar una entrega anulada' });
      return;
    }

    if (body.motivo_entrega_54 !== undefined) {
      const motivo = normalizeText(body.motivo_entrega_54);
      if (!motivo || !MOTIVOS.has(motivo)) {
        res.status(400).json({ success: false, error: 'Motivo de entrega inválido' });
        return;
      }
    }
    if (body.estado_54 !== undefined) {
      const estado = normalizeText(body.estado_54);
      if (!estado || !ESTADOS_MAESTRO.has(estado)) {
        res.status(400).json({ success: false, error: 'Estado de entrega inválido' });
        return;
      }
    }
    if (body.detalles !== undefined) {
      const detalleError = validarDetalles(body.detalles);
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

    if (body.folio_54 !== undefined) push('folio_54', body.folio_54?.trim() || null);
    if (body.idtrabajador_54 !== undefined) push('idtrabajador_54', body.idtrabajador_54);
    if (body.idccosto_54 !== undefined) push('idccosto_54', body.idccosto_54 || null);
    if (body.idempresa_54 !== undefined) push('idempresa_54', body.idempresa_54);
    if (body.idcargo_54 !== undefined) push('idcargo_54', body.idcargo_54);
    if (body.idresponsableentrega_54 !== undefined) {
      push('idresponsableentrega_54', body.idresponsableentrega_54 || null);
    }
    if (body.fecha_entrega_54 !== undefined) push('fecha_entrega_54', body.fecha_entrega_54);
    if (body.hora_entrega_54 !== undefined) push('hora_entrega_54', body.hora_entrega_54 || null);
    if (body.lugar_entrega_54 !== undefined) push('lugar_entrega_54', normalizeText(body.lugar_entrega_54));
    if (body.motivo_entrega_54 !== undefined) {
      push('motivo_entrega_54', normalizeText(body.motivo_entrega_54));
    }
    if (body.nombre_responsable_54 !== undefined) {
      push('nombre_responsable_54', normalizeText(body.nombre_responsable_54));
    }
    if (body.rut_responsable_54 !== undefined) {
      push('rut_responsable_54', body.rut_responsable_54?.trim() || null);
    }
    if (body.observaciones_54 !== undefined) {
      push('observaciones_54', body.observaciones_54?.trim() || null);
    }
    if (body.estado_54 !== undefined) push('estado_54', normalizeText(body.estado_54));

    if (updates.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE ${TABLA_M} SET ${updates.join(', ')} WHERE identregaepp_54 = $${idx}`,
        values
      );
    }

    if (body.detalles !== undefined) {
      // Restore stock via trigger, then validate against restored stock, then insert
      await client.query(`DELETE FROM ${TABLA_D} WHERE identregaepp_55 = $1`, [id]);

      const stockError = await validarStock(client, body.detalles);
      if (stockError) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: stockError });
        return;
      }

      await insertarDetalles(client, Number(id), body.detalles);
    }

    await client.query('COMMIT');

    const maestro = await pool.query<MaestroEntregaEpp>(
      `${MAESTRO_SELECT} WHERE m.identregaepp_54 = $1`,
      [id]
    );
    res.json({
      success: true,
      data: maestro.rows[0],
      message: 'Entrega EPP actualizada exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar entrega EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deleteEntregaEpp = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const exists = await client.query(
      `SELECT identregaepp_54, estado_54 FROM ${TABLA_M} WHERE identregaepp_54 = $1 FOR UPDATE`,
      [id]
    );
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Entrega EPP no encontrada' });
      return;
    }

    if (exists.rows[0].estado_54 === 'ANULADO') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'La entrega ya está anulada' });
      return;
    }

    // Soft-anular: estado ANULADO + borrar detalles para restaurar stock vía trigger
    await client.query(
      `UPDATE ${TABLA_M} SET estado_54 = 'ANULADO' WHERE identregaepp_54 = $1`,
      [id]
    );
    await client.query(`DELETE FROM ${TABLA_D} WHERE identregaepp_55 = $1`, [id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Entrega EPP anulada exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al anular entrega EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

/** JSON para vista previa del registro de entrega EPP */
export const getActaDatosEntregaEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await cargarDatosActaEntrega(id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Entrega EPP no encontrada' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del acta EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/** PDF: Registro de Entrega de Elementos de Protección Personal */
export const generarActaEntregaEppPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await cargarDatosActaEntrega(id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Entrega EPP no encontrada' });
      return;
    }

    const logoDataUrl = loadActaAssetDataUrl('logo-transantin.png');
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    const printer = new PdfPrinter(fonts);

    const tableBody: any[] = [
      [
        { text: 'Código', style: 'th', alignment: 'center' },
        { text: 'Elemento', style: 'th', alignment: 'center' },
        { text: 'Tipo', style: 'th', alignment: 'center' },
        { text: 'Categoría', style: 'th', alignment: 'center' },
        { text: 'Cant.', style: 'th', alignment: 'center' },
      ],
    ];

    if (data.elementos.length === 0) {
      tableBody.push([
        { text: '-', style: 'td', alignment: 'center' },
        { text: 'Sin elementos', style: 'td', alignment: 'center' },
        { text: '-', style: 'td', alignment: 'center' },
        { text: '-', style: 'td', alignment: 'center' },
        { text: '-', style: 'td', alignment: 'center' },
      ]);
    } else {
      data.elementos.forEach((e) => {
        tableBody.push([
          { text: e.codigo, style: 'td', alignment: 'center' },
          { text: e.elemento, style: 'td' },
          { text: e.tipo, style: 'td' },
          { text: e.categoria, style: 'td' },
          { text: String(e.cantidad), style: 'td', alignment: 'center' },
        ]);
      });
    }

    const compromisos = [
      'Utilizar en forma permanente los elementos de protección personal entregados, de acuerdo a las funciones que desempeño.',
      'Haber recibido instrucción sobre el uso correcto y mantención de dichos elementos.',
      'Mantener los elementos en buen estado y comunicar de inmediato cualquier deterioro, daño o pérdida.',
      'No modificar los elementos ni utilizarlos para fines distintos a los diseñados.',
      'Entender que el uso de EPP es una medida de seguridad obligatoria y que su omisión puede generar riesgos para mi integridad.',
      'Que la pérdida o deterioro por negligencia puede dar lugar a medidas disciplinarias conforme al reglamento interno.',
      'Que en caso de extravío de uniformes, el valor será descontado al trabajador.',
    ];

    const headerCols: any[] = [];
    if (logoDataUrl) {
      headerCols.push({ image: logoDataUrl, width: 110, margin: [0, 0, 12, 0] });
    } else {
      headerCols.push({
        text: 'TranSantin',
        fontSize: 14,
        bold: true,
        color: '#1565c0',
        width: 110,
      });
    }
    headerCols.push({
      text: 'REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL',
      fontSize: 12,
      bold: true,
      alignment: 'center',
      margin: [0, 8, 0, 0],
      width: '*',
    });

    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'LETTER',
      pageMargins: [48, 40, 48, 40],
      content: [
        { columns: headerCols, margin: [0, 0, 0, 16] },
        {
          text: `A ${data.intro.dia} de ${data.intro.mes} de ${data.intro.anio}`,
          fontSize: 10,
          margin: [0, 0, 0, 10],
        },
        {
          text:
            `${EMPRESA_LEGAL.nombre}, RUT ${EMPRESA_LEGAL.rut}, en cumplimiento de la Ley N° 16.744, ` +
            `el Decreto Supremo N° 44 y el reglamento interno de la empresa, hace entrega de Elementos de Protección Personal (EPP) al trabajador que se individualiza a continuación:`,
          fontSize: 9,
          alignment: 'justify',
          lineHeight: 1.35,
          margin: [0, 0, 0, 12],
        },
        {
          text: [
            { text: 'Trabajador: ', bold: true },
            `${data.trabajador.nombre}\n`,
            { text: 'Cédula de Identidad: ', bold: true },
            `${data.trabajador.rut}\n`,
            { text: 'Cargo: ', bold: true },
            `${data.trabajador.cargo}`,
          ],
          fontSize: 10,
          margin: [0, 0, 0, 12],
        },
        {
          table: {
            headerRows: 1,
            widths: [70, '*', 90, 90, 40],
            body: tableBody,
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => '#666666',
            vLineColor: () => '#666666',
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#eceff1' : null),
          },
          margin: [0, 0, 0, 14],
        },
        {
          text: 'Declaración del trabajador',
          bold: true,
          fontSize: 11,
          margin: [0, 4, 0, 6],
        },
        {
          text:
            'Declaro haber recibido conforme los Elementos de Protección Personal individualizados en este documento, ' +
            'en buen estado y aptos para su uso, y me comprometo a:',
          fontSize: 9,
          alignment: 'justify',
          margin: [0, 0, 0, 6],
        },
        {
          ul: compromisos,
          fontSize: 9,
          margin: [0, 0, 0, 16],
        },
        {
          text: 'Firmado digitalmente por:',
          bold: true,
          fontSize: 10,
          margin: [0, 8, 0, 8],
        },
        {
          text: `Trabajador: ${data.firmas.trabajadorNombre}, cédula de identidad ${data.firmas.trabajadorRut}`,
          fontSize: 9,
          margin: [0, 0, 0, 4],
        },
        {
          text: `Encargado de Bodega: ${data.firmas.encargadoNombre}, cédula de identidad ${data.firmas.encargadoRut}`,
          fontSize: 9,
        },
        data.folio
          ? {
              text: `Folio: ${data.folio}`,
              fontSize: 8,
              color: '#666666',
              margin: [0, 16, 0, 0],
            }
          : { text: '' },
      ],
      styles: {
        th: { fontSize: 8, bold: true, margin: [3, 4, 3, 4] },
        td: { fontSize: 8, margin: [3, 4, 3, 4] },
      },
      defaultStyle: { font: 'Roboto', fontSize: 9 },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=registro-entrega-epp-${data.folio || id}.pdf`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar el PDF de entrega EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
