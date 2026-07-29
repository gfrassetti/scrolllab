import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  packFixedTemplate,
  storageRoot,
} from '../server/packaging.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'storage', 'catalog')

const models = ['chapters', 'nocturne', 'monolith']

for (const model of models) {
  const dest = path.join(outDir, `${model}.zip`)
  await packFixedTemplate({
    model,
    destPath: dest,
    licenseMeta: {
      orderId: 'CATALOG-PREVIEW',
      email: 'catalog@scrolllab.com',
      date: new Date().toISOString().slice(0, 10),
    },
  })
  console.log('packed', dest)
}

console.log('storage root for orders:', storageRoot())
