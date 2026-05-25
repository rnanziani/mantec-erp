/**
 * Funciones helper para obtener parámetros del sistema desde el backend
 */
import { apiUrl } from './apiClient';

/**
 * Obtener un parámetro del sistema desde el backend
 */
export async function obtenerParametro(
  codigoParametro: string,
  valorPorDefecto: string
): Promise<string> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(apiUrl(`/parametros/${codigoParametro}`), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.valor_parametro_000) {
        return data.data.valor_parametro_000;
      }
    }
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
