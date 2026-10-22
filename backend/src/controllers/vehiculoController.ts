import { Request, Response } from 'express';
import { pool } from '../db.js';

const TABLA = 'tbl_95_vehiculo';
const ESTADOS = new Set(['Activo', 'En Mantenimiento', 'Baja']);

function upper(value: unknown, max: number): string | null {
  if (value == null) return null;
  const t = String(value).trim().toUpperCase();
  if (!t) return null;
  return t.slice(0, max);
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const getAllVehiculos = async (req: Request, res: Response): Promise<void> => {
  try {
    const soloActivos = String(req.query.activos || '') === '1';
    const result = await pool.query(
      `SELECT * FROM ${TABLA}
       ${soloActivos ? `WHERE estado_vehiculo_95 = 'Activo'` : ''}
       ORDER BY patente_95 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener vehículos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getVehiculoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM ${TABLA} WHERE id_vehiculo_95 = $1`, [req.params.id]);
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el vehículo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createVehiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const patente = upper(req.body.patente_95, 10);
    const marca = upper(req.body.marca_95, 50);
    const modelo = upper(req.body.modelo_95, 50);
    if (!patente || !marca || !modelo) {
      res.status(400).json({ success: false, error: 'Patente, marca y modelo son requeridos' });
      return;
    }
    const estado = String(req.body.estado_vehiculo_95 || 'Activo').trim();
    if (!ESTADOS.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado de vehículo inválido' });
      return;
    }
    const km = num(req.body.kilometraje_actual_95) ?? 0;
    if (km < 0) {
      res.status(400).json({ success: false, error: 'El kilometraje no puede ser negativo' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO ${TABLA} (
         patente_95, marca_95, modelo_95, anio_95, color_95, kilometraje_actual_95, estado_vehiculo_95
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        patente,
        marca,
        modelo,
        num(req.body.anio_95),
        upper(req.body.color_95, 30),
        km,
        estado,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Vehículo creado' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /unique/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Ya existe un vehículo con esa patente' : 'Error al crear el vehículo',
      message: msg,
    });
  }
};

export const updateVehiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const patente = upper(req.body.patente_95, 10);
    const marca = upper(req.body.marca_95, 50);
    const modelo = upper(req.body.modelo_95, 50);
    if (!patente || !marca || !modelo) {
      res.status(400).json({ success: false, error: 'Patente, marca y modelo son requeridos' });
      return;
    }
    const estado = String(req.body.estado_vehiculo_95 || 'Activo').trim();
    if (!ESTADOS.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado de vehículo inválido' });
      return;
    }
    const km = num(req.body.kilometraje_actual_95) ?? 0;
    if (km < 0) {
      res.status(400).json({ success: false, error: 'El kilometraje no puede ser negativo' });
      return;
    }
    const result = await pool.query(
      `UPDATE ${TABLA}
       SET patente_95 = $1,
           marca_95 = $2,
           modelo_95 = $3,
           anio_95 = $4,
           color_95 = $5,
           kilometraje_actual_95 = $6,
           estado_vehiculo_95 = $7
       WHERE id_vehiculo_95 = $8
       RETURNING *`,
      [patente, marca, modelo, num(req.body.anio_95), upper(req.body.color_95, 30), km, estado, req.params.id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Vehículo actualizado' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /unique/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Ya existe un vehículo con esa patente' : 'Error al actualizar el vehículo',
      message: msg,
    });
  }
};

export const deleteVehiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const used = await pool.query(
      'SELECT id_bitacora_96 FROM tbl_96_bitacora_viaje WHERE id_vehiculo_96 = $1 LIMIT 1',
      [req.params.id]
    );
    if ((used.rowCount ?? 0) > 0) {
      const result = await pool.query(
        `UPDATE ${TABLA} SET estado_vehiculo_95 = 'Baja' WHERE id_vehiculo_95 = $1 RETURNING *`,
        [req.params.id]
      );
      if ((result.rowCount ?? 0) === 0) {
        res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
        return;
      }
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Tiene bitácoras: se dejó en Baja en lugar de eliminar',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE id_vehiculo_95 = $1 RETURNING id_vehiculo_95`,
      [req.params.id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Vehículo eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el vehículo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
