/** Agrupaciones del catálogo (mismo orden e intervalos que el sidebar / PermisoView) */
export const RANGOS_MODULO_PERMISOS = [
    { label: 'Inicio', min: 1000, max: 1999 },
    { label: 'Nivel de Acceso', min: 2000, max: 2999 },
    { label: 'Operaciones', min: 3000, max: 3999 },
    { label: 'Neumáticos', min: 4000, max: 4999 },
    { label: 'Gestión Alternadores', min: 5000, max: 5999 },
    { label: 'Mantenedores', min: 6000, max: 6999 },
    { label: 'Reportes', min: 7000, max: 7999 },
] as const;

export const moduloRangoValue = (min: number, max: number) => `${min}-${max}`;

export function permisoEnRangoModulo(
    orden: number | null | undefined,
    min: number,
    max: number
): boolean {
    const o = orden ?? 0;
    return o >= min && o <= max;
}

export function filtrarPermisosPorModulo<T extends { orden_05?: number | null }>(
    permisos: T[],
    moduloValue: string
): T[] {
    if (!moduloValue) return permisos;
    const rango = RANGOS_MODULO_PERMISOS.find(
        (r) => moduloRangoValue(r.min, r.max) === moduloValue
    );
    if (!rango) return permisos;
    return permisos.filter((p) => permisoEnRangoModulo(p.orden_05, rango.min, rango.max));
}
