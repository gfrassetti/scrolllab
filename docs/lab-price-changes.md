# Cambiar el precio de LAB a los que ya están suscriptos

Estado (2026-10-12): **listo en simulación, solo Mercado Pago.** Lemon Squeezy (LAB en USD) espera al paso (0)
de abajo. Diseño revisado con la sesión de Arquitectura.

## Antes de tocar un precio: el paso (0) pendiente

Hoy cada suscripción no guarda cuánto paga: las cuentas usan el precio de **lista** (`server/catalog.js`). Hasta que
esté el paso (0) (guardar el monto que cobra el proveedor en cada suscripción, lo hace la sesión de Arquitectura
cuando se retome), **no cambies los precios de LAB en el catálogo**: el cambio de plan calcularía mal la
diferencia, los mails mostrarían el precio nuevo a quien paga el viejo.

## Cómo es el circuito

1. **Declarar** el cambio en `src/domain/priceChanges.js` → `HOSTED_PRICE_CHANGES` (y cambiar el precio de lista en
   `server/catalog.js`). `npm run check` exige que el último `to` de cada plan/ciclo/moneda sea la lista vigente.
2. **El barrido de pagos** (cada 5 minutos en producción, `server/services/subscriptions/priceChange.js`):
   - inscribe a cada suscripción que paga otro monto **según Mercado Pago** (no según la lista);
   - le manda el mail (`buildSubscriptionPriceChange`): suba con **15 días** de aviso desde que sale el mail; baja
     desde el próximo cobro, con un mail corto;
   - plan anual: además, un recordatorio cuando faltan 40 días o menos para el cobro con el precio nuevo;
   - después del último cobro a precio viejo, cambia el monto en Mercado Pago y lo anota (una vez).
3. **Simulación por defecto**: sin `PRICE_CHANGES_LIVE=1` solo cuenta a quién avisaría y te manda el resumen.
   Probalo así en producción antes de prenderlo.

Reglas que no se negocian (están en el código y en los tests): sin mail enviado no hay precio nuevo; la fecha la
pone el cobro real del proveedor; una suba nunca baja a quien paga más; tope de 50 mails por barrido; lista vacía =
no hace nada.

## Pendiente

- Paso (0) y Lemon Squeezy (cambiar el precio de la variante para los ya suscriptos).
- Probar en el sandbox de Mercado Pago que cambiar el monto no le manda nada raro al suscriptor.
- Lo legal (cuántos días de aviso, derecho a cancelar): lo confirma el dueño con quien lo asesore.
