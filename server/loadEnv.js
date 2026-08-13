import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Carga `.env` desde la raíz del repo, no desde el cwd. Importar primero. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(ROOT, '.env') })
