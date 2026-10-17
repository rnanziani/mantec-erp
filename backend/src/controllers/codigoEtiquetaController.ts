import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CodigoEtiqueta,
  CreateCodigoEtiquetaDTO,
} from '../types.js';

const TABLA = 'tbl_89_codigo_etiqueta';

function normCodigo(raw: unknown): string | null {
  if (raw == null) return null;
  const t = String(raw).trim().toUpperCase().replace(/\s+/g, '');
  if (!t) return null;
  if (t.length > 25) return null;
  return t;
}

function normTexto(raw: unknown, max: number): string | null {
  if (raw == null) return null;
  const t = String(raw).trim().replace(/\s+/g, ' ').toUpperCase();
  if (!t) return null;
  return t.slice(0, max);
}

const TAMANOS = ['32x20', '50x30', '100x30'] as const;
type TamanoId = (typeof TAMANOS)[number];

function tamanoPorLargo(codigo: string): TamanoId {
  const n = codigo.trim().length;
  if (n <= 8) return '32x20';
  if (n <= 14) return '50x30';
  return '100x30';
}

function cabeEnTamano(codigo: string, tamano: TamanoId): boolean {
  const n = codigo.trim().length;
  if (tamano === '32x20') return n <= 8;
  if (tamano === '50x30') return n <= 14;
  return n <= 25;
}

function normTamano(raw: unknown, codigo: string): TamanoId | null {
  const auto = tamanoPorLargo(codigo);
  if (raw == null || String(raw).trim() === '') return auto;
  let t = String(raw).trim().toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '');
  if (t === '32x22') t = '32x20';
  if (!TAMANOS.includes(t as TamanoId)) return null;
  if (!cabeEnTamano(codigo, t as TamanoId)) return null;
  return t as TamanoId;
}

