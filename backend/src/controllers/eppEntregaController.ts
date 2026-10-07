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

/** Extrae día/mes/año de fecha_entrega (DATE de PG o string YYYY-MM-DD). */
function partesFechaEntrega(value: Date | string | null | undefined): {
  dia: number;
  mes: string;
  anio: number;
} {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // node-pg entrega DATE en medianoche UTC; usar UTC evita correr el día
    return {
      dia: value.getUTCDate(),
      mes: MESES[value.getUTCMonth()] || 'enero',
      anio: value.getUTCFullYear(),
    };
  }

  const raw = String(value ?? '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const anio = Number(iso[1]);
    const mesNum = Number(iso[2]);
    const dia = Number(iso[3]);
    return {
      dia,
      mes: MESES[mesNum - 1] || 'enero',
      anio,
    };
  }

  const hoy = new Date();
  return {
    dia: hoy.getDate(),
    mes: MESES[hoy.getMonth()] || 'enero',
    anio: hoy.getFullYear(),
  };
}

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
       COALESCE(ta.talla_16, '') AS talla,
       d.cantidad_55 AS cantidad
     FROM ${TABLA_D} d
     INNER JOIN tbl_53_elemento e ON d.idelemento_55 = e.idelemento_53
     INNER JOIN tbl_51_tipo_elemento te ON e.idtipo_elemento_53 = te.idtipo_elemento_51
     INNER JOIN tbl_52_categoria_elemento ce ON e.idcategoria_53 = ce.idcategoria_elemento_52
     LEFT JOIN tbl_16_tallas ta ON d.idtalla_55 = ta.id_16
     WHERE d.identregaepp_55 = $1
     ORDER BY e.codigo_53 ASC, e.nombre_53 ASC`,
    [id]
  );

  const { dia, mes, anio } = partesFechaEntrega(m.fecha_entrega_54);

  const responsableNombre =
    (m.nombre_responsable_54 || m.responsable_nombre || ENCARGADO_BODEGA.nombre || '').trim() ||
    ENCARGADO_BODEGA.nombre;
  const responsableRut = (m.rut_responsable_54 || ENCARGADO_BODEGA.rut).trim();

  const claseNombre = String(m.clase_nombre || '').trim();
  const esRopa = /ropa/i.test(claseNombre);
  const tipoActa: 'EPP' | 'ROPA' = esRopa ? 'ROPA' : 'EPP';

  return {
    folio: m.folio_54 || '',
    intro: { dia, mes, anio },
    empresaLegal: EMPRESA_LEGAL,
    clase: {
      id: m.idclase_54 ?? null,
      nombre: claseNombre || (esRopa ? 'ROPA DE TRABAJO' : 'EPP'),
      tipo: tipoActa,
    },
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
      talla: r.talla || '',
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

/** Textos legales del acta según clase (EPP vs Ropa de Trabajo). */
function buildActaCopy(tipo: 'EPP' | 'ROPA') {
  if (tipo === 'ROPA') {
    return {
      titulo: 'REGISTRO DE ENTREGA DE ROPA DE TRABAJO',
      codigoDoc: 'SIG F-622-006',
      objetoCorto: 'Ropa de Trabajo',
      objetoLargo: 'Ropa de Trabajo',
      introCorto: true,
      legalEntrega: 'hace entrega de uniforme institucional a:',
      declaracionTitulo: 'Declaraciones del trabajador',
      declaracionIntro: 'El trabajador declara:',
      compromisos: [
        'Haber recibido conforme las prendas detalladas en la presente acta.',
        'Comprometerse a utilizar el uniforme de manera obligatoria durante su jornada laboral.',
        'Mantener las prendas en buen estado, higiene y presentación.',
        'Asumir responsabilidad por el cuidado del uniforme entregado.',
        'En caso de pérdida la reposición será imputable al trabajador.',
      ],
      filenamePrefix: 'REGISTRO_ENTREGA_ROPA_TRABAJO',
    };
  }

  return {
    titulo: 'REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL',
    codigoDoc: 'SIG F-622-007',
    objetoCorto: 'EPP',
    objetoLargo: 'Elementos de Protección Personal (EPP)',
    introCorto: false,
    legalEntrega:
      'hace entrega de los siguientes Elementos de Protección Personal (EPP) al trabajador:',
    declaracionTitulo: 'Declaración del trabajador',
    declaracionIntro:
      'Declaro haber recibido los Elementos de Protección Personal (EPP) detallados en el presente registro, en buen estado y aptos para su utilización. Asimismo, declaro que:',
    compromisos: [
      'Utilizaré los EPP de manera permanente cuando la naturaleza de mis funciones o la evaluación de riesgos así lo requiera.',
      'He recibido información y/o capacitación respecto del uso, limitaciones, cuidado, almacenamiento y mantenimiento de los EPP entregados.',
      'Me comprometo a conservar los elementos que he recibido en buenas condiciones de uso, informando oportunamente cualquier deterioro, pérdida o desperfecto.',
      'No modificaré los elementos recibidos ni los utilizaré para fines distintos de aquellos para los cuales fueron diseñados y fueron entregados.',
      'Entiendo que el uso de los EPP recibidos constituye una medida obligatoria de control de riesgos y forma parte de mis obligaciones en materia de seguridad y salud en el trabajo.',
      'En caso de pérdida, daño por uso indebido o negligencia comprobada, la empresa podrá aplicar las medidas establecidas en el Reglamento Interno de Orden, Higiene y Seguridad.',
      'En cuanto al uniforme, en caso de pérdida, la reposición será imputable al trabajador.',
    ],
    filenamePrefix: 'REGISTRO_ENTREGA_ELEMENTOS_PROTECCION_PERSONAL',
  };
}

/** Marca de tiempo YYMMDD_HHMM en zona Chile, al generar el PDF. */
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
  // sv-SE → "2026-08-24 13:29" o "2026-08-24T13:29"
  const normalized = formatted.replace('T', ' ');
  const [fechaPart, horaPart = '00:00'] = normalized.split(' ');
  const [anio, mes, dia] = fechaPart.split('-');
  const [hh, mm] = horaPart.split(':');
  return `${anio.slice(-2)}${mes}${dia}_${hh}${mm}`;
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
const ESTADOS_DETALLE = new Set(['NUEVO/A', 'BUENO/A', 'USADO/A', 'DAÑADO/A']);

const MAESTRO_SELECT = `
  SELECT
    m.identregaepp_54,
    m.folio_54,
    m.idtrabajador_54,
    m.idclase_54,
    m.idccosto_54,
    m.idempresa_54,
    m.idcargo_54,
    m.idresponsableentrega_54,
    to_char(m.fecha_entrega_54, 'YYYY-MM-DD') AS fecha_entrega_54,
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
    cl.clase_56 AS clase_nombre,
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
  LEFT JOIN tbl_56_clase_elemento cl ON m.idclase_54 = cl.idclase_56
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

