import { refundEligibility, labRefundEligibility, REFUND_DAYS } from "../../src/domain/policy.js";
import { subscriptionPlanPrice, HOSTED_PLANS } from "../catalog.js";

/**
 * La plata vista desde el panel local (/admin): qué se puede retirar y qué
 * todavía no se toca, los reembolsos (quién y cuánto) y las solicitudes de
 * arrepentimiento. Todo sale de la base de producción.
 *
 * «No tocar» es lo que todavía se puede reembolsar por la política:
 * - templates, bundle y builder: pagados hace menos de REFUND_DAYS y con el ZIP
 *   sin descargar (`refundEligibility`, la misma regla que «Mis compras»);
 * - LAB: el último cobro de cada suscripción, durante REFUND_DAYS.
 * Lo descargado o vencido queda libre. Montos brutos, antes de la comisión de
 * la pasarela.
 */

const DAY_MS = 86_400_000;
const idOf = (row) => String(row?._id ?? row?.id ?? "");
const add = (map, currency, amount) =>
  map.set(currency, (map.get(currency) || 0) + (Number(amount) || 0));
const byCurrency = (map) =>
  [...map.entries()].map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }));

const itemsLabel = (order) =>
  (order?.items || [])
    .map((i) => (String(i.sku || "").startsWith("custom:") ? "builder" : i.title || i.sku))
    .filter(Boolean)
    .join(", ");

