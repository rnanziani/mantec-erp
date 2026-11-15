/** Etiqueta de combo / listado: T261 — BRIDGESTONE R152 315/80 R22.5 */
export function etiquetaNeumatico(n: {
  cod_neumatico_31?: string | null;
  marca_32?: string | null;
  modelo_31?: string | null;
  medida_31?: string | null;
}): string {
  const fuego = String(n.cod_neumatico_31 || '').trim();
  const resto = [n.marca_32, n.modelo_31, n.medida_31]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' ');
  if (fuego && resto) return `${fuego} — ${resto}`;
  return fuego || resto;
}
