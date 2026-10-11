import { code128Svg, tamanoEtiquetaMm } from './code128';

export interface EtiquetaPrint {
  codigo_89: string;
  descripcion_89: string;
  proveedor_89: string;
}

export function imprimirEtiqueta(row: EtiquetaPrint, copias = 1): void {
  const { w, h, nombre } = tamanoEtiquetaMm(row.codigo_89);
  const svg = code128Svg(row.codigo_89, Math.max(w - 6, 20), Math.max(h * 0.38, 8));
  const n = Math.max(1, Math.min(20, copias));
  const pages = Array.from({ length: n }, () => {
    return `<section class="lbl">
      <div class="top">
        <strong>${esc(row.codigo_89)}</strong>
        <span>${esc(row.proveedor_89)}</span>
      </div>
      <div class="bars">${svg}</div>
      <div class="desc">${esc(row.descripcion_89)}</div>
    </section>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>Etiqueta ${esc(row.codigo_89)}</title>
<style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .lbl {
    width: ${w}mm; height: ${h}mm; box-sizing: border-box;
    padding: 1.2mm 1.6mm; overflow: hidden;
    page-break-after: always; display: flex; flex-direction: column; justify-content: space-between;
  }
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
  .top strong { font-size: ${w >= 80 ? 11 : 8}px; letter-spacing: 0.2px; }
  .top span { font-size: 7px; }
  .bars { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
  .bars svg { width: 100%; max-height: 100%; }
  .desc { font-size: ${w >= 80 ? 9 : 7}px; line-height: 1.15; }
  @media print { .hint { display: none; } }
  .hint { font-size: 12px; padding: 8px; color: #333; }
</style></head>
<body>
<p class="hint">Impresora: ZDesigner LP 2844 · papel ${nombre} · tamaño real (no ajustar a la página).</p>
${pages}
</body></html>`;

  document.getElementById('etiqueta-print-frame')?.remove();
  const iframe = document.createElement('iframe');
  iframe.id = 'etiqueta-print-frame';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'Impresión de etiqueta';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    throw new Error('No se pudo preparar la impresión en esta pestaña.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  const limpiar = () => {
    iframe.remove();
  };
  win.addEventListener('afterprint', limpiar);
  const imprimir = () => {
    win.focus();
    win.print();
    window.setTimeout(limpiar, 60_000);
  };
  if (doc.readyState === 'complete') {
    imprimir();
  } else {
    iframe.onload = imprimir;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
