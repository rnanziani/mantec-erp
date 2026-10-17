export interface EtiquetaPrint {
  codigo_89: string;
  descripcion_89: string;
  proveedor_89: string;
  tamano_89?: string;
}

/** Protocolo Windows: un disparo RAW y el proceso termina. Registrar una vez con iniciar-agente-etiqueta.bat. */
export const PROTOCOLO_ETIQUETA = 'mantec-etiqueta';

function toBase64Url(json: string): string {
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function imprimirEtiqueta(row: EtiquetaPrint, copias = 1): void {
  const n = Math.max(1, Math.min(20, copias));
  const d = toBase64Url(
    JSON.stringify({
      codigo_89: row.codigo_89,
      descripcion_89: row.descripcion_89,
      proveedor_89: row.proveedor_89,
      tamano_89: row.tamano_89 || undefined,
      copias: n,
    })
  );
  const url = `${PROTOCOLO_ETIQUETA}://imprimir?d=${d}`;
  const a = document.createElement('a');
  a.href = url;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
