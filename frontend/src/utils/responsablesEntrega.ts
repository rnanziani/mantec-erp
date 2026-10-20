/**
 * Combos de tbl_08_responsable_entrega: solo vigentes.
 * El API expone estado_08 como boolean (true = {v} en BD).
 * Si el campo no viene, se conserva la fila (el GET de combos ya filtra en el backend).
 */
export function filtrarResponsablesActivos<T>(lista: T[]): T[] {
  return lista.filter((item) => {
    const r = item as T & { estado_08?: boolean };
    return Boolean(r) && r.estado_08 !== false;
  });
}
