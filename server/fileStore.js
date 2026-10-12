import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Sin escritura atómica, dos procesos sobre el mismo JSON se pisan: cada suite
// de tests que use STORE=file necesita su propio directorio.
const DATA_DIR = path.resolve(
  process.env.FILE_DB_DIR || path.join(__dirname, "..", "storage", "db"),
);

function ensure() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read(name) {
  ensure();
  const p = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function write(name, rows) {
  ensure();
  fs.writeFileSync(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(rows, null, 2),
  );
}

function nid() {
  return crypto.randomBytes(12).toString("hex");
}

/** Orden de los listados: lo más nuevo primero (`createdAt` descendente). */
function newestFirst(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

/**
 * El error que da Mongo al violar un índice único (código 11000): el store de
 * archivos lo replica para que un duplicado falle igual en desarrollo.
 */
function duplicateKey(index) {
  return Object.assign(
    new Error(`E11000 duplicate key error: ${index} ya existe`),
    { code: 11000 },
  );
}

/**
 * Índices únicos sparse de server/models.js que el store de archivos replica al
 * guardar: un duplicado falla con el mismo error (11000) que en Mongo.
 */
// Un elemento puede ser una clave compuesta (array de campos): único el conjunto.
const UNIQUE_FIELDS = {
  orders: ["mpPaymentId", "paddleTransactionId"],
  leads: ["couponCode"],
  withdrawals: ["code"],
  "price-change-notices": [["subscriptionId", "changeId"]],
};

/** Envuelve un row con `.save()` que reescribe su fila en `<name>.json`. */
function withSaveDoc(name, row) {
  if (!row) return null;
  const doc = { ...row };
  doc.save = async function save() {
    const rows = read(name);
    const idx = rows.findIndex((o) => o.id === doc.id);
    for (const key of UNIQUE_FIELDS[name] || []) {
      const fields = Array.isArray(key) ? key : [key];
      // Como un índice sparse: sin valor en algún campo, no choca.
      if (fields.some((f) => doc[f] == null)) continue;
      if (rows.some((o) => o.id !== doc.id && fields.every((f) => o[f] === doc[f]))) {
        throw duplicateKey(fields.join("+"));
      }
    }
    const { save: _ignored, ...rest } = doc;
    const next = { ...rest, updatedAt: new Date().toISOString() };
    if (idx >= 0) rows[idx] = next;
    else rows.push(next);
    write(name, rows);
    Object.assign(doc, next);
    return doc;
  };
  return doc;
}

function withSave(order) {
  return withSaveDoc("orders", order);
}

/**
 * ¿Prueba de LAB en curso que termina dentro de `withinMs` y todavía sin aviso?
 * Compartido por el listado y por el claim del mail (en Mongo es el filtro).
 */
export function trialReminderDue(sub, nowMs, withinMs) {
  if (!sub || sub.status !== "authorized" || sub.canceledAt) return false;
  // `lastPaidAt`: ya se le cobró algo, así que no está en la prueba (mismo
  // criterio que el mail de bienvenida).
  if (sub.trialReminderEmailSentAt || sub.lastPaidAt || !sub.trialEndsAt)
    return false;
  const end = new Date(sub.trialEndsAt).getTime();
  return end > nowMs && end <= nowMs + withinMs;
}

export const fileDb = {
  async findUser(query) {
    return (
      read("users").find((u) => {
        if (query.email) return u.email === query.email;
        if (query.googleId) return u.googleId === query.googleId;
        return false;
      }) || null
    );
  },
  async findUserById(id) {
    return read("users").find((u) => u.id === String(id)) || null;
  },
  async createUser(data) {
    const rows = read("users");
    const user = { id: nid(), ...data, createdAt: new Date().toISOString() };
    rows.push(user);
    write("users", rows);
    return user;
  },
  async updateUser(user) {
    const rows = read("users");
    const idx = rows.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...user };
      write("users", rows);
      return rows[idx];
    }
    return user;
  },
  async createOrder(data) {
    const rows = read("orders");
    // Índices únicos sparse del esquema (server/models.js): un pago de MP o una
    // transacción de Paddle pertenece a una sola orden.
    for (const field of ["mpPaymentId", "paddleTransactionId"]) {
      const value = data[field];
      if (value != null && rows.some((o) => o[field] === String(value))) {
        throw duplicateKey(field);
      }
    }
    const order = {
      id: nid(),
      ...data,
      userId: String(data.userId),
      downloadCount: data.downloadCount || 0,
      downloads: data.downloads || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rows.push(order);
    write("orders", rows);
    return withSave(order);
  },
  async findOrderById(id) {
    return withSave(read("orders").find((o) => o.id === String(id)) || null);
  },
  /** La orden ya paga con ese pago de MP o esa transacción de Paddle, o null. */
  async findPaidOrderByPayment({ mpPaymentId, paddleTransactionId }) {
    const field = paddleTransactionId != null ? "paddleTransactionId" : "mpPaymentId";
    const value = String(paddleTransactionId ?? mpPaymentId);
    return withSave(
      read("orders").find((o) => o[field] === value && o.status === "paid") ||
        null,
    );
  },
  async findOrderByPaddleTransaction(transactionId) {
    return withSave(
      read("orders").find(
        (o) => o.paddleTransactionId === String(transactionId),
      ) || null,
    );
  },
  async deletePendingOrder(orderId) {
    const rows = read("orders");
    const idx = rows.findIndex(
      (o) => o.id === String(orderId) && o.status === "pending",
    );
    if (idx < 0) return false;
    rows.splice(idx, 1);
    write("orders", rows);
    return true;
  },
  async listPaidOrdersWithoutReceipt({ since, before }) {
    const from = new Date(since).getTime();
    const to = new Date(before).getTime();
    return read("orders")
      .filter((o) => {
        const at = o.paidAt ? new Date(o.paidAt).getTime() : NaN;
        return o.status === "paid" && !o.receiptEmailSentAt && at >= from && at <= to;
      })
      .map(withSave);
  },
  async listFailedOrdersDue({ before }) {
    const cut = new Date(before).getTime();
    return read("orders")
      .filter(
        (o) =>
          o.status === "pending" &&
          o.paymentFailedAt &&
          new Date(o.paymentFailedAt).getTime() <= cut &&
          !o.failedEmailSentAt,
      )
      .map(withSave);
  },
  async findOrdersByUser(userId) {
    return read("orders")
      .filter((o) => String(o.userId) === String(userId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map(withSave);
  },

  async createHostedInstance(data) {
    const rows = read("hosted");
    const now = new Date().toISOString();
    const inst = {
      id: nid(),
      status: "draft",
      domains: [],
      ...data,
      userId: String(data.userId),
      // Como Mongoose (timestamps): un createdAt explícito se respeta.
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : now,
      updatedAt: now,
    };
    rows.push(inst);
    write("hosted", rows);
    return withSaveDoc("hosted", inst);
  },
  async findHostedInstanceById(id) {
    return withSaveDoc(
      "hosted",
      read("hosted").find((h) => h.id === String(id)) || null,
    );
  },
  async findHostedInstanceByKey(key) {
    return withSaveDoc(
      "hosted",
      read("hosted").find((h) => h.key === String(key)) || null,
    );
  },
  async findHostedInstanceByEditTokenHash(hash) {
    if (!hash) return null;
    return withSaveDoc(
      "hosted",
      read("hosted").find((h) => h.editTokenHash === String(hash)) || null,
    );
  },
  async findHostedInstancesByUser(userId) {
    return read("hosted")
      .filter((h) => String(h.userId) === String(userId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((h) => withSaveDoc("hosted", h));
  },
  async deleteHostedInstance(id) {
    const rows = read("hosted");
    const idx = rows.findIndex((h) => h.id === String(id));
    if (idx < 0) return false;
    rows.splice(idx, 1);
    write("hosted", rows);
    return true;
  },
  async createBuilderProject(data) {
    const rows = read("builder-projects");
    const now = new Date().toISOString();
    const project = {
      id: nid(),
      name: "",
      recipe: [],
      ...data,
      userId: String(data.userId),
      createdAt: now,
      updatedAt: now,
    };
    rows.push(project);
    write("builder-projects", rows);
    return withSaveDoc("builder-projects", project);
  },
  async findBuilderProjectById(id) {
    return withSaveDoc(
      "builder-projects",
      read("builder-projects").find((p) => p.id === String(id)) || null,
    );
  },
  async findBuilderProjectsByUser(userId) {
    return read("builder-projects")
      .filter((p) => String(p.userId) === String(userId))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((p) => withSaveDoc("builder-projects", p));
  },
  async deleteBuilderProject(id) {
    const rows = read("builder-projects");
    const idx = rows.findIndex((p) => p.id === String(id));
    if (idx < 0) return false;
    rows.splice(idx, 1);
    write("builder-projects", rows);
    return true;
  },
  async createHostedPack(data) {
    const rows = read("hosted-packs");
    const now = new Date().toISOString();
    const pack = {
      id: nid(),
      name: "",
      items: [],
      domains: [],
      ...data,
      userId: String(data.userId),
      createdAt: now,
      updatedAt: now,
    };
    rows.push(pack);
    write("hosted-packs", rows);
    return withSaveDoc("hosted-packs", pack);
  },
  async findHostedPackById(id) {
    return withSaveDoc(
      "hosted-packs",
      read("hosted-packs").find((p) => p.id === String(id)) || null,
    );
  },
  async findHostedPackByKey(key) {
    return withSaveDoc(
      "hosted-packs",
      read("hosted-packs").find((p) => p.key === String(key)) || null,
    );
  },
  async findHostedPacksByUser(userId) {
    return read("hosted-packs")
      .filter((p) => String(p.userId) === String(userId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((p) => withSaveDoc("hosted-packs", p));
  },
  async deleteHostedPack(id) {
    const rows = read("hosted-packs");
    const idx = rows.findIndex((p) => p.id === String(id));
    if (idx < 0) return false;
    rows.splice(idx, 1);
    write("hosted-packs", rows);
    return true;
  },
  async removeInstanceFromPacks(userId, instanceId) {
    const rows = read("hosted-packs");
    let changed = false;
    for (const p of rows) {
      if (String(p.userId) !== String(userId)) continue;
      const next = (p.items || []).filter((i) => i !== String(instanceId));
      if (next.length !== (p.items || []).length) {
        p.items = next;
        p.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) write("hosted-packs", rows);
  },
  async countPublishedHosted(userId, exceptId) {
    return read("hosted").filter(
      (h) =>
        String(h.userId) === String(userId) &&
        h.status === "published" &&
        h.id !== String(exceptId),
    ).length;
  },
  async countPublishedHostedCreatedBefore(userId, createdAt, exceptId) {
    const t = new Date(createdAt).getTime();
    const eid = String(exceptId);
    // Desempate por id cuando el createdAt coincide al ms — así el orden es
    // total y determinista (si no, dos instancias del mismo ms no se cuentan
    // entre sí y ambas quedarían "dentro de cuota").
    return read("hosted").filter((h) => {
      if (String(h.userId) !== String(userId)) return false;
      if (h.status !== "published") return false;
      if (h.id === eid) return false;
      const ht = new Date(h.createdAt).getTime();
      return ht < t || (ht === t && String(h.id) < eid);
    }).length;
  },

  async createSubscription(data) {
    const rows = read("subscriptions");
    const now = new Date().toISOString();
    const sub = {
      id: nid(),
      status: "pending",
      ...data,
      userId: String(data.userId),
      createdAt: now,
      updatedAt: now,
    };
    rows.push(sub);
    write("subscriptions", rows);
    return withSaveDoc("subscriptions", sub);
  },
  async findSubscriptionById(id) {
    return withSaveDoc(
      "subscriptions",
      read("subscriptions").find((s) => s.id === String(id)) || null,
    );
  },
  async findSubscriptionByPreapproval(preapprovalId) {
    return withSaveDoc(
      "subscriptions",
      read("subscriptions").find(
        (s) => s.mpPreapprovalId === String(preapprovalId),
      ) || null,
    );
  },
  async findSubscriptionByPaddle({ subscriptionId, transactionId }) {
    const rows = read("subscriptions");
    const row =
      (subscriptionId &&
        rows.find((s) => s.paddleSubscriptionId === String(subscriptionId))) ||
      (transactionId &&
        rows.find((s) => s.paddleTransactionId === String(transactionId))) ||
      null;
    return withSaveDoc("subscriptions", row);
  },
  async findActiveSubscriptionByUser(userId) {
    return (
      read("subscriptions")
        .filter(
          (s) =>
            String(s.userId) === String(userId) &&
            (s.status === "authorized" || s.status === "paused"),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((s) => withSaveDoc("subscriptions", s))[0] || null
    );
  },
  async findSubscriptionsByUser(userId) {
    return read("subscriptions")
      .filter((s) => String(s.userId) === String(userId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((s) => withSaveDoc("subscriptions", s));
  },
  async listCheckoutFailuresDue({ before }) {
    const cut = new Date(before).getTime();
    return read("subscriptions")
      .filter(
        (s) =>
          s.status === "pending" &&
          !s.abandonedAt &&
          s.paymentFailedAt &&
          new Date(s.paymentFailedAt).getTime() <= cut &&
          !s.paymentFailedEmailSentAt,
      )
      .map((s) => withSaveDoc("subscriptions", s));
  },
  async listTrialReminderCandidates({ now, withinMs }) {
    return read("subscriptions")
      .filter((s) => trialReminderDue(s, now.getTime(), withinMs))
      .map((s) => withSaveDoc("subscriptions", s));
  },
  async deleteSubscription(id) {
    const rows = read("subscriptions");
    const idx = rows.findIndex((s) => s.id === String(id));
    if (idx < 0) return false;
    rows.splice(idx, 1);
    write("subscriptions", rows);
    return true;
  },

  // Analítica propia: un evento por línea (NDJSON), solo se agrega al final.
  async addEvents(rows) {
    if (!rows.length) return;
    ensure();
    fs.appendFileSync(
      path.join(DATA_DIR, "events.ndjson"),
      rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
  },
  /** @param {{ since?: Date | string | number }} [options] */
  async listEvents({ since } = {}) {
    const p = path.join(DATA_DIR, "events.ndjson");
    if (!fs.existsSync(p)) return [];
    const t = since ? new Date(since).getTime() : 0;
    return fs
      .readFileSync(p, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((e) => e && new Date(e.createdAt).getTime() >= t);
  },
  async listUsers() {
    return read("users").sort(newestFirst);
  },
  async listOrders() {
    return read("orders").sort(newestFirst);
  },

  // Libro de reembolsos (upsert por externalId).
  async recordRefund(data) {
    const rows = read('refunds')
    const now = new Date().toISOString()
    const i = rows.findIndex((r) => r.externalId === data.externalId)
    const row = i >= 0
      ? { ...rows[i], ...data, updatedAt: now }
      : { id: nid(), partial: false, reason: 'refunded', refundedAt: now, ...data, createdAt: now, updatedAt: now }
    if (i >= 0) rows[i] = row
    else rows.push(row)
    write('refunds', rows)
    return row
  },
  async findRefund(externalId) {
    return read('refunds').find((r) => r.externalId === externalId) || null
  },
  async listRefunds() {
    return read('refunds').sort(
      (a, b) => new Date(b.refundedAt).getTime() - new Date(a.refundedAt).getTime(),
    )
  },
  async listWithdrawals() {
    return read('withdrawals').sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  },
  async listSubscriptions() {
    return read('subscriptions')
  },
  async listHostedInstances() {
    return read('hosted')
  },

  // Solicitudes del botón de arrepentimiento.
  async createWithdrawal(data) {
    const rows = read('withdrawals')
    if (rows.some((r) => r.code === data.code)) throw duplicateKey('code')
    const now = new Date().toISOString()
    const row = {
      id: nid(),
      status: 'received',
      orderId: null,
      ...data,
      email: String(data.email).toLowerCase(),
      createdAt: now,
      updatedAt: now,
    }
    rows.push(row)
    write('withdrawals', rows)
    return row
  },
  async findRecentWithdrawal({ email, orderId, subscriptionId = null, since }) {
    const cut = new Date(since).getTime()
    return (
      read('withdrawals')
        .filter(
          (w) =>
            w.email === String(email).toLowerCase() &&
            (w.orderId || null) === (orderId || null) &&
            (w.subscriptionId || null) === (subscriptionId || null) &&
            new Date(w.createdAt).getTime() >= cut,
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null
    )
  },

  async findWithdrawalByCode(code) {
    return read('withdrawals').find((w) => w.code === String(code)) || null
  },
  async updateWithdrawal(code, patch) {
    const rows = read('withdrawals')
    const row = rows.find((w) => w.code === String(code))
    if (!row) return null
    Object.assign(row, patch, { updatedAt: new Date().toISOString() })
    write('withdrawals', rows)
    return row
  },
  async claimWithdrawal(code, from, to) {
    const rows = read('withdrawals')
    const row = rows.find((w) => w.code === String(code) && w.status === from)
    if (!row) return null
    Object.assign(row, { status: to, confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    write('withdrawals', rows)
    return row
  },

  // Leads (cupón de bienvenida). Alta idempotente por email.
  async upsertLead(data) {
    const rows = read("leads");
    const email = String(data.email).toLowerCase();
    const found = rows.find((l) => l.email === email);
    if (found) return { lead: withSaveDoc("leads", found), created: false };
    const now = new Date().toISOString();
    const lead = {
      id: nid(),
      source: "home",
      locale: "es",
      ...data,
      email,
      consentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(lead);
    write("leads", rows);
    return { lead: withSaveDoc("leads", lead), created: true };
  },
  async listLeads({ unsyncedOnly = false } = {}) {
    return read("leads")
      .filter((l) => !unsyncedOnly || !l.crmSyncedAt)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .map((l) => withSaveDoc("leads", l));
  },
  async findLeadByCoupon(code) {
    return withSaveDoc(
      "leads",
      read("leads").find((l) => l.couponCode === code) || null,
    );
  },
  // Canje en una sola escritura: gana el primero; repetir con la misma orden es ok.
  async redeemCoupon({ code, orderId }) {
    const rows = read("leads");
    const lead = rows.find((l) => l.couponCode === code);
    if (!lead) return { redeemed: false };
    if (lead.couponRedeemedAt) {
      return { redeemed: String(lead.couponOrderId) === String(orderId) };
    }
    lead.couponRedeemedAt = new Date().toISOString();
    lead.couponOrderId = String(orderId);
    lead.updatedAt = lead.couponRedeemedAt;
    write("leads", rows);
    return { redeemed: true };
  },

  // Avisos de cambio de precio de LAB: una fila por (suscripción, cambio).
  async ensurePriceChangeNotice(data) {
    const rows = read("price-change-notices");
    const subscriptionId = String(data.subscriptionId);
    const changeId = String(data.changeId);
    const found = rows.find(
      (n) => n.subscriptionId === subscriptionId && n.changeId === changeId,
    );
    if (found) {
      return { notice: withSaveDoc("price-change-notices", found), created: false };
    }
    const now = new Date().toISOString();
    const notice = {
      id: nid(),
      ...data,
      subscriptionId,
      changeId,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(notice);
    write("price-change-notices", rows);
    return { notice: withSaveDoc("price-change-notices", notice), created: true };
  },
  async findPriceChangeNoticeById(id) {
    return withSaveDoc(
      "price-change-notices",
      read("price-change-notices").find((n) => n.id === String(id)) || null,
    );
  },
  async findPriceChangeNotice(subscriptionId, changeId) {
    return withSaveDoc(
      "price-change-notices",
      read("price-change-notices").find(
        (n) => n.subscriptionId === String(subscriptionId) && n.changeId === String(changeId),
      ) || null,
    );
  },
  async findPriceChangeNoticesBySubscription(subscriptionId) {
    return read("price-change-notices")
      .filter((n) => n.subscriptionId === String(subscriptionId))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((n) => withSaveDoc("price-change-notices", n));
  },
  async listPriceChangeNotices() {
    return read("price-change-notices").map((n) => withSaveDoc("price-change-notices", n));
  },
  /**
   * Transición atómica: si `condition(row)`, aplica `patch(row)` y guarda; si
   * no, devuelve null. Leer, comprobar y escribir van sin ningún `await` en el
   * medio, así que dos llamadas a la vez no pueden ganar las dos (en Mongo es el
   * filtro del findOneAndUpdate).
   */
  async updatePriceChangeNoticeIf(id, condition, patch) {
    const rows = read("price-change-notices");
    const row = rows.find((n) => n.id === String(id));
    if (!row || !condition(row)) return null;
    patch(row);
    row.updatedAt = new Date().toISOString();
    write("price-change-notices", rows);
    return withSaveDoc("price-change-notices", row);
  },
};
