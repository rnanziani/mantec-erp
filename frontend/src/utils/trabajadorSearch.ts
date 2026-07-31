/** Campos mínimos para búsqueda por apellido en combos de trabajador. */
export interface TrabajadorApellidoSearch {
  apaterno_06?: string | null;
  amaterno_06?: string | null;
  nombre_06?: string | null;
}

/** Normaliza texto para comparar (sin acentos, ñ→n, minúsculas). */
export function normalizeTrabajadorTexto(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/g, 'n')
    .replace(/\s+/g, ' ');
}

function textoBusqueda(t: TrabajadorApellidoSearch): string {
  return normalizeTrabajadorTexto(
    `${t.apaterno_06 || ''} ${t.amaterno_06 || ''} ${t.nombre_06 || ''}`
  );
}

/**
 * Filtra trabajadores por apellido(s).
 * Soporta apellido paterno compuesto (ej. SAN MARTIN + OBANDO).
 * También busca en nombre y tolera tildes/ñ (QUINONEZ = QUIÑONEZ).
 */
export function filtrarTrabajadoresPorApellido<T extends TrabajadorApellidoSearch>(
  trabajadores: T[],
  busqueda: string
): T[] {
  const q = normalizeTrabajadorTexto(busqueda);
  if (!q) return trabajadores;

  const tokens = q.split(' ').filter(Boolean);

  return trabajadores.filter((t) => {
    const ap = normalizeTrabajadorTexto(t.apaterno_06 || '');
    const am = normalizeTrabajadorTexto(t.amaterno_06 || '');
    const nom = normalizeTrabajadorTexto(t.nombre_06 || '');
    const full = textoBusqueda(t);

    if (full.includes(q)) return true;

    if (tokens.length === 1) {
      const w = tokens[0];
      return ap.includes(w) || am.includes(w) || nom.includes(w);
    }

    if (tokens.length === 2) {
      const [a, b] = tokens;
      if (ap.includes(`${a} ${b}`)) return true;
      return (ap.includes(a) && am.includes(b)) || (ap.startsWith(a) && am.startsWith(b));
    }

    const materno = tokens[tokens.length - 1];
    const paterno = tokens.slice(0, -1).join(' ');
    return ap.includes(paterno) && am.includes(materno);
  });
}