/** Traduce errores de PostgreSQL a un texto usable en pantalla. */
function mensajePg(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Error desconocido';
  const e = error as {
    code?: string;
    constraint?: string;
    detail?: string;
    message?: string;
  };
  if (e.code === '23514' && e.constraint === 'chk_tbl_55_estado_entrega_valido') {
    return 'El estado de la línea no está permitido en la base. Si usó NUEVO/A, ejecute en DBeaver el script database/alter_tbl_55_estado_nuevo.sql';
  }
  if (e.code === '23514' && e.constraint === 'chk_tbl_53_stock_valido') {
    return 'El stock del elemento no puede quedar negativo. Revise existencias e intente de nuevo.';
  }
  if (e.code === '23503') {
    return 'Hay un dato que no existe en el catálogo (talla, marca, clase, cargo o centro de costo).';
  }
  if (e.code === '23505') {
    if (e.constraint?.includes('folio')) {
      return 'El folio de entrega quedó duplicado. Vuelva a guardar.';
    }
    return 'Línea duplicada: el mismo elemento con la misma talla ya está en la entrega.';
  }
  if (e.code === '22P02') {
    return 'Un identificador numérico llegó con formato inválido (clase, talla o marca).';
  }
  if (e.code === 'P0001' && /no pertenece a la clase/i.test(e.message || '')) {
    return 'La entrega puede mezclar EPP y Ropa de Trabajo. Se quitará la regla que exigía una sola clase; vuelva a crear.';
  }
  return e.detail || e.message || 'Error desconocido';
}

