import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';

const TABLA_RESPONSABLE = 'tbl_08_responsable_entrega';
const SELECT_RESPONSABLE = `
  idresponsableentrega_08,
  nombreresponsableentrega_08,
  apaternoresponsableentrega_08,
  amaternoresponsableentrega_08,
  estado_08
`;

interface ResponsableEntrega {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  estado_08: boolean;
  nombre_completo?: string;
}

/** En BD estado_08 guarda {v} (vigente) o vacío/NULL. El API lo expone como boolean. */
function esVigente(estado: unknown): boolean {
  if (estado == null || estado === false) return false;
  if (estado === true) return true;
  if (Array.isArray(estado)) {
    return estado.some((x) => String(x).trim().toLowerCase() === 'v');
  }
  const s = String(estado).trim().toLowerCase();
  if (s === '' || s === '{}' || s === 'null' || s === 'false' || s === '0' || s === 'f') {
    return false;
  }
  return s === 'v' || s.includes('v');
}

function parseActivoQuery(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'si' || s === 'sí') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return undefined;
}

type TipoEstado08 = 'array' | 'text' | 'bool';
let tipoEstado08Cache: TipoEstado08 | null = null;

async function tipoEstado08(): Promise<TipoEstado08> {
  if (tipoEstado08Cache) return tipoEstado08Cache;
  const r = await pool.query<{ data_type: string; udt_name: string }>(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = 'estado_08'`,
    [TABLA_RESPONSABLE]
  );
  const row = r.rows[0];
  const udt = String(row?.udt_name || '');
  const dataType = String(row?.data_type || '');
  if (dataType === 'ARRAY' || udt.startsWith('_')) tipoEstado08Cache = 'array';
  else if (dataType === 'boolean' || udt === 'bool') tipoEstado08Cache = 'bool';
  else tipoEstado08Cache = 'text';
  return tipoEstado08Cache;
}

/** NULL (no CASE) para que Postgres acepte el tipo de estado_08: arreglo {v}, texto o boolean. */
async function valorEstado08(activo: boolean): Promise<unknown> {
  const tipo = await tipoEstado08();
  if (tipo === 'bool') return activo;
  if (!activo) return null;
  if (tipo === 'array') return ['v'];
  return '{v}';
}

const mapRowToResponsable = (row: any): ResponsableEntrega => {
  const nombre = row.nombreresponsableentrega_08 || '';
  const apaterno = row.apaternoresponsableentrega_08 || '';
  const amaterno = row.amaternoresponsableentrega_08 || '';
  const nombreCompleto = [nombre, apaterno, amaterno]
    .filter(part => part.trim() !== '')
    .join(' ')
    .trim();
  return {
    idresponsableentrega_08: row.idresponsableentrega_08,
    nombreresponsableentrega_08: nombre,
    apaternoresponsableentrega_08: apaterno,
    amaternoresponsableentrega_08: amaterno,
    estado_08: esVigente(row.estado_08),
    nombre_completo: nombreCompleto || nombre
  };
};

/**
 * Obtener todos los responsables de entrega
 */
export const getAllResponsables = async (req: Request, res: Response): Promise<void> => {
  try {
    const soloActivo = parseActivoQuery(req.query.activo);
    const params: boolean[] = [];
    let where = '';
    if (soloActivo !== undefined) {
      params.push(soloActivo);
      where = `
        WHERE (
          CASE WHEN $1 THEN
            estado_08 IS NOT NULL AND CAST(estado_08 AS TEXT) ILIKE '%v%'
          ELSE
            estado_08 IS NULL OR CAST(estado_08 AS TEXT) NOT ILIKE '%v%'
          END
        )`;
    }

    const query = `
      SELECT ${SELECT_RESPONSABLE}
      FROM ${TABLA_RESPONSABLE}
      ${where}
      ORDER BY nombreresponsableentrega_08 ASC
    `;

    const result = await pool.query(query, params);
    const responsables = result.rows.map(mapRowToResponsable);

    const response: ApiResponse<ResponsableEntrega[]> = {
      success: true,
      data: responsables
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener responsables:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener los responsables',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

/**
 * Obtener un responsable por ID
 */
export const getResponsableById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ${SELECT_RESPONSABLE}
       FROM ${TABLA_RESPONSABLE} WHERE idresponsableentrega_08 = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Responsable no encontrado' });
      return;
    }
    const response: ApiResponse<ResponsableEntrega> = {
      success: true,
      data: mapRowToResponsable(result.rows[0])
    };
    res.json(response);
  } catch (error) {
    console.error('Error al obtener responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un responsable de entrega
 */
export const createResponsable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08, estado_08 } = req.body;

    if (!nombreresponsableentrega_08 || !nombreresponsableentrega_08.trim()) {
      res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
      return;
    }

    const activo = estado_08 !== false && estado_08 !== 'false';
    const result = await pool.query(
      `INSERT INTO ${TABLA_RESPONSABLE} (nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08, estado_08)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_RESPONSABLE}`,
      [
        nombreresponsableentrega_08.trim(),
        apaternoresponsableentrega_08?.trim() || null,
        amaternoresponsableentrega_08?.trim() || null,
        await valorEstado08(activo)
      ]
    );

    const response: ApiResponse<ResponsableEntrega> = {
      success: true,
      data: mapRowToResponsable(result.rows[0]),
      message: 'Responsable creado exitosamente'
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un responsable de entrega
 */
export const updateResponsable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08, estado_08 } = req.body;

    if (!nombreresponsableentrega_08 || !nombreresponsableentrega_08.trim()) {
      res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
      return;
    }

    const activo = estado_08 !== false && estado_08 !== 'false';
    const result = await pool.query(
      `UPDATE ${TABLA_RESPONSABLE}
       SET nombreresponsableentrega_08 = $1,
           apaternoresponsableentrega_08 = $2,
           amaternoresponsableentrega_08 = $3,
           estado_08 = $4
       WHERE idresponsableentrega_08 = $5
       RETURNING ${SELECT_RESPONSABLE}`,
      [
        nombreresponsableentrega_08.trim(),
        apaternoresponsableentrega_08?.trim() || null,
        amaternoresponsableentrega_08?.trim() || null,
        await valorEstado08(activo),
        id
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Responsable no encontrado' });
      return;
    }

    const response: ApiResponse<ResponsableEntrega> = {
      success: true,
      data: mapRowToResponsable(result.rows[0]),
      message: 'Responsable actualizado exitosamente'
    };
    res.json(response);
  } catch (error) {
    console.error('Error al actualizar responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un responsable de entrega
 */
export const deleteResponsable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar si está en uso en asignación de prendas
    const checkPrendas = await pool.query(
      'SELECT idasignacionmain_09 FROM tbl_09_asignacion_main WHERE idresponsableentrega_09 = $1 LIMIT 1',
      [id]
    );
    if (checkPrendas.rowCount && checkPrendas.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar porque está siendo utilizado en asignaciones de prendas'
      });
      return;
    }    // Verificar si está en uso en asignación de productos aseo
    const checkAseo = await pool.query(
      'SELECT idproductomain_12 FROM tbl_12_productomain WHERE idresponsableentrega_12 = $1 LIMIT 1',
      [id]
    );
    if (checkAseo.rowCount && checkAseo.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar porque está siendo utilizado en asignaciones de productos de aseo'
      });
      return;
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA_RESPONSABLE} WHERE idresponsableentrega_08 = $1 RETURNING idresponsableentrega_08`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Responsable no encontrado' });
      return;
    }

    res.json({
      success: true,
      message: 'Responsable eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
