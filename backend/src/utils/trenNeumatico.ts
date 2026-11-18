/** Eje direccional: una cubierta por lado, máximo 2. */
export const CAPACIDAD_TREN_DELANTERO = 2;

/**
 * Tren delantero por código de tbl_73:
 * L1 / L1 IZQ / R1 DER (plano bus), 1E/1D (catálogo viejo), DELIZQ1 / DELDER1.
 */
export function esTrenDelantero(codigo: string | null | undefined): boolean {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return false;
  const compact = c.replace(/[\s\-_/]/g, '');
  if (compact === '1E' || compact === '1D') return true;
  if (/^L1($|IZQ|DER|I$|D$)/.test(compact)) return true;
  if (/^R1($|IZQ|DER|I$|D$)/.test(compact)) return true;
  return compact.startsWith('DEL');
}
