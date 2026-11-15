/** N° Fuego de fábrica: T + YY + secuencia (T261, T2612). */
export const FUEGO_RE = /^T[0-9]{2}[0-9]+$/;

/** Flota sin N° Fuego: TSN + marca + secuencia (TSNAU1, TSNGY2). */
export const TSN_RE = /^TSN(AU|GY|MI|JI)[0-9]+$/;

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
