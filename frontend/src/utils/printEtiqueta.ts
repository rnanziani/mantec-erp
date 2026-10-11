export interface EtiquetaPrint {
  codigo_89: string;
  descripcion_89: string;
  proveedor_89: string;
}

/** Protocolo Windows: un disparo RAW y el proceso termina. Hay que registrar una vez (iniciar-agente-etiqueta.bat). */
export const PROTOCOLO_ETIQUETA = 'mantec-etiqueta';

export function imprimirEtiqueta(row: EtiquetaPrint, copias = 1): void {
  const n = Math.max(1, Math.min(20, copias));
  const q = new URLSearchParams({
    codigo_89: row.codigo_89,
    descripcion_89: row.descripcion_89,
    proveedor_89: row.proveedor_89,
    copias: String(n),
  });
  const url = `${PROTOCOLO_ETIQUETA}://imprimir?${q.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
