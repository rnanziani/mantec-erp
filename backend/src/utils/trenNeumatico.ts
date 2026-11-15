/** Eje direccional: una cubierta por lado, máximo 2. */
export const CAPACIDAD_TREN_DELANTERO = 2;

/**
 * Tren delantero por código de tbl_73:
 * L1/R1 (plano bus), 1E/1D (catálogo viejo), DEL-IZQ1 / DEL-DER1.
 */
export function esTrenDelantero(codigo: string | null | undefined): boolean {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return false;
  if (c === 'L1' || c === 'R1' || c === '1E' || c === '1D') return true;
  return c.startsWith('DEL');
}
