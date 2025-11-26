import * as XLSX from 'xlsx';

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
