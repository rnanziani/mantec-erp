import { Request, Response } from 'express';
import { pool } from '../db.js';
import PdfPrinter from 'pdfmake';
import type { PdfDocumentDefinition } from '../utils/pdfTypes.js';
import {
  MaestroConsumoInsumo,
  DetalleConsumoInsumo,
  CreateMaestroConsumoInsumoDTO,
  UpdateMaestroConsumoInsumoDTO,
  ApiResponse
} from '../types.js';

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

interface FilaActaInsumo {
  item: string;
  cantidad: number;
  categoria: string;
}

function formatHoraActa(time: string): string {
  if (!time) return '';
  const parts = String(time).split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
}

function formatDateActa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function fetchConsumoActaBase(id: string | number) {
  const consumoResult = await pool.query(
    `SELECT
        m.id_m_consumo_insumo_46,
        m.fecha_46,
        m.hora_46,
        m.observacion_46,
        m.cantidad_46,
        t.nombre_06,
        t.apaterno_06,
        t.amaterno_06,
        t.ruttrabajador_06,
        c.cargo_14 AS nombre_cargo,
        cc.ccosto_45 AS ccosto_nombre,
        e.nombreempresa_15 AS empresa_nombre,
        r.nombreresponsableentrega_08,
        r.apaternoresponsableentrega_08,
        r.amaternoresponsableentrega_08,
        im.descripcion_43 AS insumo_maestro_nombre,
        catm.categoria_42 AS insumo_maestro_categoria
     FROM tbl_46_m_consumo_insumo m
     INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
     LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
     LEFT JOIN tbl_15_empresas e ON t.idempresa_06 = e.idempresa_15
     INNER JOIN tbl_45_ccosto cc ON m.id_ccosto_46 = cc.id_ccosto_45
     INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
     INNER JOIN tbl_43_insumo im ON m.id_insumo_46 = im.id_insumo_43
     LEFT JOIN tbl_42_categoria catm ON im.id_categoria_43 = catm.id_categoria_42
     WHERE m.id_m_consumo_insumo_46 = $1`,
    [id]
  );

  if (consumoResult.rows.length === 0) {
    return null;
  }

  const consumo = consumoResult.rows[0];

  const detallesResult = await pool.query(
    `SELECT d.cantidad_47, i.descripcion_43 AS insumo_nombre, cat.categoria_42
     FROM tbl_47_d_consumo_insumo d
     INNER JOIN tbl_43_insumo i ON d.id_insumo_47 = i.id_insumo_43
     LEFT JOIN tbl_42_categoria cat ON i.id_categoria_43 = cat.id_categoria_42
     WHERE d.id_m_consumo_insumo_47 = $1
     ORDER BY i.descripcion_43`,
    [id]
  );

  const filasMap = new Map<string, FilaActaInsumo>();

  const agregarFila = (item: string, cantidad: number, categoria: string) => {
    const nombre = item || 'N/A';
    const cat = categoria || 'STD';
    const key = `${nombre}__${cat}`;
    const actual = filasMap.get(key);
    if (actual) {
      actual.cantidad += Number(cantidad || 0);
    } else {
      filasMap.set(key, { item: nombre, cantidad: Number(cantidad || 0), categoria: cat });
    }
  };

  agregarFila(
    consumo.insumo_maestro_nombre,
    consumo.cantidad_46,
    consumo.insumo_maestro_categoria
  );

  detallesResult.rows.forEach((d: { insumo_nombre: string; cantidad_47: number; categoria_42: string }) => {
    agregarFila(d.insumo_nombre, d.cantidad_47, d.categoria_42);
  });

  const filasInsumos = Array.from(filasMap.values());

  const fechaObj = new Date(consumo.fecha_46);
  const nombreTrabajador = `${consumo.nombre_06 || ''} ${consumo.apaterno_06 || ''} ${consumo.amaterno_06 || ''}`.trim();
  const nombreResponsable = `${consumo.nombreresponsableentrega_08 || ''} ${consumo.apaternoresponsableentrega_08 || ''} ${consumo.amaternoresponsableentrega_08 || ''}`.trim();

  return {
    consumo,
    filasInsumos,
    intro: {
      dia: fechaObj.getDate(),
      mes: MESES[fechaObj.getMonth()],
      anio: fechaObj.getFullYear()
    },
    trabajador: {
      nombre: nombreTrabajador,
      rut: consumo.ruttrabajador_06 || '',
      cargo: consumo.nombre_cargo || '',
      empresa: consumo.empresa_nombre || '',
      ccosto: consumo.ccosto_nombre || ''
    },
    responsable: {
      nombre: nombreResponsable,
      fecha: formatDateActa(consumo.fecha_46),
      hora: formatHoraActa(consumo.hora_46)
    },
    observaciones: consumo.observacion_46 || null
  };
}

