# 0007 · Las secciones del builder y los widgets de LAB se prueban todo el tiempo, y lo que falla se registra y se arregla con límites

**Estado**: aceptada (2026-10-12)

## Contexto

Lo que se vende es cada sección: como código (el builder arma un ZIP) y como widget embebido en el sitio de un
cliente (LAB). Las dos preguntas por sección son **¿se descarga bien?** (el ZIP instala, compila y arranca, con lo
editado adentro) y **¿se ve bien?** (PC, tablet, teléfono, con y sin movimiento, en el builder y embebida).

Las herramientas existían (`check:builder`, `check:visual`, `check:mobile`, `screen:lab`…), pero corrían a mano y
sueltas. La primera corrida completa sobre APEX mostró por qué eso no alcanza: tres pruebas daban «ok» sin haber visto
la página (medían la pantalla de carga; el recorrido de secciones arrancaba en el hero porque era `id="top"`), el test
de empaquetado no cubría los templates que se venden sueltos, y había bugs reales en APEX y KIN que nadie había visto.
El dueño pidió que esto esté automatizado, que los errores se guarden y no se pasen por alto, y que haya otro proceso
que los arregle, con un modelo más económico.

## Decisión

Tres niveles, de lo barato a lo caro:

| Nivel | Cuándo | Dónde | Qué |
|---|---|---|---|
| verify | cada commit | CI de GitHub (y local) | `packagingEverySection.test.js` (ZIP de cada template suelto y de cada sección sola y con su modelo), la guarda de casos e2e de LAB en `npm run check`, las decisiones del barrido (`scripts/lib/qa/__tests__`) |
| check:sections | al tocar o sumar una sección o un template | esta PC, a mano o por un agente | el procedimiento completo de `docs/testing-sections.md`, incluido `check:builder-save` (editar → guardar → otro navegador → ZIP comprado) y, si es widget, `screen:lab --deep` siempre |
| qa:sweep | todas las noches | esta PC (tarea programada de la app) | los modelos que cambiaron desde la última corrida + uno en rotación, en una copia limpia de HEAD |

**El barrido** (`scripts/qa-sweep.mjs`) no usa IA: decide qué probar (`scripts/lib/qa/plan.js`, puro y testeado), corre
`check:sections` en una copia de `git archive HEAD` (`scripts/lib/clean-verify.mjs`) y anota los hallazgos en
`storage/qa/findings.json` con un id estable (el detalle normalizado: sin medidas, hashes ni tiempos, para que la misma
falla no sea «nueva» cada noche). Estados: **abierto**, **arreglado** (dejó de aparecer en una corrida que lo cubrió) y
**necesita persona** (dos intentos del fixer sin éxito). Un candado (`storage/qa/.lock`) evita dos barridos a la vez.

**Lo aceptado no vive en el registro.** Que algo es así a propósito se declara en el código, con el motivo (`ALLOW` en
check-mobile, `ACCEPTED` en check-parity, `NOT_IN_DOM` en `scripts/lib/not-in-dom.mjs`, `SECTIONS_WITHOUT_COLOR`), y lo
decide una persona: un segundo registro sería otra fuente de verdad (ADR 0001) y además `storage/` es local.

**Dos agentes de proyecto, con Sonnet** (`.claude/agents/`):

- `section-tester`: corre el barrido o `check:sections` y **mira** las láminas y capturas. Lo objetivo ya queda en el
  registro; lo subjetivo («se ve pobre») va a `storage/qa/observations.md` para el dueño: no se corrige solo.
- `section-fixer`: toma hasta 5 hallazgos abiertos por corrida, los reproduce con `check:sections --only=<paso>`, arregla
  **dentro de la sección**, re-verifica (el mismo paso, el ZIP del modelo y `clean-verify` con sus archivos) y commitea en
  master por rutas explícitas. Nunca hace push: el CI de GitHub y el dueño son la última red.

**Límites del fixer:**

- Zona permitida: `src/components/sections/<modelo>/**`, `src/domain/sectionFields/fields/<modelo>.js` y el caso de esa
  sección en el e2e de LAB. Lo compartido (`server/**`, `src/lib/**`, `embed/**`, `src/domain/catalog.js`, estilos
  globales, `.github/**`, ADRs) y **las propias pruebas** (umbrales, listas de excepciones) no se tocan: se escala.
  Un arreglo que «salva» una sección tocando `motion.js` rompe otras diez.
- ADR 0005 según el alcance: dentro de una sección, la foto «antes» es el paso en rojo y la «después» ese paso en verde
  más el ZIP del modelo y `clean-verify`.
- Árbol compartido: si una ruta que va a tocar tiene cambios sin commitear (de otra sesión), no la toca. Nunca `stash`,
  `checkout` ni `add -A`.
- Dos intentos por hallazgo; al segundo pasa a una persona. Solo lo objetivo (desborde, texto oculto o chico, imagen
  rota, error de consola, campo que no llega, borrador que no se guarda, ZIP que no arranca).

## Consecuencias

- Una sección o un template nuevo entran solos al nivel verify (salen de las tablas de dominio) y al barrido (git diff).
- El barrido tarda (cada modelo ~20 min): corre de noche y solo sobre lo que cambió más uno en rotación; un `--all`
  completo son horas.
- Las tareas programadas de la app corren solo con la app abierta; si está cerrada, la corrida sale al abrirla.
- Un emulador no es un teléfono: GPU real y Safari siguen siendo a mano (`?motion-debug`).
- Cambiar una prueba (umbral, excepción) sigue siendo una decisión de una persona, con el motivo en el código.
