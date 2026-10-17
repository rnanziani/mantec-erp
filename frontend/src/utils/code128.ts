/** Patrones Code 128 (anchos bar/space, 6 dígitos). */
const ENC = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131',
  '211412','211214','211232','2331112',
];

function symbolValue(ch: string): number {
  const c = ch.charCodeAt(0);
  if (c < 32 || c > 126) return 0;
  return c - 32;
}

export function code128Path(text: string, module = 1): { width: number; d: string } {
  const vals = [104];
  for (const ch of text) vals.push(symbolValue(ch));
  let sum = 104;
  vals.slice(1).forEach((v, i) => {
    sum += v * (i + 1);
  });
  vals.push(sum % 103);
  vals.push(106);

  let x = 0;
  const rects: string[] = [];
  for (const v of vals) {
    const pat = ENC[v] || ENC[0];
    for (let i = 0; i < pat.length; i++) {
      const w = Number(pat[i]) * module;
      if (i % 2 === 0) {
        rects.push(`M${x} 0h${w}v100h-${w}z`);
      }
      x += w;
    }
  }
  return { width: x, d: rects.join('') };
}

export function code128Svg(text: string, widthMm: number, heightMm: number): string {
  const { width, d } = code128Path(text, 1);
  const h = Math.max(8, heightMm);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 100" width="${widthMm}mm" height="${h}mm" preserveAspectRatio="none" role="img" aria-label="${text}"><path fill="#000" d="${d}"/></svg>`;
}

export type TamanoEtiquetaId = '32x20' | '50x30' | '100x30';

export interface TamanoEtiqueta {
  id: TamanoEtiquetaId;
  w: number;
  h: number;
  nombre: string;
}

/** Tres rollos TLP. El sugerido sigue el largo; se puede guardar uno más grande. */
export const TAMANOS_ETIQUETA: TamanoEtiqueta[] = [
  { id: '32x20', w: 32, h: 20, nombre: '32 × 20 mm' },
  { id: '50x30', w: 50, h: 30, nombre: '50 × 30 mm' },
  { id: '100x30', w: 100, h: 30, nombre: '100 × 30 mm' },
];

export function tamanoEtiquetaMm(codigo: string): TamanoEtiqueta {
  const n = codigo.trim().length;
  if (n <= 8) return TAMANOS_ETIQUETA[0];
  if (n <= 14) return TAMANOS_ETIQUETA[1];
  return TAMANOS_ETIQUETA[2];
}

export function esTamanoEtiquetaId(v: string | null | undefined): v is TamanoEtiquetaId {
  return TAMANOS_ETIQUETA.some((t) => t.id === v);
}

/** Formatos donde el código cabe. Se puede subir de rollo, no bajar. */
export function formatosQueCaben(codigo: string): TamanoEtiqueta[] {
  const n = codigo.trim().length;
  return TAMANOS_ETIQUETA.filter((t) => {
    if (t.id === '32x20') return n <= 8;
    if (t.id === '50x30') return n <= 14;
    return n <= 25;
  });
}

export function tamanoDeFila(codigo: string, guardado?: string | null): TamanoEtiqueta {
  if (esTamanoEtiquetaId(guardado) && formatosQueCaben(codigo).some((t) => t.id === guardado)) {
    return TAMANOS_ETIQUETA.find((t) => t.id === guardado) ?? tamanoEtiquetaMm(codigo);
  }
  return tamanoEtiquetaMm(codigo);
}
