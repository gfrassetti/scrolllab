# 0002 · El servidor en capas: rutas → servicios → repositorios

**Estado:** aceptada · 2026-10

## Contexto

`server/app.js` tenía 1376 líneas: la configuración de Passport, 37 rutas y la lógica de negocio dentro de los
handlers (armar la orden, despachar el webhook de Mercado Pago). `db.js`, `email.js`, `subscriptions.js` y
`packaging.js` pasaban de 550 a 1000 líneas cada uno. Nada de eso se podía probar sin levantar Express.

## Decisión

Tres capas, importando solo hacia abajo:

1. **Rutas** (`server/http/routes/*`): un router por dominio (`createXRouter({ config, limits })`). Leen el request,
   llaman a un servicio y responden.
2. **Servicios** (`server/services/*`): las reglas de negocio como casos de uso (`createCheckoutOrder`,
   `handleMercadoPagoNotification`). No conocen `req` ni `res`.
3. **Repositorios** (`server/repositories/*`): la persistencia, un objeto por entidad; `db.js` los compone en el
   facade `db` y se queda con la conexión.

`app.js` queda como composition root (~135 líneas). Los archivos grandes se partieron por responsabilidad
(`emailTemplates` / `email`, `subscriptions/{billing,entitlement,planChange,mpSync}`, `licenseWatermark`,
`downloadToken`) dejando un barril con los mismos exports.

No se agregó inyección de dependencias ni clases: funciones y módulos alcanzan.

## Consecuencias

- Los casos de uso se prueban sin HTTP (`checkoutUseCase.test.js`, `paymentsUseCase.test.js`).
- `server/__tests__/routes.test.js` fija la lista de rutas: agregar o sacar una es una decisión explícita.
- `HttpError` vive en `server/errors.js` y es una sola clase: el `errorHandler` y el webhook de Mercado Pago deciden
  por `instanceof` (un 4xx no se reintenta, un 5xx sí).
- Hay que mantener los barriles mientras haya imports viejos. No es deuda: es lo que permitió mover sin tocar a nadie.
