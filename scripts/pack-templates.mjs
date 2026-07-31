import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  packFixedTemplate,
  packBundleTemplate,
  storageRoot,
} from '../server/packaging.js'
import { BUNDLE_MODELS } from '../server/catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'storage', 'catalog')

const licenseMeta = {
  orderId: 'CATALOG-PREVIEW',
  email: 'catalog@scrolllab.com',
  date: new Date().toISOString().slice(0, 10),
}

for (const model of BUNDLE_MODELS) {
  const dest = path.join(outDir, `${model}.zip`)
  await packFixedTemplate({ model, destPath: dest, licenseMeta })
  console.log('packed', dest)
}

const bundleDest = path.join(outDir, 'bundle.zip')
await packBundleTemplate({
  models: BUNDLE_MODELS,
  destPath: bundleDest,
  licenseMeta,
})
console.log('packed', bundleDest)

console.log('storage root for orders:', storageRoot())
