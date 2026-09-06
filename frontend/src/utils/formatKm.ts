/** Odómetro: en pantalla 1.563.639; en BD el entero 1563639. */

export function parseEnteroKm(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function formatEnteroKm(value: string | number | null | undefined): string {
  const n = parseEnteroKm(value);
  if (n == null) return '';
  return n.toLocaleString('es-CL');
}
