import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  Neumatico,
  CreateNeumaticoDTO,
  CreateNeumaticoLoteDTO,
  CreateNeumaticoLoteItemDTO,
  UpdateNeumaticoDTO,
} from '../types.js';

const FUEGO_RE = /^T[0-9]{2}[0-9]+$/;

const SELECT_NEU = `SELECT
        n.id_neumatico_31,
        n.cod_neumatico_31,
        n.id_marca_31,
        n.id_estado_31,
        n.fecha_ingreso_31,
        n.observaciones_31,
        n.codigo_proveedor_31,
        n.modelo_31,
        n.medida_31,
        m.marca_32,
        m.diametro_32,
        e.estado_33
       FROM tbl_31_neumatico n
       INNER JOIN tbl_32_marca_neumatico m ON n.id_marca_31 = m.id_marca_32
       LEFT JOIN tbl_33_estado_neumatico e ON n.id_estado_31 = e.id_estado_33`;

const RETURNING_NEU = `id_neumatico_31, cod_neumatico_31, id_marca_31, id_estado_31,
                 fecha_ingreso_31, observaciones_31, codigo_proveedor_31, modelo_31, medida_31`;

function pgErr(error: unknown): { code?: string; message?: string; constraint?: string } {
  return error && typeof error === 'object'
    ? (error as { code?: string; message?: string; constraint?: string })
    : {};
}

function textoMayus(raw?: string | null): string | null {
  const v = String(raw || '').trim().toUpperCase();
  return v || null;
}

function normalizarFuego(raw?: string | null): string | null {
  return textoMayus(raw);
}

function errorFuego(fuego: string | null, requerido: boolean): string | null {
  if (!fuego) return requerido ? 'El N° Fuego es requerido (ej. T261)' : null;
  if (!FUEGO_RE.test(fuego)) {
    return 'El N° Fuego debe ser T + año + secuencia (ej. T261, T2612), sin guion ni ceros a la izquierda';
  }
  return null;
}

function mensajePgNeumatico(error: unknown): { status: number; error: string; message: string } | null {
  const e = pgErr(error);
  if (e.code === '23505') {
    return {
      status: 400,
      error: 'N° Fuego duplicado',
      message: 'Ese N° Fuego ya está registrado. No se puede repetir (ej. T261).',
    };
  }
  if (e.code === 'P0001' || /N° Fuego|Nº Fuego|cod_neumatico/i.test(e.message || '')) {
    return {
      status: 400,
      error: 'N° Fuego inválido',
      message: e.message || 'El N° Fuego no cumple el formato T + año + secuencia',
    };
  }
  return null;
}

async function marcaActiva(idMarca: number) {
  return pool.query(
    'SELECT id_marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1 AND estado_32 = true',
    [idMarca]
  );
}

async function completarMarcaEstado(row: Neumatico): Promise<Neumatico> {
  const extra = await pool.query<{ marca_32: string; diametro_32: number; estado_33: string | null }>(
    `SELECT m.marca_32, m.diametro_32, e.estado_33
       FROM tbl_32_marca_neumatico m
       LEFT JOIN tbl_33_estado_neumatico e ON e.id_estado_33 = $2
       WHERE m.id_marca_32 = $1`,
    [row.id_marca_31, row.id_estado_31]
  );
  return {
    ...row,
    marca_32: extra.rows[0]?.marca_32,
    diametro_32: extra.rows[0]?.diametro_32,
    estado_33: extra.rows[0]?.estado_33 ?? undefined,
  };
}

