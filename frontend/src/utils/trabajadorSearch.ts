/** Campos mínimos para búsqueda por apellido en combos de trabajador. */
export interface TrabajadorApellidoSearch {
  apaterno_06?: string | null;
  amaterno_06?: string | null;
  nombre_06?: string | null;
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function apellidosTexto(t: TrabajadorApellidoSearch): string {
  return norm(`${t.apaterno_06 || ''} ${t.amaterno_06 || ''}`);
}

/**
 * Filtra trabajadores por apellido(s).
 * Soporta apellido paterno compuesto (ej. SAN MARTIN + OBANDO).
 */
export function filtrarTrabajadoresPorApellido<T extends TrabajadorApellidoSearch>(
  trabajadores: T[],
  busqueda: string
): T[] {
  const q = norm(busqueda);
  if (!q) return trabajadores;

  const tokens = q.split(' ').filter(Boolean);

  return trabajadores.filter((t) => {
    const ap = norm(t.apaterno_06 || '');
    const am = norm(t.amaterno_06 || '');
    const fullApellidos = apellidosTexto(t);

    if (fullApellidos.includes(q)) return true;

    if (tokens.length === 1) {
      const w = tokens[0];
      return ap.includes(w) || am.includes(w);
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