function buildActaInsumosPdfContent(
  intro: { dia: number; mes: string; anio: number },
  trabajador: { nombre: string; rut: string; cargo: string; empresa: string; ccosto: string },
  filasInsumos: FilaActaInsumo[],
  observaciones: string | null,
  responsable: { nombre: string; fecha: string; hora: string }
): PdfDocumentDefinition['content'] {
  const tableHeader = [
    { text: 'Item', style: 'tableHeader', alignment: 'center' as const },
    { text: 'Cantidad', style: 'tableHeader', alignment: 'center' as const },
    { text: 'Categoría', style: 'tableHeader', alignment: 'center' as const },
    { text: 'Estado', style: 'tableHeader', alignment: 'center' as const },
    { text: 'Estado Entrega', style: 'tableHeader', alignment: 'center' as const }
  ];

  const tableBody: unknown[][] = [tableHeader];
  filasInsumos.forEach((fila) => {
    tableBody.push([
      { text: fila.item, style: 'tableCell' },
      { text: String(fila.cantidad), style: 'tableCell', alignment: 'center' },
      { text: fila.categoria, style: 'tableCell', alignment: 'center' },
      { text: 'Nuevo', style: 'tableCell', alignment: 'center' },
      { text: 'Entregado', style: 'tableCell', alignment: 'center' }
    ]);
  });

  return [
    { text: 'ACTA DE ENTREGA DE INSUMOS', style: 'title', alignment: 'center', margin: [0, 0, 0, 4] },
    { text: 'SIG F-622-006 Versión 001', style: 'version', alignment: 'right', margin: [0, 0, 0, 8] },
    {
      text: `En la ciudad de Santiago, ${intro.dia} días del mes de ${intro.mes} del año ${intro.anio}, se procede a dejar constancia de la entrega de insumos al trabajador que a continuación se detalla:`,
      style: 'intro',
      margin: [0, 0, 0, 10]
    },
    { text: 'Datos del Trabajador:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
    {
      columns: [
        { text: 'Nombre:', style: 'fieldLabel', width: 60 },
        { text: trabajador.nombre, style: 'fieldValue', width: '*' }
      ],
      margin: [0, 0, 0, 4]
    },
    {
      columns: [
        { text: 'Rut:', style: 'fieldLabel', width: 60 },
        { text: trabajador.rut, style: 'fieldValue', width: '*' }
      ],
      margin: [0, 0, 0, 4]
    },
    {
      columns: [
        { text: 'Cargo:', style: 'fieldLabel', width: 60 },
        { text: trabajador.cargo, style: 'fieldValue', width: '*' }
      ],
      margin: [0, 0, 0, 4]
    },
    {
      columns: [
        { text: 'Empresa:', style: 'fieldLabel', width: 60 },
        { text: trabajador.empresa, style: 'fieldValue', width: '*' }
      ],
      margin: [0, 0, 0, 4]
    },
    {
      columns: [
        { text: 'C. Costo:', style: 'fieldLabel', width: 60 },
        { text: trabajador.ccosto, style: 'fieldValue', width: '*' }
      ],
      margin: [0, 0, 0, 10]
    },
    { text: 'Detalle de insumos entregados', style: 'sectionTitle', margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 55, 70, 50, 65],
        body: tableBody
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      margin: [0, 0, 0, 10]
    },
    ...(observaciones
      ? [{
          columns: [
            { text: 'Observaciones:', style: 'fieldLabel', width: 80 },
            { text: observaciones, style: 'fieldValue', width: '*' }
          ],
          margin: [0, 0, 0, 10]
        }]
      : []),
    { text: 'Responsabilidades:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
    { text: 'Usted se compromete a', style: 'paragraph', margin: [0, 0, 0, 4] },
    {
      ul: [
        'Usar los insumos únicamente durante sus funciones laborales.',
        'Mantener los insumos en condiciones adecuadas para su uso.',
        'No alterar ni modificar los insumos entregados.',
        'Responder por el cuidado y conservación de los insumos entregados.',
        'Reportar inmediatamente cualquier daño o pérdida al área correspondiente.',
        'El mal uso o la negligencia en el cuidado de los insumos podrá ser objeto de observaciones o medidas disciplinarias conforme al reglamento interno.'
      ],
      style: 'listItem',
      margin: [0, 0, 0, 10]
    },
    { text: 'Uso de Insumos:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
    {
      text: 'La empresa hace hincapié en la obligatoriedad del uso adecuado de los insumos entregados durante todo el periodo de servicio activo. Su uso contribuye a:',
      style: 'paragraph',
      margin: [0, 0, 0, 6]
    },
    {
      ul: [
        'Garantizar la continuidad operacional del servicio.',
        'Proteger la seguridad del personal y de los usuarios.',
        'Optimizar el control y trazabilidad de materiales.'
      ],
      style: 'listItem',
      margin: [0, 0, 0, 10]
    },
    { text: 'Declaración del Trabajador:', style: 'sectionTitle', margin: [0, 0, 0, 6] },
    {
      text: 'Declaro haber recibido a conformidad los insumos antes detallados, los cuales se encuentran en buen estado y son de uso obligatorio durante mi jornada laboral. Asimismo, me comprometo a dar un uso adecuado y a conservarlos en buenas condiciones, haciéndome responsable de su cuidado.',
      style: 'paragraph',
      margin: [0, 0, 0, 10]
    },
    {
      table: {
        widths: ['*', '*'],
        body: [
          [
            { text: 'Firma', style: 'tableHeader', alignment: 'center' },
            { text: 'Huella', style: 'tableHeader', alignment: 'center' }
          ],
          [
            { text: '', style: 'tableCell', margin: [0, 25, 0, 0] },
            { text: '', style: 'tableCell', margin: [0, 25, 0, 0] }
          ]
        ]
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      margin: [0, 0, 0, 12]
    },
    { text: 'Firma del encargado de Entrega', style: 'sectionTitle', margin: [0, 0, 0, 8] },
    {
      columns: [
        { text: 'Nombre: ' + responsable.nombre, style: 'field', width: '*' },
        { text: 'Fecha: ' + responsable.fecha + ' ' + responsable.hora, style: 'field', width: 150 }
      ]
    }
  ];
}

const ACTA_PDF_STYLES: PdfDocumentDefinition['styles'] = {
  title: { fontSize: 14, bold: true },
  version: { fontSize: 8, color: '#666' },
  intro: { fontSize: 9 },
  fieldLabel: { fontSize: 9 },
  fieldValue: { fontSize: 9 },
  field: { fontSize: 9 },
  sectionTitle: { fontSize: 10, bold: true },
  tableHeader: { fontSize: 8, bold: true, fillColor: '#e8e8e8' },
  tableCell: { fontSize: 8 },
  listItem: { fontSize: 8 },
  paragraph: { fontSize: 8 }
};

/**
 * Obtener todos los consumos (maestro) con datos relacionados
 */
export const getAllConsumosInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       ORDER BY m.fecha_46 DESC, m.hora_46 DESC, m.id_m_consumo_insumo_46 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener consumos de insumos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un consumo por ID con sus detalles
 */
export const getConsumoInsumoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const maestroResult = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       WHERE m.id_m_consumo_insumo_46 = $1`,
      [id]
    );

    if (maestroResult.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    const detallesResult = await pool.query<DetalleConsumoInsumo>(
      `SELECT d.id_d_consumo_insumo_47, d.id_m_consumo_insumo_47, d.id_insumo_47, d.cantidad_47, d.total_47, d.observacion_47,
              i.descripcion_43 AS insumo_descripcion, i.precio_insumo_43 AS precio_insumo
       FROM tbl_47_d_consumo_insumo d
       INNER JOIN tbl_43_insumo i ON d.id_insumo_47 = i.id_insumo_43
       WHERE d.id_m_consumo_insumo_47 = $1
       ORDER BY d.id_d_consumo_insumo_47 ASC`,
      [id]
    );

    const maestro = maestroResult.rows[0];
    const detalles = detallesResult.rows;

    res.json({
      success: true,
      data: {
        maestro,
        detalles
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear consumo maestro con detalles
 */
export const createConsumoInsumo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateMaestroConsumoInsumoDTO = req.body;
    const {
      idtrabajador_46,
      id_responsableentrega_46,
      id_ccosto_46,
      id_insumo_46,
      cantidad_46,
      fecha_46,
      hora_46,
      observacion_46,
      detalles = []
    } = body;

    if (
      idtrabajador_46 === undefined ||
      id_responsableentrega_46 === undefined ||
      id_ccosto_46 === undefined ||
      id_insumo_46 === undefined ||
      cantidad_46 === undefined ||
      !fecha_46 ||
      !hora_46
    ) {
      res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: idtrabajador_46, id_responsableentrega_46, id_ccosto_46, id_insumo_46, cantidad_46, fecha_46, hora_46'
      });
      return;
    }

    if (cantidad_46 <= 0) {
      res.status(400).json({ success: false, error: 'La cantidad debe ser mayor a 0' });
      return;
    }

    await client.query('BEGIN');

    const insertMaestro = await client.query(
      `INSERT INTO tbl_46_m_consumo_insumo (idtrabajador_46, id_responsableentrega_46, id_ccosto_46, id_insumo_46, cantidad_46, fecha_46, hora_46, observacion_46)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_m_consumo_insumo_46`,
      [idtrabajador_46, id_responsableentrega_46, id_ccosto_46, id_insumo_46, cantidad_46, fecha_46, hora_46, observacion_46 || null]
    );

    const idMaestro = insertMaestro.rows[0].id_m_consumo_insumo_46;

    for (const det of detalles) {
      if (det.id_insumo_47 === undefined || det.cantidad_47 === undefined || det.cantidad_47 <= 0) continue;

      const precioResult = await client.query(
        'SELECT precio_insumo_43 FROM tbl_43_insumo WHERE id_insumo_43 = $1',
        [det.id_insumo_47]
      );
      const precio = precioResult.rows[0]?.precio_insumo_43 ?? 0;
      const total = Number(det.cantidad_47) * Number(precio);

      await client.query(
        `INSERT INTO tbl_47_d_consumo_insumo (id_m_consumo_insumo_47, id_insumo_47, cantidad_47, total_47, observacion_47)
         VALUES ($1, $2, $3, $4, $5)`,
        [idMaestro, det.id_insumo_47, det.cantidad_47, total, det.observacion_47 || null]
      );
    }

    await client.query('COMMIT');

    const withJoin = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       WHERE m.id_m_consumo_insumo_46 = $1`,
      [idMaestro]
    );

    res.status(201).json({
      success: true,
      data: withJoin.rows[0],
      message: 'Consumo de insumo creado exitosamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    client.release();
  }
};

/**
 * Actualizar consumo maestro y detalles
 */
export const updateConsumoInsumo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroConsumoInsumoDTO = req.body;
    const {
      idtrabajador_46,
      id_responsableentrega_46,
      id_ccosto_46,
      id_insumo_46,
      cantidad_46,
      fecha_46,
      hora_46,
      observacion_46,
      detalles
    } = body;

    const exists = await client.query('SELECT id_m_consumo_insumo_46 FROM tbl_46_m_consumo_insumo WHERE id_m_consumo_insumo_46 = $1', [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    if (cantidad_46 !== undefined && cantidad_46 <= 0) {
      res.status(400).json({ success: false, error: 'La cantidad debe ser mayor a 0' });
      return;
    }

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (idtrabajador_46 !== undefined) {
      updates.push(`idtrabajador_46 = $${paramIndex++}`);
      values.push(idtrabajador_46);
    }
    if (id_responsableentrega_46 !== undefined) {
      updates.push(`id_responsableentrega_46 = $${paramIndex++}`);
      values.push(id_responsableentrega_46);
    }
    if (id_ccosto_46 !== undefined) {
      updates.push(`id_ccosto_46 = $${paramIndex++}`);
      values.push(id_ccosto_46);
    }
    if (id_insumo_46 !== undefined) {
      updates.push(`id_insumo_46 = $${paramIndex++}`);
      values.push(id_insumo_46);
    }
    if (cantidad_46 !== undefined) {
      updates.push(`cantidad_46 = $${paramIndex++}`);
      values.push(cantidad_46);
    }
    if (fecha_46 !== undefined) {
      updates.push(`fecha_46 = $${paramIndex++}`);
      values.push(fecha_46);
    }
    if (hora_46 !== undefined) {
      updates.push(`hora_46 = $${paramIndex++}`);
      values.push(hora_46);
    }
    if (observacion_46 !== undefined) {
      updates.push(`observacion_46 = $${paramIndex++}`);
      values.push(observacion_46);
    }

    if (updates.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE tbl_46_m_consumo_insumo SET ${updates.join(', ')} WHERE id_m_consumo_insumo_46 = $${paramIndex}`,
        values
      );
    }

    if (detalles !== undefined) {
      await client.query('DELETE FROM tbl_47_d_consumo_insumo WHERE id_m_consumo_insumo_47 = $1', [id]);

      for (const det of detalles) {
        if (det.id_insumo_47 === undefined || det.cantidad_47 === undefined || det.cantidad_47 <= 0) continue;

        const precioResult = await client.query(
          'SELECT precio_insumo_43 FROM tbl_43_insumo WHERE id_insumo_43 = $1',
          [det.id_insumo_47]
        );
        const precio = precioResult.rows[0]?.precio_insumo_43 ?? 0;
        const total = Number(det.cantidad_47) * Number(precio);

        await client.query(
          `INSERT INTO tbl_47_d_consumo_insumo (id_m_consumo_insumo_47, id_insumo_47, cantidad_47, total_47, observacion_47)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, det.id_insumo_47, det.cantidad_47, total, det.observacion_47 || null]
        );
      }
    }

    await client.query('COMMIT');

    const withJoin = await pool.query<MaestroConsumoInsumo>(
      `SELECT m.id_m_consumo_insumo_46, m.idtrabajador_46, m.id_responsableentrega_46, m.id_ccosto_46,
              m.id_insumo_46, m.cantidad_46, m.fecha_46, m.hora_46, m.observacion_46,
              CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06,''), ' ', COALESCE(t.amaterno_06,'')) AS trabajador_nombre,
              CONCAT(r.nombreresponsableentrega_08, ' ', COALESCE(r.apaternoresponsableentrega_08,''), ' ', COALESCE(r.amaternoresponsableentrega_08,'')) AS responsable_nombre,
              c.ccosto_45 AS ccosto_nombre,
              i.descripcion_43 AS insumo_descripcion
       FROM tbl_46_m_consumo_insumo m
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_46 = t.idtrabajador_06
       INNER JOIN tbl_08_responsable_entrega r ON m.id_responsableentrega_46 = r.idresponsableentrega_08
       INNER JOIN tbl_45_ccosto c ON m.id_ccosto_46 = c.id_ccosto_45
       INNER JOIN tbl_43_insumo i ON m.id_insumo_46 = i.id_insumo_43
       WHERE m.id_m_consumo_insumo_46 = $1`,
      [id]
    );

    res.json({
      success: true,
      data: withJoin.rows[0],
      message: 'Consumo actualizado exitosamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    client.release();
  }
};

/**
 * Eliminar consumo (maestro y detalles por CASCADE o manual)
 */
export const deleteConsumoInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM tbl_47_d_consumo_insumo WHERE id_m_consumo_insumo_47 = $1', [id]);
    const result = await pool.query('DELETE FROM tbl_46_m_consumo_insumo WHERE id_m_consumo_insumo_46 = $1 RETURNING id_m_consumo_insumo_46', [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    res.json({ success: true, message: 'Consumo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el consumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener datos del Acta de Entrega de Insumos para vista previa (JSON)
 */
export const getActaDatos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const acta = await fetchConsumoActaBase(id);
    if (!acta) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        intro: acta.intro,
        trabajador: acta.trabajador,
        insumos: acta.filasInsumos,
        observaciones: acta.observaciones,
        responsable: acta.responsable
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error al obtener datos del acta de insumos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los datos del acta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Generar PDF del Acta de Entrega de Insumos (SIG F-622-006)
 */
export const generarActaEntregaPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const acta = await fetchConsumoActaBase(id);
    if (!acta) {
      res.status(404).json({ success: false, error: 'Consumo no encontrado' });
      return;
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);
    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'LETTER',
      pageMargins: [40, 30, 40, 30],
      content: buildActaInsumosPdfContent(
        acta.intro,
        acta.trabajador,
        acta.filasInsumos,
        acta.observaciones,
        acta.responsable
      ),
      styles: ACTA_PDF_STYLES,
      defaultStyle: { font: 'Roboto', fontSize: 9 }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=acta-entrega-insumos-${id}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error('Error al generar acta PDF de insumos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el acta de entrega',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