async function insertarSiNoExiste(
  codigo: string,
  descripcion: string,
  proveedor: string,
  tamano?: string | null
): Promise<'inserted' | 'skipped'> {
  const formato = normTamano(tamano, codigo) ?? tamanoPorLargo(codigo);
  const result = await pool.query<CodigoEtiqueta>(
    `INSERT INTO ${TABLA} (codigo_89, descripcion_89, proveedor_89, tamano_89)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [codigo, descripcion, proveedor, formato]
  );
  return (result.rowCount ?? 0) > 0 ? 'inserted' : 'skipped';
}

function extraerFilasJson(payload: unknown): Array<{
  codigo: string;
  descripcion: string;
  proveedor: string;
}> {
  const filas: Array<{ codigo: string; descripcion: string; proveedor: string }> = [];

  const pushItem = (item: unknown, proveedorDefault: string) => {
    if (!item || typeof item !== 'object') return;
    const o = item as Record<string, unknown>;
    const codigo = normCodigo(o.codigo ?? o.codigo_89);
    const descripcion = normTexto(o.descripcion ?? o.descripcion_89, 200);
    const proveedor =
      normTexto(o.proveedor ?? o.proveedor_89 ?? o.cliente, 80) || proveedorDefault;
    if (codigo && descripcion && proveedor) {
      filas.push({ codigo, descripcion, proveedor });
    }
  };

  if (Array.isArray(payload)) {
    payload.forEach((it) => pushItem(it, ''));
    return filas;
  }
  if (!payload || typeof payload !== 'object') return filas;
  const root = payload as Record<string, unknown>;
  let proveedorDefault = '';
  if (typeof root.proveedor === 'string') {
    proveedorDefault = normTexto(root.proveedor, 80) || '';
  } else if (root.proveedor && typeof root.proveedor === 'object') {
    const p = root.proveedor as Record<string, unknown>;
    proveedorDefault = normTexto(p.nombre ?? p.id, 80) || '';
  }
  if (!proveedorDefault) {
    proveedorDefault = normTexto(root.cliente, 80) || '';
  }
  const items = Array.isArray(root.items) ? root.items : [];
  if (items.length) {
    items.forEach((it) => pushItem(it, proveedorDefault));
    return filas;
  }
  pushItem(root, proveedorDefault);
  return filas;
}

export const getAllCodigosEtiqueta = async (req: Request, res: Response): Promise<void> => {
  try {
    const soloActivos = String(req.query.activos || '') === '1';
    const q = String(req.query.q || '').trim();
    const params: unknown[] = [];
    const where: string[] = [];
    if (soloActivos) where.push('activo_89 = true');
    if (q) {
      params.push(`%${q.toUpperCase()}%`);
      where.push(
        `(UPPER(codigo_89) LIKE $${params.length} OR UPPER(descripcion_89) LIKE $${params.length} OR UPPER(proveedor_89) LIKE $${params.length})`
      );
    }
    const sql = `SELECT * FROM ${TABLA}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY idcodigo_89 DESC`;
    const result = await pool.query<CodigoEtiqueta>(sql, params);
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener códigos de etiqueta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createCodigoEtiqueta = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateCodigoEtiquetaDTO = req.body;
    const codigo = normCodigo(body.codigo_89);
    const descripcion = normTexto(body.descripcion_89, 200);
    const proveedor = normTexto(body.proveedor_89, 80);
    if (!codigo || !descripcion || !proveedor) {
      res.status(400).json({
        success: false,
        error: 'Código (máx. 25), descripción y proveedor son requeridos',
      });
      return;
    }
    const tamano = normTamano(body.tamano_89, codigo);
    if (!tamano) {
      res.status(400).json({
        success: false,
        error: 'Ese código no cabe en el formato elegido. Usá el sugerido o uno más grande.',
      });
      return;
    }
    const estado = await insertarSiNoExiste(codigo, descripcion, proveedor, tamano);
    if (estado === 'skipped') {
      res.status(409).json({
        success: false,
        error: `El código ${codigo} ya existe`,
      });
      return;
    }
    const row = await pool.query<CodigoEtiqueta>(
      `SELECT * FROM ${TABLA} WHERE UPPER(TRIM(codigo_89)) = $1`,
      [codigo]
    );
    res.status(201).json({ success: true, data: row.rows[0], message: 'Código creado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el código',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const importarCodigosEtiqueta = async (req: Request, res: Response): Promise<void> => {
  try {
    let payload: unknown = req.body;
    if (payload && typeof payload === 'object' && 'json' in payload) {
      const raw = (payload as { json?: unknown }).json;
      if (typeof raw === 'string') {
        try {
          payload = JSON.parse(raw);
        } catch {
          res.status(400).json({ success: false, error: 'El JSON no es válido' });
          return;
        }
      } else {
        payload = raw;
      }
    }
    const filas = extraerFilasJson(payload);
    if (!filas.length) {
      res.status(400).json({
        success: false,
        error: 'No encontré items con codigo, descripcion y proveedor',
      });
      return;
    }
    let inserted = 0;
    let skipped = 0;
    for (const f of filas) {
      const estado = await insertarSiNoExiste(f.codigo, f.descripcion, f.proveedor);
      if (estado === 'inserted') inserted += 1;
      else skipped += 1;
    }
    res.json({
      success: true,
      data: { inserted, skipped, total: filas.length },
      message: `Cargados ${inserted}, omitidos ${skipped} (ya existían)`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al importar JSON',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

function pgCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return '';
}

export const updateCodigoEtiqueta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: CreateCodigoEtiquetaDTO = req.body;
    const codigo = body.codigo_89 !== undefined ? normCodigo(body.codigo_89) : undefined;
    const descripcion = body.descripcion_89 !== undefined ? normTexto(body.descripcion_89, 200) : undefined;
    const proveedor = body.proveedor_89 !== undefined ? normTexto(body.proveedor_89, 80) : undefined;
    if (codigo !== undefined && !codigo) {
      res.status(400).json({ success: false, error: 'Código no puede quedar vacío (máx. 25)' });
      return;
    }
    if (descripcion !== undefined && !descripcion) {
      res.status(400).json({ success: false, error: 'Descripción no puede quedar vacía' });
      return;
    }
    if (proveedor !== undefined && !proveedor) {
      res.status(400).json({ success: false, error: 'Proveedor no puede quedar vacío' });
      return;
    }
    let tamano: TamanoId | null | undefined;
    if (body.tamano_89 !== undefined || codigo !== undefined) {
      const actual = await pool.query<{ codigo_89: string }>(
        `SELECT codigo_89 FROM ${TABLA} WHERE idcodigo_89 = $1`,
        [id]
      );
      if ((actual.rowCount ?? 0) === 0) {
        res.status(404).json({ success: false, error: 'Código no encontrado' });
        return;
      }
      const codigoFinal = codigo ?? actual.rows[0].codigo_89;
      tamano = normTamano(body.tamano_89, codigoFinal);
      if (body.tamano_89 !== undefined && !tamano) {
        res.status(400).json({
          success: false,
          error: 'Ese código no cabe en el formato elegido. Usá el sugerido o uno más grande.',
        });
        return;
      }
      if (!tamano) tamano = tamanoPorLargo(codigoFinal);
    }
    const result = await pool.query<CodigoEtiqueta>(
      `UPDATE ${TABLA} SET
         codigo_89 = COALESCE($1, codigo_89),
         descripcion_89 = COALESCE($2, descripcion_89),
         proveedor_89 = COALESCE($3, proveedor_89),
         tamano_89 = COALESCE($4, tamano_89),
         activo_89 = COALESCE($5, activo_89),
         actualizado_en = CURRENT_TIMESTAMP
       WHERE idcodigo_89 = $6
       RETURNING *`,
      [
        codigo ?? null,
        descripcion ?? null,
        proveedor ?? null,
        tamano ?? null,
        body.activo_89 !== undefined ? body.activo_89 : null,
        id,
      ]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Código no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Actualizado' });
  } catch (error) {
    if (pgCode(error) === '23505') {
      res.status(409).json({ success: false, error: 'Ese código ya existe en otro registro' });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error al actualizar',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteCodigoEtiqueta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idcodigo_89 = $1 RETURNING idcodigo_89, codigo_89`,
      [id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Código no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Código eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