export function buildMoneyStatus({
  orders = [],
  users = [],
  refunds = [],
  withdrawals = [],
  subscriptions = [],
  now = new Date(),
}) {
  const t = now.getTime();
  const emailOf = new Map(users.map((u) => [idOf(u), u.email || ""]));
  const ordersById = new Map(orders.map((o) => [idOf(o), o]));

  // Reembolsos: el libro + las órdenes reembolsadas de antes del libro.
  const ledgered = new Set(refunds.map((r) => r.orderId).filter(Boolean));
  const allRefunds = [
    ...refunds.map((r) => ({
      when: r.refundedAt || r.createdAt || null,
      email: r.email || emailOf.get(String(r.userId)) || "",
      amount: Number(r.amount) || 0,
      currency: r.currency || "ARS",
      provider: r.provider,
      partial: !!r.partial,
      reason: r.reason || "refunded",
      what:
        r.kind === "lab"
          ? "LAB"
          : itemsLabel(ordersById.get(String(r.orderId))) || "orden",
      orderId: r.orderId || null,
    })),
    ...orders
      .filter((o) => o.status === "refunded" && !ledgered.has(idOf(o)))
      .map((o) => ({
        when: o.refundedAt || o.updatedAt || null,
        email: emailOf.get(String(o.userId)) || "",
        amount: Number(o.total) || 0,
        currency: o.currency_id || "ARS",
        provider: o.provider || "mercadopago",
        partial: false,
        reason: o.refundReason || "refunded",
        what: itemsLabel(o) || "orden",
        orderId: idOf(o),
      })),
  ].sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime());

  const refundedTotal = new Map();
  const refunded30 = new Map();
  for (const r of allRefunds) {
    add(refundedTotal, r.currency, r.amount);
    if (r.when && t - new Date(r.when).getTime() <= 30 * DAY_MS) add(refunded30, r.currency, r.amount);
  }
  // Lo ya devuelto en parcial se descuenta de lo que queda de esa orden.
  const partialByOrder = new Map();
  for (const r of allRefunds) {
    if (r.partial && r.orderId) partialByOrder.set(r.orderId, (partialByOrder.get(r.orderId) || 0) + r.amount);
  }

  // Órdenes pagas: en plazo de reembolso (no tocar) o libres.
  const locked = [];
  const lockedTotal = new Map();
  const freeTotal = new Map();
  for (const o of orders) {
    if (o.status !== "paid") continue;
    const net = Math.max(0, (Number(o.total) || 0) - (partialByOrder.get(idOf(o)) || 0));
    const currency = o.currency_id || "ARS";
    const e = refundEligibility(o, { now: t });
    if (e.eligible) {
      add(lockedTotal, currency, net);
      locked.push({
        email: emailOf.get(String(o.userId)) || "",
        amount: net,
        currency,
        until: e.deadline,
        what: itemsLabel(o),
        provider: o.provider || "mercadopago",
        why: "sin descargar, en plazo",
      });
    } else {
      add(freeTotal, currency, net);
    }
  }

  // LAB: solo el primer cobro, mientras dure el plazo (que corre desde el alta,
  // con la prueba gratis adentro). Las renovaciones no se devuelven.
  for (const s of subscriptions) {
    if (!["authorized", "paused"].includes(s.status)) continue;
    const e = labRefundEligibility(s, { now: t });
    if (!e.eligible) continue;
    const until = Date.parse(e.deadline || "");
    const usd = s.currency_id === "USD";
    const plan = s.paidPlan || s.plan;
    const price = HOSTED_PLANS[plan] ? subscriptionPlanPrice(s, plan, s.paidCycle || s.cycle, usd ? "USD" : "ARS") : 0;
    if (!price) continue;
    const currency = usd ? "USD" : "ARS";
    add(lockedTotal, currency, price);
    locked.push({
      email: emailOf.get(String(s.userId)) || "",
      amount: price,
      currency,
      until: new Date(until).toISOString(),
      what: `LAB ${HOSTED_PLANS[plan].tier.replace(/^./, (c) => c.toUpperCase())}`,
      provider: s.provider || "mercadopago",
      why: "primer cobro de LAB, en plazo",
    });
  }
  locked.sort((a, b) => new Date(a.until || 0).getTime() - new Date(b.until || 0).getTime());

  // Arrepentimiento: qué pasó con cada solicitud (la mayoría se resuelve sola)
  // y qué hacer con las que quedan para el dueño.
  const subsById = new Map(subscriptions.map((s) => [idOf(s), s]));
  const AUTO = {
    refunded: "devuelto automáticamente",
    canceled: "baja en la prueba (sin cobro)",
    refund_pending: "pedido a Paddle (en revisión)",
    refund_retry: "esperando a Paddle (reintenta solo)",
    awaiting_confirmation: "esperando que confirme por mail",
    executing: "procesando",
    manual: "NO SALIÓ SOLO — devolver a mano",
  };
  const requests = withdrawals.map((w) => {
    const order = w.orderId ? ordersById.get(String(w.orderId)) : null;
    const sub = !order && w.subscriptionId ? subsById.get(String(w.subscriptionId)) : null;
    const e = order ? refundEligibility(order, { now: t }) : sub ? labRefundEligibility(sub, { now: t }) : null;
    const plan = sub ? sub.paidPlan || sub.plan : null;
    const labPrice =
      sub && HOSTED_PLANS[plan]
        ? subscriptionPlanPrice(sub, plan, sub.paidCycle || sub.cycle, sub.currency_id === "USD" ? "USD" : "ARS")
        : null;
    const verdict = AUTO[w.status]
      ? AUTO[w.status]
      : !order && !sub
        ? "revisar a mano (sin compra)"
        : e?.reason === "refunded"
          ? "reembolsada"
          : e?.eligible
            ? "ELEGIBLE — reembolsar"
            : e?.reason === "downloaded"
              ? "descargó: solo por defecto"
              : e?.reason === "renewal"
                ? "LAB renovación: no se devuelve"
                : e?.reason === "trial"
                  ? "LAB en prueba: alcanza con cancelar"
                  : e?.reason === "expired"
                    ? "fuera de plazo"
                    : e?.reason || "—";
    const closed =
      ["refunded", "canceled", "resolved"].includes(w.status) ||
      (order && order.status === "refunded") ||
      (sub && !!sub.refundedAt);
    return {
      code: w.code,
      when: w.createdAt || null,
      name: w.name || "",
      email: w.email || "",
      what: order
        ? itemsLabel(order)
        : sub
          ? `LAB ${HOSTED_PLANS[plan]?.tier || ""}`.trim()
          : w.orderRef
            ? `orden ${w.orderRef} (no encontrada)`
            : "sin compra",
      amount: order ? Number(order.total) || 0 : labPrice,
      currency: order?.currency_id || (sub ? (sub.currency_id === "USD" ? "USD" : "ARS") : null),
      provider: order?.provider || sub?.provider || null,
      verdict,
      status: w.status || "received",
      open: !closed,
      message: w.message || "",
    };
  });

  return {
    refundDays: REFUND_DAYS,
    locked: { total: byCurrency(lockedTotal), rows: locked.slice(0, 50) },
    free: byCurrency(freeTotal),
    refunds: {
      total: byCurrency(refundedTotal),
      last30: byCurrency(refunded30),
      last7Count: allRefunds.filter((r) => r.when && t - new Date(r.when).getTime() <= 7 * DAY_MS).length,
      rows: allRefunds.slice(0, 30),
    },
    withdrawals: {
      open: requests.filter((r) => r.open).length,
      rows: requests.slice(0, 30),
    },
  };
}
