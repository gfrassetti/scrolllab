# 0004 · Tipos con JSDoc y `tsc`, en vez de migrar a TypeScript

**Estado:** aceptada · 2026-10

## Contexto

No había ninguna verificación de tipos y ESLint ignoraba `server/` y `scripts/`. Migrar a TypeScript toca lo que se
vende: el comprador recibiría `.tsx`, y el empaquetador copia secciones verbatim y genera el `package.json` a partir de
los imports. Un tipo mal puesto en el flujo de pagos es caro; un error de tipos en una sección vendida, también.

## Decisión

**JSDoc + `checkJs`, gradual** (`tsconfig.check.json`, `npm run typecheck`, dentro de `verify`):

- Los tipos son comentarios: el runtime y el ZIP no cambian, y no hay paso de compilación.
- Alcance inicial: `src/domain/` y `server/`. Se suman carpetas a `include` cuando pasan sin errores.
- `strictNullChecks` prendido (los 21 errores iniciales eran chequeos que el código ya hacía y TypeScript no veía:
  ninguno fue un bug); `strict` completo y `noImplicitAny` siguen apagados, para ir de a un paso.
- Dependencias de desarrollo: `typescript@5` y `@types/node@20` (la línea 7.x es el port nativo y arrastra 21 paquetes
  que no hacen falta).
- Los tipos se escriben donde protegen algo: el dominio (precios, recetas, secciones) y la frontera de seguridad
  (`sanitizeSectionProps` recibe `unknown`: del cliente no se confía en nada).

## Consecuencias

- `tsc` detecta un string donde va un número, un argumento sin una propiedad obligatoria o una comparación con un
  valor que no existe, y usar sin chequear un resultado que puede ser `null` (`arsFromUsdOrNull`, `templatePriceUsd`).
- Si algún día se migra a TypeScript, los tipos JSDoc se convierten casi mecánicamente.
- Un parámetro desestructurado opcional (`client?`, `options?`) hay que tiparlo: sin JSDoc, `tsc` lo infiere obligatorio.
