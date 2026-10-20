/**
 * Combos de tbl_08_responsable_entrega: solo vigentes.
 * El API expone estado_08 como boolean (true = {v} en BD).
 * Si el campo no viene, se conserva la fila (el GET de combos ya filtra en el backend).
 */
export function filtrarResponsablesActivos<T extends { estado_08?: boolean }>(lista: T[] | unknown): T[] {
  if (!Array.isArray(lista)) return [];
  return lista.filter((r) => r && r.estado_08 !== false);
}
