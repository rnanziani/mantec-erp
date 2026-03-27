import * as XLSX from 'xlsx';

/**
 * Exporta reporte en formato maestro-detalle a Excel con celdas combinadas
 */
export const exportReporteMaestroDetalleToExcel = (
  grupos: Array<{
    idasignacionmain_09: number;
    fecha_09: string;
    hora_09: string;
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
  const headers = ['ID', 'Fecha', 'Hora', 'Trabajador', 'Prenda', 'Talla', 'Cantidad', 'Entregado', 'Responsable', 'Empresa'];
  const metaRows: (string | number)[][] = [];
  if (usuario) metaRows.push(['Usuario:', usuario]);
  if (fechaHoraImpresion && !tituloReporte) metaRows.push(['Fecha y hora de impresión:', fechaHoraImpresion]);
  const titleRowCount = tituloReporte ? 1 : 0;
  const metaBlock = metaRows.length > 0 ? metaRows.length + 1 : 0;
  const rows: (string | number)[][] = [
    ...(tituloReporte ? [[tituloReporte, '', '', '', '', '', '', '', '']] : []),
    ...(metaRows.length > 0 ? [...metaRows, []] : []),
    headers
  ];

  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  if (tituloReporte) {
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });
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
          '', '', '', '',
          det.prenda_nombre,
          det.talla_10,
          det.cantidad_10,
          det.entregado_10 ? 'Verdadero' : 'Falso',
          '', ''
        ]);
      }
    });

    if (numDetalles > 1) {
      // Columnas con rowSpan: ID, Fecha, Hora, Trabajador, Responsable, Empresa
      // Indices: 0..9, Entregado varía por detalle (col 7) por eso NO se mergea.
      [0, 1, 2, 3, 8, 9].forEach((col) => {
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

export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Datos'
): void => {
  // Crear worksheet desde los datos
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Crear workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generar archivo
  XLSX.writeFile(workbook, `${filename}.xlsx`);
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