/**
 * Si producción quedó con el CHECK viejo (sin NUEVO/A), una línea NUEVO/A
 * revienta el INSERT. Idempotente: solo altera cuando falta el estado.
 */
async function asegurarChkEstadosDetalleEpp(client: {
  query: typeof pool.query;
}): Promise<void> {
  const chk = await client.query<{ def: string | null }>(
    `SELECT pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conname = 'chk_tbl_55_estado_entrega_valido'`
  );
  const def = String(chk.rows[0]?.def || '');
  if (def.includes('NUEVO/A') && def.includes('BUENO/A')) {
    // Aun así puede quedar un CHECK viejo con otro nombre que rechaza NUEVO/A.
    const otros = await client.query<{ conname: string; def: string }>(
      `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'public.tbl_55_d_entrega_epp'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%estadoentrega_55%'`
    );
    const hayViejo = otros.rows.some(
      (r) => r.conname !== 'chk_tbl_55_estado_entrega_valido' && !r.def.includes('NUEVO/A')
    );
    if (!hayViejo) return;
  }

  await client.query('BEGIN');
  try {
    await client.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'public.tbl_55_d_entrega_epp'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%estadoentrega_55%'
        LOOP
          EXECUTE format(
            'ALTER TABLE public.tbl_55_d_entrega_epp DROP CONSTRAINT IF EXISTS %I',
            r.conname
          );
        END LOOP;
      END $$;
    `);
    await client.query(
      `UPDATE public.tbl_55_d_entrega_epp
       SET estadoentrega_55 = CASE upper(estadoentrega_55)
         WHEN 'BUENA' THEN 'BUENO/A'
         WHEN 'REGULAR' THEN 'USADO/A'
         WHEN 'DANADA' THEN 'DAÑADO/A'
         WHEN 'DAÑADA' THEN 'DAÑADO/A'
         WHEN 'NUEVO' THEN 'NUEVO/A'
         ELSE estadoentrega_55
       END`
    );
    await client.query(
      `ALTER TABLE public.tbl_55_d_entrega_epp
       ADD CONSTRAINT chk_tbl_55_estado_entrega_valido
       CHECK (estadoentrega_55 IN ('NUEVO/A', 'BUENO/A', 'USADO/A', 'DAÑADO/A'))`
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function asegurarFolioEntregaEpp(client: {
  query: typeof pool.query;
}): Promise<void> {
  await client.query(`
    CREATE OR REPLACE FUNCTION fn_generar_folio_epp_54() RETURNS TRIGGER AS $$
    DECLARE
      v_anio varchar(4);
      v_consecutivo int4;
      v_folio varchar(30);
    BEGIN
      IF NEW.folio_54 IS NULL OR TRIM(NEW.folio_54) = '' THEN
        v_anio := EXTRACT(YEAR FROM NEW.fecha_entrega_54)::varchar;
        SELECT COALESCE(MAX(
          CASE
            WHEN SPLIT_PART(folio_54, '-', 3) ~ '^[0-9]+$'
            THEN CAST(SPLIT_PART(folio_54, '-', 3) AS int4)
            ELSE 0
          END
        ), 0) + 1
        INTO v_consecutivo
        FROM tbl_54_m_entrega_epp
        WHERE folio_54 LIKE 'EPP-' || v_anio || '-%';
        v_folio := 'EPP-' || v_anio || '-' || LPAD(v_consecutivo::varchar, 4, '0');
        NEW.folio_54 := v_folio;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/** Una acta puede llevar EPP y Ropa juntos. En producción quedó un trigger que lo prohibía. */
async function asegurarClasesMixtasEntregaEpp(client: {
  query: typeof pool.query;
}): Promise<void> {
  await client.query(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE c.relname = 'tbl_55_d_entrega_epp'
          AND NOT t.tgisinternal
          AND (
            pg_get_functiondef(p.oid) ILIKE '%no pertenece a la clase%'
            OR (
              pg_get_functiondef(p.oid) ILIKE '%idclase_54%'
              AND pg_get_functiondef(p.oid) ILIKE '%RAISE%'
            )
          )
      LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tbl_55_d_entrega_epp', r.tgname);
      END LOOP;
    END $$;
  `);
}

async function validarCatalogoDetalles(
  client: { query: typeof pool.query },
  detalles: CreateMaestroEntregaEppDTO['detalles']
): Promise<string | null> {
  for (const d of detalles) {
    if (d.idtalla_55) {
      const t = await client.query(
        'SELECT 1 FROM tbl_16_tallas WHERE id_16 = $1',
        [d.idtalla_55]
      );
      if (!t.rowCount) {
        return `La talla de la línea no existe en el catálogo (id ${d.idtalla_55})`;
      }
    }
    if (d.idmarca_55) {
      const m = await client.query(
        'SELECT 1 FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1',
        [d.idmarca_55]
      );
      if (!m.rowCount) {
        return `La marca de la línea no existe en el catálogo (id ${d.idmarca_55})`;
      }
    }
  }
  return null;
}

function validarDetalles(
  detalles: CreateMaestroEntregaEppDTO['detalles']
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos un elemento EPP';
  const seen = new Set<string>();
  for (const d of detalles) {
    if (!d.idelemento_55) return 'Cada línea debe tener un elemento';
    const clave = `${d.idelemento_55}:${d.idtalla_55 ?? 0}`;
    if (seen.has(clave)) {
      return 'El mismo elemento con la misma talla ya está en el detalle';
    }
    seen.add(clave);
    if (!d.cantidad_55 || d.cantidad_55 < 1) return 'La cantidad debe ser mayor a 0';
    const estado = String(d.estadoentrega_55 || 'BUENO/A').toUpperCase();
    if (!ESTADOS_DETALLE.has(estado)) {
      return 'Estado de entrega inválido (NUEVO/A, BUENO/A, USADO/A, DAÑADO/A)';
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
  const pedidoPorElemento = new Map<number, number>();
  for (const d of detalles) {
    const id = Number(d.idelemento_55);
    pedidoPorElemento.set(id, (pedidoPorElemento.get(id) || 0) + Number(d.cantidad_55));
  }

  for (const [idElemento, cant] of pedidoPorElemento) {
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
      [idElemento]
    );

    if (result.rowCount === 0) {
      return `Elemento ${idElemento} no encontrado`;
    }

    const el = result.rows[0];

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
        String(d.estadoentrega_55 || 'BUENO/A').toUpperCase(),
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

    try {
      await asegurarChkEstadosDetalleEpp(client);
      await asegurarFolioEntregaEpp(client);
      await asegurarClasesMixtasEntregaEpp(client);
    } catch (error) {
      console.error('[asegurarEsquemaEntregaEpp]', error);
      res.status(500).json({
        success: false,
        error: mensajePg(error),
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
      return;
    }

    const catalogoError = await validarCatalogoDetalles(client, body.detalles);
    if (catalogoError) {
      res.status(400).json({ success: false, error: catalogoError });
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
        folio_54, idtrabajador_54, idclase_54, idccosto_54, idempresa_54, idcargo_54,
        idresponsableentrega_54, fecha_entrega_54, hora_entrega_54, lugar_entrega_54,
        motivo_entrega_54, nombre_responsable_54, rut_responsable_54,
        observaciones_54, estado_54
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, COALESCE($9::time, CURRENT_TIME), $10,
        $11, $12, $13,
        $14, $15
      ) RETURNING identregaepp_54`,
      [
        body.folio_54?.trim() || null,
        body.idtrabajador_54,
        body.idclase_54,
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
    try {
      await client.query('ROLLBACK');
    } catch {
      /* no había transacción */
    }
    console.error('[createEntregaEpp]', error);
    res.status(500).json({
      success: false,
      error: mensajePg(error),
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
      try {
        await asegurarChkEstadosDetalleEpp(client);
        await asegurarClasesMixtasEntregaEpp(client);
      } catch (error) {
        console.error('[asegurarEsquemaEntregaEpp]', error);
        res.status(500).json({
          success: false,
          error: mensajePg(error),
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
        return;
      }
      const catalogoError = await validarCatalogoDetalles(client, body.detalles);
      if (catalogoError) {
        res.status(400).json({ success: false, error: catalogoError });
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
    if (body.idclase_54 !== undefined) push('idclase_54', body.idclase_54 || null);
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
    console.error('[updateEntregaEpp]', error);
    res.status(500).json({
      success: false,
      error: mensajePg(error),
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

/** PDF: Registro de Entrega EPP o Ropa de Trabajo (estilo sobrio estándar) */
export const generarActaEntregaEppPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await cargarDatosActaEntrega(id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Entrega EPP no encontrada' });
      return;
    }

    const copy = buildActaCopy(data.clase.tipo);
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

    const tableLayout = {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => '#888888',
      vLineColor: () => '#888888',
    };

    const labelCell = (text: string) => ({
      text,
      fillColor: '#555555',
      color: '#ffffff',
      bold: true,
      fontSize: 8,
      margin: [5, 6, 5, 6],
    });

    const valueCell = (text: string) => ({
      text: text || ' ',
      fontSize: 9,
      margin: [5, 6, 5, 6],
    });

    const tableBody: any[] = [
      [
        { text: 'Código', style: 'gridHeader', alignment: 'center' },
        { text: 'Elemento', style: 'gridHeader', alignment: 'center' },
        { text: 'Tipo', style: 'gridHeader', alignment: 'center' },
        { text: 'Categoría', style: 'gridHeader', alignment: 'center' },
        { text: 'Talla', style: 'gridHeader', alignment: 'center' },
        { text: 'Cant.', style: 'gridHeader', alignment: 'center' },
      ],
    ];

    if (data.elementos.length === 0) {
      tableBody.push([
        { text: '-', style: 'gridCell', alignment: 'center' },
        { text: 'Sin elementos', style: 'gridCell', alignment: 'center' },
        { text: '-', style: 'gridCell', alignment: 'center' },
        { text: '-', style: 'gridCell', alignment: 'center' },
        { text: '-', style: 'gridCell', alignment: 'center' },
        { text: '-', style: 'gridCell', alignment: 'center' },
      ]);
    } else {
      data.elementos.forEach((e) => {
        tableBody.push([
          { text: e.codigo, style: 'gridCell', alignment: 'center' },
          { text: e.elemento, style: 'gridCell' },
          { text: e.tipo, style: 'gridCell' },
          { text: e.categoria, style: 'gridCell' },
          { text: e.talla || '—', style: 'gridCell', alignment: 'center' },
          { text: String(e.cantidad), style: 'gridCell', alignment: 'center' },
        ]);
      });
    }

    const headerCols: any[] = [];
    if (logoDataUrl) {
      headerCols.push({ image: logoDataUrl, width: 110, margin: [0, 0, 12, 0] });
    } else {
      headerCols.push({
        text: 'TranSantin',
        fontSize: 14,
        bold: true,
        color: '#333333',
        width: 110,
      });
    }
    headerCols.push({
      stack: [
        {
          text: copy.titulo,
          fontSize: 11,
          bold: true,
          alignment: 'center',
          color: '#111111',
          margin: [0, 6, 0, 0],
        },
      ],
      width: '*',
    });

    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'LETTER',
      pageMargins: [48, 42, 48, 48],
      content: [
        {
          text: `${copy.codigoDoc}\nVersión 001`,
          fontSize: 8,
          color: '#888888',
          alignment: 'right',
          margin: [0, 0, 0, 10],
        },
        { columns: headerCols, margin: [0, 0, 0, 14] },
        {
          text: copy.introCorto
            ? [
                { text: 'A ', fontSize: 10 },
                { text: String(data.intro.dia), bold: true, fontSize: 10 },
                { text: ' de ', fontSize: 10 },
                { text: String(data.intro.mes), bold: true, fontSize: 10 },
                { text: ' de ', fontSize: 10 },
                { text: String(data.intro.anio), bold: true, fontSize: 10 },
                { text: ', la ', fontSize: 10 },
                { text: EMPRESA_LEGAL.nombre, bold: true, fontSize: 10 },
                { text: ', Rut ', fontSize: 10 },
                { text: EMPRESA_LEGAL.rut, bold: true, fontSize: 10 },
                { text: ` ${copy.legalEntrega}`, fontSize: 10 },
              ]
            : [
                { text: 'A ', fontSize: 10 },
                { text: String(data.intro.dia), bold: true, fontSize: 10 },
                { text: ' de ', fontSize: 10 },
                { text: String(data.intro.mes), bold: true, fontSize: 10 },
                { text: ' de ', fontSize: 10 },
                { text: String(data.intro.anio), bold: true, fontSize: 10 },
                { text: ', ', fontSize: 10 },
                { text: EMPRESA_LEGAL.nombre, bold: true, fontSize: 10 },
                { text: ', RUT ', fontSize: 10 },
                { text: EMPRESA_LEGAL.rut, bold: true, fontSize: 10 },
                {
                  text:
                    ', en cumplimiento de lo establecido en la Ley Nº 16.744, el Decreto Supremo Nº 44 del Ministerio del Trabajo y Previsión Social y el Reglamento Interno de Orden, Higiene y Seguridad de la empresa, ' +
                    copy.legalEntrega,
                  fontSize: 10,
                },
              ],
          alignment: 'justify',
          lineHeight: 1.35,
          margin: [0, 0, 0, 12],
        },
        {
          text: 'Datos del Trabajador',
          fontSize: 10,
          bold: true,
          color: '#111111',
          margin: [0, 0, 0, 6],
        },
        {
          table: {
            widths: [90, '*'],
            body: [
              [labelCell('Trabajador'), valueCell(data.trabajador.nombre)],
              [labelCell('Cédula de Identidad'), valueCell(data.trabajador.rut)],
              [labelCell('Cargo'), valueCell(data.trabajador.cargo)],
            ],
          },
          layout: tableLayout,
          margin: [0, 0, 0, 14],
        },
        {
          text: `Detalle de ${copy.objetoLargo} entregado`,
          fontSize: 10,
          bold: true,
          color: '#111111',
          margin: [0, 0, 0, 6],
        },
        {
          table: {
            headerRows: 1,
            widths: [60, '*', 75, 75, 40, 35],
            body: tableBody,
          },
          layout: {
            ...tableLayout,
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#555555' : null),
          },
          margin: [0, 0, 0, 14],
        },
        {
          text: copy.declaracionTitulo,
          bold: true,
          fontSize: 10,
          color: '#111111',
          margin: [0, 4, 0, 6],
        },
        {
          text: copy.declaracionIntro,
          fontSize: 9,
          alignment: 'justify',
          margin: [0, 0, 0, 6],
        },
        {
          ul: copy.compromisos,
          fontSize: 9,
          color: '#222222',
          margin: [0, 0, 0, 16],
        },
        {
          text: 'Firmado digitalmente por:',
          bold: true,
          fontSize: 10,
          margin: [0, 8, 0, 6],
        },
        {
          text: `Trabajador: ${data.firmas.trabajadorNombre || '—'}, cédula de identidad ${data.firmas.trabajadorRut || '—'}`,
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
              color: '#888888',
              margin: [0, 16, 0, 0],
            }
          : { text: '' },
      ],
      footer: (currentPage: number, pageCount: number) => ({
        text: `${copy.codigoDoc} · Versión 001 · Página ${currentPage} de ${pageCount}`,
        fontSize: 7,
        color: '#999999',
        alignment: 'center',
        margin: [48, 0, 48, 0],
      }),
      styles: {
        gridHeader: { fontSize: 8, bold: true, color: '#ffffff', margin: [3, 5, 3, 5] },
        gridCell: { fontSize: 8, margin: [3, 5, 3, 5] },
      },
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#111111' },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const stamp = stampArchivoActa();
    const filename = `${copy.filenamePrefix}_${stamp}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar el PDF de entrega',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
