import { pool } from '../db.js';

/**
 * Cache de parámetros para evitar consultas repetidas
 * Se actualiza cada vez que se modifica un parámetro
 */
let parametrosCache: Map<string, string> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtener un parámetro del sistema desde la base de datos
 * @param codigoParametro - Código del parámetro a obtener
 * @param valorPorDefecto - Valor por defecto si no se encuentra el parámetro
 * @returns Valor del parámetro como string
 */
export async function obtenerParametro(
  codigoParametro: string,
  valorPorDefecto: string
): Promise<string> {
  try {
    // Verificar cache
    const ahora = Date.now();
    if (ahora - cacheTimestamp < CACHE_DURATION && parametrosCache.has(codigoParametro)) {
      return parametrosCache.get(codigoParametro)!;
    }

    // Consultar base de datos
    const result = await pool.query(
      `SELECT valor_parametro_000 
       FROM tbl_000_parametros_sistema 
       WHERE codigo_parametro_000 = $1 AND activo_000 = TRUE`,
      [codigoParametro]
    );

    if (result.rows.length > 0) {
      const valor = result.rows[0].valor_parametro_000;
      parametrosCache.set(codigoParametro, valor);
      return valor;
    }

    // Si no existe, usar valor por defecto y guardarlo en cache
    parametrosCache.set(codigoParametro, valorPorDefecto);
    return valorPorDefecto;
  } catch (error) {
    console.error(`Error al obtener parámetro ${codigoParametro}:`, error);
    return valorPorDefecto;
  }
}

/**
 * Obtener parámetro como número
 */
export async function obtenerParametroNumero(
  codigoParametro: string,
  valorPorDefecto: number
): Promise<number> {
  const valor = await obtenerParametro(codigoParametro, valorPorDefecto.toString());
  const numero = parseInt(valor, 10);
  return isNaN(numero) ? valorPorDefecto : numero;
}

/**
 * Obtener parámetro como booleano
 */
export async function obtenerParametroBooleano(
  codigoParametro: string,
  valorPorDefecto: boolean
): Promise<boolean> {
  const valor = await obtenerParametro(codigoParametro, valorPorDefecto.toString());
  return valor.toLowerCase() === 'true' || valor === '1';
}

/**
 * Invalidar cache de parámetros
 * Se debe llamar cuando se modifica un parámetro
 */
export function invalidarCacheParametros(): void {
  parametrosCache.clear();
  cacheTimestamp = 0;
}

/**
 * Obtener todos los parámetros del sistema
 */
export async function obtenerTodosParametros(): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id_parametro_000, codigo_parametro_000, nombre_parametro_000, valor_parametro_000, 
              descripcion_000, tipo_dato_000, activo_000, fecha_creacion_000, fecha_actualizacion_000, usuario_actualizacion_000
       FROM tbl_000_parametros_sistema
       ORDER BY codigo_parametro_000`
    );
    return result.rows;
  } catch (error) {
    console.error('Error al obtener todos los parámetros:', error);
    return [];
  }
}

/**
 * Obtener tiempo de sesión en segundos con compatibilidad hacia atrás
 * - Si existe SESSION_TIMEOUT_SECONDS (>0), usarlo
 * - Si no, usar SESSION_TIMEOUT_MINUTES * 60
 */
export async function obtenerTiempoSesionSegundos(defectoSegundos: number = 30 * 60): Promise<number> {
  const seg = await obtenerParametroNumero('SESSION_TIMEOUT_SECONDS', -1);
  if (seg > 0) return seg;
  const min = await obtenerParametroNumero('SESSION_TIMEOUT_MINUTES', Math.floor(defectoSegundos / 60));
  return min * 60;
}

/**
 * Actualizar un parámetro del sistema
 * @param idParametro - ID del parámetro a actualizar
 * @param valorParametro - Nuevo valor del parámetro
 * @param trabajadorId - ID del trabajador que realiza la actualización (opcional, puede ser NULL)
 */
export async function actualizarParametro(
  idParametro: number,
  valorParametro: string,
  trabajadorId?: number
): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE tbl_000_parametros_sistema 
       SET valor_parametro_000 = $1, 
           usuario_actualizacion_000 = $2
       WHERE id_parametro_000 = $3`,
      [valorParametro, trabajadorId || null, idParametro]
    );
    
    // Invalidar cache
    invalidarCacheParametros();
    return true;
  } catch (error) {
    console.error('Error al actualizar parámetro:', error);
    return false;
  }
}







