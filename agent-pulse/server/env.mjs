import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Carga el .env de la raíz del proyecto antes que el resto de los módulos.
try { process.loadEnvFile(path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), '.env')); }
catch (e) { if (e.code !== 'ENOENT') throw e; }