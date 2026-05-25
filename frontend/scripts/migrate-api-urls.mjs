/**
 * Reemplaza http://localhost:3001/api/... por apiUrl('...') en frontend/src
 * Uso: node scripts/migrate-api-urls.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

function importLine(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(SRC, 'lib/apiClient.ts'))
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');
  return `import { apiUrl } from '${rel.startsWith('.') ? rel : `./${rel}`}';`;
}

function hasApiUrlImport(content) {
  return /from ['"].*apiClient['"]/.test(content);
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('localhost:3001')) return false;

  // Template literals with query: `http://localhost:3001/api/foo?${params}`
  content = content.replace(
    /`http:\/\/localhost:3001\/api\/([^`?]+)\?\$\{/g,
    '`${apiUrl(\'/$1\')}?${'
  );

  // Single-quoted full URLs
  content = content.replace(
    /'http:\/\/localhost:3001\/api\/([^']+)'/g,
    (_, p) => `apiUrl('/${p}')`
  );

  // User-facing error messages
  content = content.replace(
    /http:\/\/localhost:3001/g,
    'el servidor API'
  );

  if (content.includes('apiUrl(') && !hasApiUrlImport(content)) {
    const lines = content.split('\n');
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) insertAt = i + 1;
      else if (lines[i].trim() && !lines[i].startsWith('import ')) break;
    }
    lines.splice(insertAt, 0, importLine(filePath));
    content = lines.join('\n');
  }

  fs.writeFileSync(filePath, content);
  return true;
}

function walk(dir) {
  let count = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      count += walk(full);
    } else if (/\.(tsx?|ts)$/.test(name) && name !== 'apiClient.ts') {
      if (migrateFile(full)) {
        console.log('Updated:', path.relative(SRC, full));
        count++;
      }
    }
  }
  return count;
}

const n = walk(SRC);
console.log(`\n${n} archivo(s) actualizado(s).`);
