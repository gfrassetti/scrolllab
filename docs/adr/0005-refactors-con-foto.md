# 0005 · Los refactors se verifican con una foto antes y después

**Estado:** aceptada · 2026-10

## Contexto

Reorganizar pagos, mails, base de datos, empaquetado y UI sin cambiar comportamiento no se puede apoyar en los tests
solos. Las ramas de Mongo (producción) no las ejecuta ningún test; el HTML de una página no lo mira ninguno; el
contenido de cada ZIP, tampoco. Un refactor puede dejar la suite en verde y romper algo que nadie mide.

## Decisión

Para cada paso, antes de mover nada:

1. **Una foto determinista del comportamiento**: un script que lo ejercita y guarda el resultado normalizado (ids,
   fechas y códigos al azar enmascarados). Se saca dos veces sobre el mismo código y tiene que salir idéntica.
2. **Probar que la foto muerde**: cambiar algo a propósito (el orden de una consulta de Mongo, el gate de un mail) y
   ver que la foto lo detecta. Una foto que no detecta nada no prueba nada.
3. **Mover literal, con sustituciones contadas**: el script aborta si la cantidad de reemplazos no es la esperada, y se
   compara como multiconjunto de líneas contra el original.
4. **Foto después**, comparar, `npm run verify`, y un commit por paso.

Lo que cubrió cada área: la base (101 pasos en archivos y 105 en un `mongod` real descartable), los 17 ZIP (2.645
archivos por SHA-256), las 42 plantillas de mail, el flujo de dinero contra el Mercado Pago simulado (13 escenarios),
y el HTML de la home y del builder (`npm run ssr:snapshot`).

## Consecuencias

- Los refactors salieron sin cambios de comportamiento medibles, y los problemas que aparecieron (un `crypto` sin
  importar, un checker que pasaba vacío, una protección CSRF que no protegía) se encontraron al medir (tests, cambios a propósito y fotos) en vez de suponer.
- Compararse contra un `HEAD` limpio se hace con una copia aparte (`git archive`), nunca con `git stash` en un árbol
  compartido: otra sesión puede tener trabajo sin commitear ahí.
- Las fotos son herramientas de refactor, no tests permanentes: hoy no viven en el repo. Convertir las más útiles en
  tests (la del flujo de dinero y la de la base) es un paso razonable.