export const getAllNeumaticos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Neumatico>(`${SELECT_NEU} ORDER BY n.id_neumatico_31 ASC`);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener los neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getNeumaticoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Neumatico>(`${SELECT_NEU} WHERE n.id_neumatico_31 = $1`, [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Neumático no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id_marca_31,
      fecha_ingreso_31,
      observaciones_31,
      cod_neumatico_31,
      codigo_proveedor_31,
      modelo_31,
      medida_31,
    }: CreateNeumaticoDTO = req.body;

    if (!id_marca_31) {
      res.status(400).json({ success: false, error: 'El ID de la marca es requerido' });
      return;
    }

    const fuego = normalizarFuego(cod_neumatico_31);
    const errFuego = errorFuego(fuego, false);
    if (errFuego) {
      res.status(400).json({ success: false, error: errFuego });
      return;
    }

    const marcaExists = await marcaActiva(id_marca_31);
    if (marcaExists.rowCount === 0) {
      res.status(400).json({ success: false, error: 'La marca seleccionada no existe o está inactiva' });
      return;
    }

    const result = await pool.query<Neumatico>(
      `INSERT INTO tbl_31_neumatico (
          id_marca_31, fecha_ingreso_31, observaciones_31,
          cod_neumatico_31, codigo_proveedor_31, modelo_31, medida_31
        )
        VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7)
        RETURNING ${RETURNING_NEU}`,
      [
        id_marca_31,
        fecha_ingreso_31 || null,
        observaciones_31?.trim() || null,
        fuego,
        textoMayus(codigo_proveedor_31),
        textoMayus(modelo_31),
        textoMayus(medida_31),
      ]
    );

    const data = await completarMarcaEstado(result.rows[0]);
    res.status(201).json({
      success: true,
      data,
      message: `Neumático ${data.cod_neumatico_31} creado exitosamente`,
    });
  } catch (error) {
    const mapped = mensajePgNeumatico(error);
    if (mapped) {
      res.status(mapped.status).json({ success: false, error: mapped.error, message: mapped.message });
      return;
    }
    console.error('Error al crear neumático:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createNeumaticosLote = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { items }: CreateNeumaticoLoteDTO = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Envíe las filas del Excel (N° Fuego, código, marca, modelo, medida)',
      });
      return;
    }
    if (items.length > 500) {
      res.status(400).json({ success: false, error: 'El lote no puede superar 500 cubiertas' });
      return;
    }

    const normalizados: Array<CreateNeumaticoLoteItemDTO & { fuego: string }> = [];
    const vistos = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const linea = i + 1;
      if (!row?.id_marca_31) {
        res.status(400).json({ success: false, error: `Fila ${linea}: falta la marca del catálogo` });
        return;
      }
      const fuego = normalizarFuego(row.cod_neumatico_31);
      const errFuego = errorFuego(fuego, true);
      if (errFuego) {
        res.status(400).json({ success: false, error: `Fila ${linea}: ${errFuego}` });
        return;
      }
      if (vistos.has(fuego as string)) {
        res.status(400).json({ success: false, error: `Fila ${linea}: N° Fuego ${fuego} repetido en el Excel` });
        return;
      }
      vistos.add(fuego as string);
      normalizados.push({ ...row, fuego: fuego as string });
    }

    const idsMarca = [...new Set(normalizados.map((r) => Number(r.id_marca_31)))];
    const marcasOk = await client.query(
      `SELECT id_marca_32 FROM tbl_32_marca_neumatico
        WHERE id_marca_32 = ANY($1::int[]) AND estado_32 = true`,
      [idsMarca]
    );
    if (Number(marcasOk.rowCount) !== idsMarca.length) {
      res.status(400).json({
        success: false,
        error: 'Hay una marca que no existe o está inactiva. Créala en Neumáticos → Marcas',
      });
      return;
    }

    await client.query('BEGIN');
    const creados: Neumatico[] = [];
    for (const row of normalizados) {
      const result = await client.query<Neumatico>(
        `INSERT INTO tbl_31_neumatico (
            id_marca_31, fecha_ingreso_31, observaciones_31,
            cod_neumatico_31, codigo_proveedor_31, modelo_31, medida_31
          )
          VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7)
          RETURNING ${RETURNING_NEU}`,
        [
          row.id_marca_31,
          row.fecha_ingreso_31 || null,
          row.observaciones_31?.trim() || null,
          row.fuego,
          textoMayus(row.codigo_proveedor_31),
          textoMayus(row.modelo_31),
          textoMayus(row.medida_31),
        ]
      );
      creados.push(result.rows[0]);
    }
    await client.query('COMMIT');

    const extra = await pool.query<{ id_marca_32: number; marca_32: string; diametro_32: number }>(
      `SELECT id_marca_32, marca_32, diametro_32 FROM tbl_32_marca_neumatico
        WHERE id_marca_32 = ANY($1::int[])`,
      [idsMarca]
    );
    const marcaMap = new Map(extra.rows.map((m) => [m.id_marca_32, m]));
    const data = creados.map((row) => {
      const m = marcaMap.get(row.id_marca_31);
      return { ...row, marca_32: m?.marca_32, diametro_32: m?.diametro_32 };
    });
    const codigos = data.map((r) => r.cod_neumatico_31).join(', ');

    res.status(201).json({
      success: true,
      data,
      count: data.length,
      message: `${data.length} neumáticos creados: ${codigos}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const mapped = mensajePgNeumatico(error);
    if (mapped) {
      res.status(mapped.status).json({ success: false, error: mapped.error, message: mapped.message });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear el lote de neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const updateNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      id_marca_31,
      fecha_ingreso_31,
      observaciones_31,
      codigo_proveedor_31,
      modelo_31,
      medida_31,
    }: UpdateNeumaticoDTO = req.body;

    if (id_marca_31 != null) {
      const marcaExists = await marcaActiva(id_marca_31);
      if (marcaExists.rowCount === 0) {
        res.status(400).json({ success: false, error: 'La marca seleccionada no existe o está inactiva' });
        return;
      }
    }

    const obsVal = observaciones_31 !== undefined ? observaciones_31?.trim() || null : undefined;
    const result = await pool.query<Neumatico>(
      `UPDATE tbl_31_neumatico SET
        id_marca_31 = COALESCE($1, id_marca_31),
        fecha_ingreso_31 = COALESCE($2::date, fecha_ingreso_31),
        observaciones_31 = COALESCE($3, observaciones_31),
        codigo_proveedor_31 = COALESCE($4, codigo_proveedor_31),
        modelo_31 = COALESCE($5, modelo_31),
        medida_31 = COALESCE($6, medida_31)
       WHERE id_neumatico_31 = $7
       RETURNING ${RETURNING_NEU}`,
      [
        id_marca_31 ?? null,
        fecha_ingreso_31 || null,
        obsVal,
        codigo_proveedor_31 !== undefined ? textoMayus(codigo_proveedor_31) : null,
        modelo_31 !== undefined ? textoMayus(modelo_31) : null,
        medida_31 !== undefined ? textoMayus(medida_31) : null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Neumático no encontrado' });
      return;
    }

    const data = await completarMarcaEstado(result.rows[0]);
    res.json({ success: true, data, message: 'Neumático actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM tbl_31_neumatico WHERE id_neumatico_31 = $1 RETURNING id_neumatico_31',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Neumático no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Neumático eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
