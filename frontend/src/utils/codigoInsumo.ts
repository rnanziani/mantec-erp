export const CODIGO_INSUMO_LENGTH = 20;

/** Limpia mientras se escribe: solo alfanuméricos, mayúsculas, máximo 20. */
export function normalizeCodigoInsumoInput(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, CODIGO_INSUMO_LENGTH);
}

/**
 * Justifica el código con ceros a la izquierda hasta 20 caracteres.
 * Ej: "JBM54144" → "000000000000JBM54144"
 * Vacío → null (campo opcional).
 */
export function padCodigoInsumo(raw: string, length = CODIGO_INSUMO_LENGTH): string | null {
  const normalized = normalizeCodigoInsumoInput(raw);
  if (!normalized) return null;
  return normalized.padStart(length, '0');
}
