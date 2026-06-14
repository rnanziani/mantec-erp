import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse, CreateEmpresaDTO, Empresa, UpdateEmpresaDTO } from '../types.js';
import { errorDetails } from '../utils/safeError.js';

const TABLA = 'tbl_15_empresas';

export const getAllEmpresas = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Empresa>(
      `SELECT idempresa_15, nombreempresa_15 FROM ${TABLA} ORDER BY nombreempresa_15 ASC`
    );

    const response: ApiResponse<Empresa[]> = {
      success: true,
      data: result.rows,
      count: result.rowCount ?? undefined
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las empresas',
      message: errorDetails(error)
    });
  }
};

export const getEmpresaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Empresa>(
      `SELECT idempresa_15, nombreempresa_15 FROM ${TABLA} WHERE idempresa_15 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la empresa',
      message: errorDetails(error)
    });
  }
};

export const createEmpresa = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { nombreempresa_15 }: CreateEmpresaDTO = req.body;

    if (!nombreempresa_15 || nombreempresa_15.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la empresa es requerido' });
      return;
    }

    const nombre = nombreempresa_15.trim().toUpperCase();

    const existing = await pool.query(
      `SELECT idempresa_15 FROM ${TABLA} WHERE LOWER(nombreempresa_15) = LOWER($1)`,
      [nombre]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una empresa con ese nombre' });
      return;
    }

    await client.query('BEGIN');
    const nextIdResult = await client.query<{ next: number }>(
      `SELECT COALESCE(MAX(idempresa_15), 0) + 1 AS next FROM ${TABLA}`
    );
    const nextId = nextIdResult.rows[0].next;

    const result = await client.query<Empresa>(
      `INSERT INTO ${TABLA} (idempresa_15, nombreempresa_15) VALUES ($1, $2)
       RETURNING idempresa_15, nombreempresa_15`,
      [nextId, nombre]
    );
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Empresa creada exitosamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la empresa',
      message: errorDetails(error)
    });
  } finally {
    client.release();
  }
};

export const updateEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombreempresa_15 }: UpdateEmpresaDTO = req.body;

    if (!nombreempresa_15 || nombreempresa_15.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la empresa es requerido' });
      return;
    }

    const nombre = nombreempresa_15.trim().toUpperCase();

    const existing = await pool.query(
      `SELECT idempresa_15 FROM ${TABLA} WHERE LOWER(nombreempresa_15) = LOWER($1) AND idempresa_15 != $2`,
      [nombre, id]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe otra empresa con ese nombre' });
      return;
    }

    const result = await pool.query<Empresa>(
      `UPDATE ${TABLA} SET nombreempresa_15 = $1 WHERE idempresa_15 = $2
       RETURNING idempresa_15, nombreempresa_15`,
      [nombre, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Empresa actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la empresa',
      message: errorDetails(error)
    });
  }
};

export const deleteEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const usageChecks = [
      { table: 'tbl_06_trabajador', column: 'idempresa_06', label: 'trabajadores' },
      { table: 'tbl_11_maquina', column: 'idempresa_11', label: 'máquinas' },
      { table: 'tbl_09_asignacion_main', column: 'idempresa_09', label: 'asignaciones de prendas' }
    ];

    for (const check of usageChecks) {
      const used = await pool.query(
        `SELECT 1 FROM ${check.table} WHERE ${check.column} = $1 LIMIT 1`,
        [id]
      );
      if (used.rowCount && used.rowCount > 0) {
        res.status(400).json({
          success: false,
          error: `No se puede eliminar porque está siendo utilizada en ${check.label}`
        });
        return;
      }
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idempresa_15 = $1 RETURNING idempresa_15`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      return;
    }

    res.json({ success: true, message: 'Empresa eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la empresa',
      message: errorDetails(error)
    });
  }
};
