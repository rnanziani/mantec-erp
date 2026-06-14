/** Convierte un valor de req.query a string (usar tras validar que exista). */
export function asQueryString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return String(value);
}
