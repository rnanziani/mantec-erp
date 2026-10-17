/**
 * Genera seed SQL de tbl_89 desde los códigos cortos extraídos del Maestro Defontana.
 * Proveedor fijo: GENERICO (Defontana es el ERP, no el proveedor).
 *
 *   node formularios/_gen/build-seed-89-generico.js
 *
 * Luego en DBeaver (bd producción): abrir el SQL y Alt+X.
 */
const fs = require('fs');
const path = require('path');

const fuentes = [
  'C:\\AutomatizacionDefontana\\data\\salida\\codigos-numericos-1-500.json',
];
const dest = path.join(__dirname, '..', '..', 'database', 'seed_tbl_89_generico.sql');
const PROVEEDOR = 'GENERICO';

const jsonPath = fuentes.find((p) => fs.existsSync(p));
if (!jsonPath) {
  console.error('No encontré el JSON. Esperaba:');
  fuentes.forEach((p) => console.error('  ', p));
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const byCode = new Map();
for (const it of data.items || []) {
  const codigo = String(it.codigo || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  const desc = String(it.descripcion || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, 200);
  if (!codigo || !desc || codigo.length > 25) continue;
  if (!byCode.has(codigo)) {
    byCode.set(codigo, { codigo, descripcion: desc, proveedor: PROVEEDOR });
  }
}

function sq(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const rows = [...byCode.values()];
if (!rows.length) {
  console.error('El JSON no tiene ítems útiles:', jsonPath);
  process.exit(1);
}

const chunks = [];
for (let i = 0; i < rows.length; i += 40) {
  const part = rows
    .slice(i, i + 40)
    .map((r) => `  (${sq(r.codigo)}, ${sq(r.descripcion)}, ${sq(r.proveedor)})`)
    .join(',\n');
  chunks.push(
    `INSERT INTO public.tbl_89_codigo_etiqueta (codigo_89, descripcion_89, proveedor_89)\nVALUES\n${part}\nON CONFLICT DO NOTHING;`
  );
}

const header = `-- Códigos cortos (1–8) extraídos del Maestro Defontana 1–500.
-- ${rows.length} códigos. Proveedor: ${PROVEEDOR}. Idempotente.
-- Fuente: ${jsonPath}
-- En DBeaver, sobre la BD de etiquetas: Alt+X.

`;

fs.writeFileSync(dest, header + chunks.join('\n\n') + '\n', 'utf8');
console.log('OK', dest);
console.log('unicos', rows.length, 'proveedor', PROVEEDOR);
console.log('fuente', jsonPath);
