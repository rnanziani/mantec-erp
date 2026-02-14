import * as XLSX from 'xlsx';

/**
 * Exporta reporte en formato maestro-detalle a Excel con celdas combinadas
 */
export const exportReporteMaestroDetalleToExcel = (
  grupos: Array<{
    fecha_09: string;
    hora_09: string;
    trabajador_nombre: string;
    responsable_nombre: string;
    empresa_nombre: string;
    detalles: Array<{ prenda_nombre: string; talla_10: string; cantidad_10: number }>;
  }>,
  filename: string,
  formatDate: (date: string) => string,
  formatHora: (time: string) => string,
  fechaHoraImpresion?: string,
  usuario?: string
): void => {
  const headers = ['Fecha', 'Hora', 'Trabajador', 'Prenda', 'Talla', 'Cantidad', 'Responsable', 'Empresa'];
  const metaRows: (string | number)[][] = [];
  if (usuario) metaRows.push(['Usuario:', usuario]);
  if (fechaHoraImpresion) metaRows.push(['Fecha y hora de impresión:', fechaHoraImpresion]);
  const rows: (string | number)[][] = [
    ...(metaRows.length > 0 ? [...metaRows, []] : []),
    headers
  ];

  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  const headerOffset = metaRows.length > 0 ? metaRows.length + 1 : 0; // filas meta + fila vacía antes de headers
  let currentRow = 1 + headerOffset;

  grupos.forEach((grupo) => {
    const numDetalles = grupo.detalles.length;
    grupo.detalles.forEach((det, dIdx) => {
      if (dIdx === 0) {
        rows.push([
          formatDate(grupo.fecha_09),
          formatHora(grupo.hora_09),
          grupo.trabajador_nombre,
          det.prenda_nombre,
          det.talla_10,
          det.cantidad_10,
          grupo.responsable_nombre,
          grupo.empresa_nombre
        ]);
      } else {
        rows.push(['', '', '', det.prenda_nombre, det.talla_10, det.cantidad_10, '', '']);
      }
    });

    if (numDetalles > 1) {
      [0, 1, 2, 6, 7].forEach((col) => {
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
