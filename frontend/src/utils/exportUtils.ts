import * as XLSX from 'xlsx';

/**
 * Exporta reporte en formato maestro-detalle a Excel con celdas combinadas
 */
export const exportReporteMaestroDetalleToExcel = (
  grupos: Array<{
    idasignacionmain_09: number;
    fecha_09: string;
    hora_09: string;
    rut_trabajador: string;
    trabajador_nombre: string;
    responsable_nombre: string;
    empresa_nombre: string;
    detalles: Array<{ prenda_nombre: string; talla_10: string; cantidad_10: number; entregado_10: boolean }>;
  }>,
  filename: string,
  formatDate: (date: string) => string,
  formatHora: (time: string) => string,
  fechaHoraImpresion?: string,
  usuario?: string,
  /** Título completo (ej. incluye fecha/hora de impresión); si se envía, se omite la fila meta duplicada de fecha/hora */
  tituloReporte?: string
): void => {
  const headers = ['ID', 'Fecha', 'Hora', 'RUT', 'Trabajador', 'Prenda', 'Talla', 'Cantidad', 'Entregado', 'Responsable', 'Empresa'];
  const metaRows: (string | number)[][] = [];
  if (usuario) metaRows.push(['Usuario:', usuario]);
  if (fechaHoraImpresion && !tituloReporte) metaRows.push(['Fecha y hora de impresión:', fechaHoraImpresion]);
  const titleRowCount = tituloReporte ? 1 : 0;
  const metaBlock = metaRows.length > 0 ? metaRows.length + 1 : 0;
  const rows: (string | number)[][] = [
    ...(tituloReporte ? [[tituloReporte, '', '', '', '', '', '', '', '', '', '']] : []),
    ...(metaRows.length > 0 ? [...metaRows, []] : []),
    headers
  ];

  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  if (tituloReporte) {
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });
  }
  const headerOffset = titleRowCount + metaBlock;
  let currentRow = 1 + headerOffset;

  grupos.forEach((grupo) => {
    const numDetalles = grupo.detalles.length;
    grupo.detalles.forEach((det, dIdx) => {
      if (dIdx === 0) {
        rows.push([
          grupo.idasignacionmain_09,
          formatDate(grupo.fecha_09),
          formatHora(grupo.hora_09),
          grupo.rut_trabajador,
          grupo.trabajador_nombre,
          det.prenda_nombre,
          det.talla_10,
          det.cantidad_10,
          det.entregado_10 ? 'Verdadero' : 'Falso',
          grupo.responsable_nombre,
          grupo.empresa_nombre
        ]);
      } else {
        rows.push([
          '', '', '', '', '',
          det.prenda_nombre,
          det.talla_10,
          det.cantidad_10,
          det.entregado_10 ? 'Verdadero' : 'Falso',
          '', ''
        ]);
      }
    });

    if (numDetalles > 1) {
      // Columnas con rowSpan: ID, Fecha, Hora, RUT, Trabajador, Responsable, Empresa
      // Indices: 0..10, Entregado varía por detalle (col 8) por eso NO se mergea.
      [0, 1, 2, 3, 4, 9, 10].forEach((col) => {
        merges.push({ s: { r: currentRow, c: col }, e: { r: currentRow + numDetalles - 1, c: col } });
      });
    }
    currentRow += numDetalles;
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  if (merges.length > 0) {
    worksheet['!merges'] = merges;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/** Una fila por asignación (sin líneas de detalle de prendas). */
export const exportReporteSoloMaestroToExcel = (
  rows: Array<{
    idasignacionmain_09: number;
    fecha_09: string;
    hora_09: string;
    rut_trabajador?: string;
    trabajador_nombre: string;
    responsable_nombre: string;
    empresa_nombre: string;
    entregado: boolean;
  }>,
  filename: string,
  formatDate: (date: string) => string,
  formatHora: (time: string) => string,
  formatEstado: (entregado: boolean) => string,
  periodoDesde: string,
  periodoHasta: string,
  fechaHoraImpresion?: string,
  usuario?: string,
  tituloReporte?: string
): void => {
  const headers = ['ID', 'Fecha', 'Hora', 'RUT', 'Trabajador', 'Responsable', 'Empresa', 'Estado'];
  const pad8 = (cells: (string | number)[]): (string | number)[] => {
    const out = [...cells];
    while (out.length < 8) out.push('');
    return out.slice(0, 8);
  };

  const topRows: (string | number)[][] = [];
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  let r = 0;

  if (tituloReporte) {
    topRows.push(pad8([tituloReporte]));
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
    r = 1;
  }

  topRows.push(pad8([`Período: ${formatDate(periodoDesde)} - ${formatDate(periodoHasta)}`]));
  merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 7 } });
  r += 1;

  if (usuario) {
    topRows.push(pad8(['Usuario:', usuario]));
    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 7 } });
    r += 1;
  }
  if (fechaHoraImpresion && !tituloReporte) {
    topRows.push(pad8(['Fecha y hora de impresión:', fechaHoraImpresion]));
    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 7 } });
    r += 1;
  }
  if (usuario || (fechaHoraImpresion && !tituloReporte)) {
    topRows.push(pad8([]));
  }

  const dataRows = rows.map((row) => [
    row.idasignacionmain_09,
    formatDate(row.fecha_09),
    formatHora(row.hora_09),
    row.rut_trabajador || 'N/A',
    row.trabajador_nombre || 'N/A',
    row.responsable_nombre || 'N/A',
    row.empresa_nombre || 'N/A',
    formatEstado(row.entregado === true)
  ]);

  const rowsAoa: (string | number)[][] = [...topRows, headers, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(rowsAoa);
  if (merges.length > 0) {
    worksheet['!merges'] = merges;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/** Totales por tipo de prenda (período y filtros ya reflejados en los datos). */
export const exportReporteResumenPrendasToExcel = (
  rows: Array<{
    idprenda_07: number;
    prenda_nombre: string;
    total_cantidad: number | string;
    lineas_detalle: number;
  }>,
  totalGeneral: number,
  filename: string,
  periodoDesde: string,
  periodoHasta: string,
  fechaHoraImpresion?: string,
  usuario?: string,
  tituloReporte?: string
): void => {
  const headers = ['#', 'Tipo de prenda', 'Total cantidad', 'Líneas de detalle'];
  const pad4 = (cells: (string | number)[]): (string | number)[] => {
    const out = [...cells];
    while (out.length < 4) out.push('');
    return out.slice(0, 4);
  };

  const topRows: (string | number)[][] = [];
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  let r = 0;

  if (tituloReporte) {
    topRows.push(pad4([tituloReporte]));
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
    r = 1;
  }

  topRows.push(pad4([`Período: ${periodoDesde} – ${periodoHasta}`]));
  merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 3 } });
  r += 1;

  if (usuario) {
    topRows.push(pad4(['Usuario:', usuario]));
    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 3 } });
    r += 1;
  }
  if (fechaHoraImpresion && !tituloReporte) {
    topRows.push(pad4(['Fecha y hora de impresión:', fechaHoraImpresion]));
    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 3 } });
    r += 1;
  }
  if (usuario || (fechaHoraImpresion && !tituloReporte)) {
    topRows.push(pad4([]));
  }

  const dataRows = rows.map((row, idx) => [
    idx + 1,
    row.prenda_nombre || 'N/A',
    typeof row.total_cantidad === 'string' ? row.total_cantidad : Number(row.total_cantidad),
    row.lineas_detalle
  ]);

  const rowsAoa: (string | number)[][] = [
    ...topRows,
    headers,
    ...dataRows,
    pad4(['', 'TOTAL GENERAL', totalGeneral, ''])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rowsAoa);
  if (merges.length > 0) {
    worksheet['!merges'] = merges;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/** Tabla de Excel: encabezado congelado, filtro y anchos automáticos. */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Datos'
): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  if (data.length > 0) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const lastCol = XLSX.utils.encode_col(range.e.c);
    const lastRow = range.e.r + 1;
    worksheet['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` };
    worksheet['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }];
    const headers = Object.keys(data[0]);
    worksheet['!cols'] = headers.map((h) => {
      const maxLen = Math.max(h.length, ...data.map((row) => String(row[h] ?? '').length));
      return { wch: Math.min(48, Math.max(10, maxLen + 2)) };
    });
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export type FilaPedidoGrupo = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio: string | number;
};

export type GrupoPedidoExcel = {
  proveedor: string;
  totalQty: number;
  lineas: FilaPedidoGrupo[];
};

/** Excel con el mismo recorte que el PDF: bloques por proveedor, cantidad mayor a menor. */
export const exportExcelPedidoPorProveedor = (opts: {
  numero: string;
  fecha: string;
  proveedorPedido: string;
  responsable: string;
  pago: string;
  recepcion: string;
  observaciones?: string | null;
  grupos: GrupoPedidoExcel[];
  totalItems: number;
  totalUnidades: number;
}): void => {
  const aoa: (string | number)[][] = [];
  const merges: XLSX.Range[] = [];
  const pushBanner = (text: string) => {
    const r = aoa.length;
    aoa.push([text, '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  };

  pushBanner('MANTEC ERP');
  pushBanner(`Requerimientos por proveedor — ${opts.numero}`);
  pushBanner(
    `Fecha ${opts.fecha}  ·  Pedido a ${opts.proveedorPedido}  ·  ${opts.responsable}  ·  Pago ${opts.pago}  ·  Recepción ${opts.recepcion}`
  );
  pushBanner(
    `${opts.totalItems} ítems  ·  ${opts.totalUnidades} unidades  ·  ${opts.grupos.length} proveedores`
  );
  if (opts.observaciones) pushBanner(`Obs.: ${opts.observaciones}`);
  aoa.push(['', '', '', '', '']);

  for (const g of opts.grupos) {
    pushBanner(`${g.proveedor}  —  ${g.lineas.length} ítems  —  ${g.totalQty} un.`);
    aoa.push(['#', 'Código', 'Descripción', 'Cant.', 'Precio']);
    g.lineas.forEach((l, i) => {
      aoa.push([i + 1, l.codigo, l.descripcion, l.cantidad, l.precio]);
    });
    aoa.push(['', '', '', '', '']);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 58 }, { wch: 10 }, { wch: 12 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Por proveedor');
  XLSX.writeFile(workbook, `${opts.numero}_requerimientos.xlsx`);
};

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string
): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Crear blob y descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
