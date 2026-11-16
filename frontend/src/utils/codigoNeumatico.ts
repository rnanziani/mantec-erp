/** N° Fuego de fábrica: T + YY + secuencia (T261, T2612). */
export const FUEGO_RE = /^T[0-9]{2}[0-9]+$/;

/** Flota sin N° Fuego: TSNAU / TSNAU1 / TSNGY. */
export const TSN_RE = /^TSN(AU|GY|MI|JI)[0-9]*$/;

export const TSN_SENTINEL = 'TSN';

const TSN_POR_MARCA: Record<string, string> = {
  AUSTONE: 'TSNAU',
  GOODYEAR: 'TSNGY',
  MICHELIN: 'TSNMI',
  JINYU: 'TSNJI',
};

export const TSN_LEYENDA: Record<string, string> = {
  TSNAU: 'TRANSANTIN SIN NUMERO AUSTONE',
  TSNGY: 'TRANSANTIN SIN NUMERO GOOD YEAR',
  TSNMI: 'TRANSANTIN SIN NUMERO MICHELIN',
  TSNJI: 'TRANSANTIN SIN NUMERO JINYU',
};

export function marcaClaveNeumatico(nombre: string | null | undefined): string {
  return String(nombre || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .toLocaleUpperCase('en-US')
    .replace(/[^A-Z]/g, '');
}

export function prefijoTsnDeMarca(nombre: string | null | undefined): string | null {
  return TSN_POR_MARCA[marcaClaveNeumatico(nombre)] || null;
}

export function esCodigoNeumaticoValido(codigo: string | null | undefined): boolean {
  const c = String(codigo || '').trim().toUpperCase();
  return FUEGO_RE.test(c) || TSN_RE.test(c);
}

export function esCodigoTsn(codigo: string | null | undefined): boolean {
  return TSN_RE.test(String(codigo || '').trim().toUpperCase());
}

/** Código de flota (TSNAU, TSNGY1…): no es un N° Fuego único. */
export function esCodigoFlotaSinFuego(codigo: string | null | undefined): boolean {
  return /^TSN[A-Z]/i.test(String(codigo || '').trim());
}

export function permiteRepetirPosicion(n: {
  bloquea_ocupacion_31?: boolean | null;
  cod_neumatico_31?: string | null;
} | null | undefined): boolean {
  if (!n) return false;
  if (typeof n.bloquea_ocupacion_31 === 'boolean') return n.bloquea_ocupacion_31 === false;
  return esCodigoFlotaSinFuego(n.cod_neumatico_31);
}

export function prefijoTsnDeCodigo(codigo: string | null | undefined): string | null {
  const c = String(codigo || '').trim().toUpperCase();
  const m = c.match(/^TSN(AU|GY|MI|JI)/);
  return m ? `TSN${m[1]}` : null;
}

/** En combos, la flota TSN va primero: si no, queda bajo todos los T261. */
export function compararCodigoNeumatico(a: string, b: string): number {
  const at = esCodigoTsn(a);
  const bt = esCodigoTsn(b);
  if (at !== bt) return at ? -1 : 1;
  return String(a || '').localeCompare(String(b || ''), 'es', { numeric: true });
}

export function keywordsNeumatico(n: {
  cod_neumatico_31?: string | null;
  marca_32?: string | null;
  modelo_31?: string | null;
  medida_31?: string | null;
  observaciones_31?: string | null;
}): string {
  const fuego = String(n.cod_neumatico_31 || '').trim().toUpperCase();
  const prefijo = prefijoTsnDeCodigo(fuego);
  return [
    fuego,
    prefijo,
    n.marca_32,
    n.modelo_31,
    n.medida_31,
    n.observaciones_31,
    prefijo ? TSN_LEYENDA[prefijo] : '',
    prefijo ? 'SIN NUMERO SIN MARCA TSN TRANSANTIN FLOTA' : '',
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' ');
}
