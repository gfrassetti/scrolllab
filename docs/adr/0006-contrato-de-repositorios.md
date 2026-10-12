# 0006 · Los repositorios tienen un contrato que corre contra Mongo real y contra archivos

**Estado**: aceptada (2026-10-11)

## Contexto

La persistencia tiene dos implementaciones por cada método de `server/repositories/*`: el almacén de archivos
(`server/fileStore.js`, solo desarrollo y casi todos los tests) y Mongo (producción). Cada entidad nueva se escribe dos
veces, y **producción corría ramas que ningún test permanente ejercitaba**: los tests con «Mongo» en el nombre solo
validaban esquemas sin conectarse, y las consultas, los índices únicos y las transiciones atómicas (pagar una orden,
reclamar un mail, canjear un cupón) se verificaron una sola vez con un `mongod` descartable, sin dejar la prueba en el repo.

Además el almacén de archivos se apartaba de Mongo sin que nadie lo notara: aceptaba un pago ya usado en otra orden,
duplicados que Mongo rechaza con sus índices únicos, y no respetaba un `createdAt` dado.

## Decisión

Un **contrato** único de comportamiento (`server/__tests__/helpers/repoContract.js`) que se ejecuta dos veces:

- `repoContract.file.test.js` contra el almacén de archivos;
- `repoContract.mongo.test.js` contra un Mongo real.

Los valores esperados son los de Mongo, porque es lo que corre en producción: si el almacén de archivos se aparta, el
test falla y se corrige el de archivos, no el contrato.

El Mongo del test sale de (`helpers/mongo.js`): `MONGODB_TEST_URI` (en el CI, un servicio `mongo:7`) o un `mongod` local
(`MONGOD_BIN`, el del PATH o la instalación de Windows) levantado con una carpeta temporal y un puerto libre. Sin ninguno,
el test se saltea; con `REQUIRE_MONGO=1` (el CI) es un error, para que un CI sin Mongo no pase en falso.

No se agregó `mongodb-memory-server`: descarga un binario por máquina y por versión, y ya hay un `mongod` real en el CI
y en la máquina de desarrollo.

## Consecuencias

- Un repositorio nuevo o un método nuevo se prueba **una vez** y corre contra las dos implementaciones.
- El almacén de archivos replica de Mongo lo que importa para que desarrollo no esconda errores: índices únicos
  (`mpPaymentId`, `paddleTransactionId`, `couponCode`, `code` del arrepentimiento), el pago ya aplicado a otra orden y los
  listados de lo más nuevo primero. Si Mongo gana un índice único, el contrato lo muestra.
- Correr `npm test` sin `mongod` instalado saltea el contrato de Mongo (se avisa en la salida).
- **No** se eliminó el almacén de archivos: sigue permitiendo desarrollar sin instalar Mongo. Si algún día se quiere
  borrar, el contrato ya prueba que Mongo hace todo lo que hoy hace el de archivos.
- Lo que el contrato no ve: lo que use los modelos de Mongoose sin pasar por `server/repositories`. Hoy es solo el
  script de mantenimiento `server/scripts/delete-pending-orders.js`; ningún servicio ni ruta consulta datos así. La regla
  de capas pide que, si aparece una consulta nueva, viva en el repositorio y entre al contrato.
