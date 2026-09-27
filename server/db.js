import mongoose from "mongoose";
import {
  User as MongoUser,
  Order as MongoOrder,
  HostedInstance as MongoHostedInstance,
  Subscription as MongoSubscription,
  Lead as MongoLead,
} from "./models.js";
import { fileDb, trialReminderDue } from "./fileStore.js";

let mode =
  process.env.STORE === "file"
    ? "file"
    : process.env.STORE === "mongo"
      ? "mongo"
      : process.env.NODE_ENV === "production"
        ? "mongo"
        : "file";

/**
 * Conecta a Mongo o usa file store.
 * En producción (o si STORE no es file) falla si Mongo no responde.
 */
export async function connectDb(config) {
  const wantFile = (config?.store || process.env.STORE) === "file";
  if (wantFile) {
    if (config?.isProd) {
      throw new Error("STORE=file no está permitido en producción");
    }
    mode = "file";
    console.log("STORE=file — using storage/db JSON");
    return mode;
  }

  const uri =
    config?.mongoUri ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/scrolllab";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected");
    mode = "mongo";
    return mode;
  } catch (err) {
    if (config?.isProd || process.env.NODE_ENV === "production") {
      throw new Error(`MongoDB requerido en producción: ${err.message}`);
    }
    console.warn(
      `MongoDB no disponible (${err.message}). Usando STORE=file para desarrollo local.` +
        " (Poné STORE=file en .env para silenciar este aviso.)",
    );
    mode = "file";
    // Mantener config alineada con el store efectivo (session, logs, health).
    if (config && typeof config === "object") config.store = "file";
    return mode;
  }
}

export function storeMode() {
  return mode;
}

function uid(user) {
  return user?.id || user?._id?.toString();
}

// Prefijo de los campos de cada mail de suscripción (`<prefijo>SentAt`, etc.).
const EMAIL_PREFIX = {
  welcome: "welcomeEmail",
  canceled: "canceledEmail",
  trialReminder: "trialReminderEmail",
};
function emailPrefix(kind) {
  const p = EMAIL_PREFIX[kind];
  if (!p) throw new Error(`Mail de suscripción desconocido: ${kind}`);
  return p;
}
// Gate de cada mail en el file store (en Mongo es el filtro del findOneAndUpdate).
function subscriptionEmailGate(kind, sub, at, withinMs) {
  if (kind === "canceled") return !!sub.canceledAt;
  if (kind === "trialReminder") {
    return trialReminderDue(sub, at.getTime(), withinMs);
  }
  return sub.status === "authorized";
}

export const db = {
  uid,
  async findUser(query) {
    return mode === "file" ? fileDb.findUser(query) : MongoUser.findOne(query);
  },
  async findUserById(id) {
    return mode === "file" ? fileDb.findUserById(id) : MongoUser.findById(id);
  },
  async createUser(data) {
    return mode === "file" ? fileDb.createUser(data) : MongoUser.create(data);
  },
  async updateUser(user) {
    if (mode === "file") return fileDb.updateUser(user);
    return user.save();
  },
  // Alta idempotente de un lead por email: `created` dice si es el primer alta.
  async upsertLead(data) {
    if (mode === "file") return fileDb.upsertLead(data);
    try {
      return { lead: await MongoLead.create(data), created: true };
    } catch (err) {
      if (err?.code !== 11000) throw err;
      return {
        lead: await MongoLead.findOne({
          email: String(data.email).toLowerCase(),
        }),
        created: false,
      };
    }
  },
  async listLeads({ unsyncedOnly = false } = {}) {
    if (mode === "file") return fileDb.listLeads({ unsyncedOnly });
    return MongoLead.find(unsyncedOnly ? { crmSyncedAt: null } : {}).sort({
      createdAt: 1,
    });
  },
  async findLeadByCoupon(code) {
    if (mode === "file") return fileDb.findLeadByCoupon(code);
    return MongoLead.findOne({ couponCode: code });
  },
  // Canje atómico: gana el primero; repetir con la misma orden es ok.
  async redeemCoupon({ code, orderId }) {
    if (mode === "file") return fileDb.redeemCoupon({ code, orderId });
    const won = await MongoLead.findOneAndUpdate(
      { couponCode: code, couponRedeemedAt: null },
      {
        $set: { couponRedeemedAt: new Date(), couponOrderId: String(orderId) },
      },
      { new: true },
    );
    if (won) return { redeemed: true };
    const lead = await MongoLead.findOne({ couponCode: code });
    return {
      redeemed: Boolean(lead) && String(lead.couponOrderId) === String(orderId),
    };
  },
  async createOrder(data) {
    if (mode === "file") return fileDb.createOrder(data);
    return MongoOrder.create(data);
  },
  async findOrderById(id) {
    return mode === "file" ? fileDb.findOrderById(id) : MongoOrder.findById(id);
  },
  async findOrdersByUser(userId) {
    return mode === "file"
      ? fileDb.findOrdersByUser(userId)
      : MongoOrder.find({ userId }).sort({ createdAt: -1 });
  },
  async setOrderZipPath(orderId, zipPath) {
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      order.zipPath = zipPath;
      await order.save();
      return order;
    }
    return MongoOrder.findByIdAndUpdate(
      orderId,
      { $set: { zipPath } },
      { new: true },
    );
  },
  /**
   * Transición pending→paid atómica. Si ya está paga con el mismo paymentId, ok.
   */
  async markOrderPaidAtomic({ orderId, mpPaymentId }) {
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return { order: null, created: false };
      if (order.status === "paid") {
        return { order, created: false };
      }
      order.status = "paid";
      order.mpPaymentId = String(mpPaymentId);
      delete order.expiresAt;
      await order.save();
      return { order, created: true };
    }

    const existing = await MongoOrder.findOne({
      mpPaymentId: String(mpPaymentId),
      status: "paid",
    });
    if (existing) {
      return { order: existing, created: false };
    }

    const updated = await MongoOrder.findOneAndUpdate(
      { _id: orderId, status: "pending" },
      {
        $set: {
          status: "paid",
          mpPaymentId: String(mpPaymentId),
        },
        // Una orden paga no caduca: sacarle el TTL es parte de cobrarla.
        $unset: { expiresAt: 1 },
      },
      { new: true },
    );
    if (updated) return { order: updated, created: true };

    const current = await MongoOrder.findById(orderId);
    return { order: current, created: false };
  },
  /**
   * paid→refunded atómica, solo si el pago devuelto es el que la pagó (el
   * reembolso de un segundo pago duplicado no toca la orden).
   */
  async markOrderRefundedAtomic({ orderId, mpPaymentId, reason }) {
    const at = new Date();
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      if (order.status !== "paid" || order.mpPaymentId !== String(mpPaymentId)) {
        return null;
      }
      order.status = "refunded";
      order.refundedAt = at.toISOString();
      order.refundReason = reason;
      await order.save();
      return order;
    }
    return MongoOrder.findOneAndUpdate(
      { _id: orderId, status: "paid", mpPaymentId: String(mpPaymentId) },
      { $set: { status: "refunded", refundedAt: at, refundReason: reason } },
      { new: true },
    );
  },
  // maxDownloads 0 = sin tope: el contador se sigue llevando, pero no frena.
  // `meta` ({ ip }) alimenta el log de descargas (ip-protection-brief §3.5).
  async consumeDownloadAtomic(orderId, maxDownloads, meta = {}) {
    const capped = Number(maxDownloads) > 0;
    const entry = { at: new Date(), ip: meta.ip ? String(meta.ip) : undefined };
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order || order.status !== "paid") return null;
      if (capped && (order.downloadCount || 0) >= maxDownloads) return null;
      order.downloadCount = (order.downloadCount || 0) + 1;
      order.downloads = [
        ...(order.downloads || []),
        { at: entry.at.toISOString(), ip: entry.ip },
      ].slice(-50);
      await order.save();
      return order;
    }
    return MongoOrder.findOneAndUpdate(
      {
        _id: orderId,
        status: "paid",
        ...(capped ? { downloadCount: { $lt: maxDownloads } } : {}),
      },
      {
        $inc: { downloadCount: 1 },
        $push: { downloads: { $each: [entry], $slice: -50 } },
      },
      { new: true },
    );
  },
  async claimReceiptEmail(orderId) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);

    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order || order.status !== "paid" || order.receiptEmailSentAt) {
        return null;
      }
      if (
        order.receiptEmailSendingAt &&
        new Date(order.receiptEmailSendingAt) >= staleBefore
      ) {
        return null;
      }
      order.receiptEmailSendingAt = now.toISOString();
      delete order.receiptEmailError;
      await order.save();
      return order;
    }

    return MongoOrder.findOneAndUpdate(
      {
        _id: orderId,
        status: "paid",
        receiptEmailSentAt: null,
        $or: [
          { receiptEmailSendingAt: null },
          { receiptEmailSendingAt: { $lt: staleBefore } },
        ],
      },
      {
        $set: { receiptEmailSendingAt: now },
        $unset: { receiptEmailError: 1 },
      },
      { new: true },
    );
  },
  async completeReceiptEmail(orderId, receiptEmailId) {
    const now = new Date();
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      order.receiptEmailSentAt = now.toISOString();
      order.receiptEmailId = receiptEmailId;
      delete order.receiptEmailSendingAt;
      delete order.receiptEmailError;
      await order.save();
      return order;
    }
    return MongoOrder.findByIdAndUpdate(
      orderId,
      {
        $set: {
          receiptEmailSentAt: now,
          receiptEmailId,
        },
        $unset: {
          receiptEmailSendingAt: 1,
          receiptEmailError: 1,
        },
      },
      { new: true },
    );
  },
  async releaseReceiptEmail(orderId, message) {
    const safeMessage = String(message || "Error de email").slice(0, 500);
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      order.receiptEmailError = safeMessage;
      delete order.receiptEmailSendingAt;
      await order.save();
      return order;
    }
    return MongoOrder.findByIdAndUpdate(
      orderId,
      {
        $set: { receiptEmailError: safeMessage },
        $unset: { receiptEmailSendingAt: 1 },
      },
      { new: true },
    );
  },
  // ——— Hosted Component (docs/hosted-component-plan.md, Fase 3) ———
  async createHostedInstance(data) {
    if (mode === "file") return fileDb.createHostedInstance(data);
    return MongoHostedInstance.create(data);
  },
  async findHostedInstanceById(id) {
    if (mode === "file") return fileDb.findHostedInstanceById(id);
    return MongoHostedInstance.findById(id);
  },
  async findHostedInstanceByKey(key) {
    if (mode === "file") return fileDb.findHostedInstanceByKey(key);
    return MongoHostedInstance.findOne({ key: String(key) });
  },
  async findHostedInstancesByUser(userId) {
    if (mode === "file") return fileDb.findHostedInstancesByUser(userId);
    return MongoHostedInstance.find({ userId }).sort({ createdAt: -1 });
  },
  async deleteHostedInstance(id) {
    if (mode === "file") return fileDb.deleteHostedInstance(id);
    const res = await MongoHostedInstance.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
  async incHostedViews(key) {
    if (mode === "file") {
      const inst = await fileDb.findHostedInstanceByKey(key);
      if (!inst) return;
      inst.views = (inst.views || 0) + 1;
      await inst.save();
      return;
    }
    await MongoHostedInstance.updateOne(
      { key: String(key) },
      { $inc: { views: 1 } },
    );
  },
  async countPublishedHosted(userId, exceptId) {
    if (mode === "file") return fileDb.countPublishedHosted(userId, exceptId);
    return MongoHostedInstance.countDocuments({
      userId,
      status: "published",
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    });
  },
  // Publicadas del usuario creadas ANTES que `createdAt` (orden estable para
  // decidir cuáles quedan cubiertas por la cuota cuando el plan cae).
  // Desempate por `_id` cuando el `createdAt` coincide → orden total.
  async countPublishedHostedCreatedBefore(userId, createdAt, exceptId) {
    if (mode === "file")
      return fileDb.countPublishedHostedCreatedBefore(
        userId,
        createdAt,
        exceptId,
      );
    const d = new Date(createdAt);
    return MongoHostedInstance.countDocuments({
      userId,
      status: "published",
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
      $or: [
        { createdAt: { $lt: d } },
        ...(exceptId ? [{ createdAt: d, _id: { $lt: exceptId } }] : []),
      ],
    });
  },

  // ——— Suscripciones (LAB, Fase 4) ———
  async createSubscription(data) {
    if (mode === "file") return fileDb.createSubscription(data);
    return MongoSubscription.create(data);
  },
  async findSubscriptionById(id) {
    if (mode === "file") return fileDb.findSubscriptionById(id);
    return MongoSubscription.findById(id);
  },
  async findSubscriptionByPreapproval(preapprovalId) {
    if (mode === "file")
      return fileDb.findSubscriptionByPreapproval(preapprovalId);
    return MongoSubscription.findOne({ mpPreapprovalId: String(preapprovalId) });
  },
  // Vigente = `authorized` o `paused` (una pausa respeta lo ya pagado).
  async findActiveSubscriptionByUser(userId) {
    if (mode === "file") return fileDb.findActiveSubscriptionByUser(userId);
    return MongoSubscription.findOne({
      userId,
      status: { $in: ["authorized", "paused"] },
    }).sort({ createdAt: -1 });
  },
  async findSubscriptionsByUser(userId) {
    if (mode === "file") return fileDb.findSubscriptionsByUser(userId);
    return MongoSubscription.find({ userId }).sort({ createdAt: -1 });
  },
  async deleteSubscription(id) {
    if (mode === "file") return fileDb.deleteSubscription(id);
    const res = await MongoSubscription.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },

  // Mails de suscripción: bienvenida al activarse, confirmación al cancelar y
  // aviso antes del primer cobro de la prueba. claim/complete/release igual que
  // el recibo de orden — se manda una vez.
  // `kind` (y su gate): 'welcome' (status authorized) | 'canceled' (canceledAt) |
  // 'trialReminder' (prueba sin cancelar que termina dentro de `withinMs`).
  // `now` solo lo inyectan los tests para mover el reloj de la prueba.
  async claimSubscriptionEmail(subId, kind, { withinMs, now: at } = {}) {
    const p = emailPrefix(kind);
    if (kind === "trialReminder" && !(withinMs > 0)) return null;
    const now = new Date();
    const trialNow = at ? new Date(at) : now;
    const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);
    if (mode === "file") {
      const sub = await fileDb.findSubscriptionById(subId);
      if (!sub || sub[`${p}SentAt`]) return null;
      if (!subscriptionEmailGate(kind, sub, trialNow, withinMs)) return null;
      if (sub[`${p}SendingAt`] && new Date(sub[`${p}SendingAt`]) >= staleBefore) {
        return null;
      }
      sub[`${p}SendingAt`] = now.toISOString();
      delete sub[`${p}Error`];
      await sub.save();
      return sub;
    }
    const gate = {
      welcome: { status: "authorized" },
      canceled: { canceledAt: { $ne: null } },
      trialReminder: {
        status: "authorized",
        canceledAt: null,
        lastPaidAt: null,
        trialEndsAt: {
          $gt: trialNow,
          $lte: new Date(trialNow.getTime() + withinMs),
        },
      },
    }[kind];
    return MongoSubscription.findOneAndUpdate(
      {
        _id: subId,
        ...gate,
        [`${p}SentAt`]: null,
        $or: [
          { [`${p}SendingAt`]: null },
          { [`${p}SendingAt`]: { $lt: staleBefore } },
        ],
      },
      { $set: { [`${p}SendingAt`]: now }, $unset: { [`${p}Error`]: 1 } },
      { new: true },
    );
  },
  async completeSubscriptionEmail(subId, kind, emailId) {
    const p = emailPrefix(kind);
    if (mode === "file") {
      const sub = await fileDb.findSubscriptionById(subId);
      if (!sub) return null;
      sub[`${p}SentAt`] = new Date().toISOString();
      sub[`${p}Id`] = emailId;
      delete sub[`${p}SendingAt`];
      delete sub[`${p}Error`];
      await sub.save();
      return sub;
    }
    return MongoSubscription.findByIdAndUpdate(
      subId,
      {
        $set: { [`${p}SentAt`]: new Date(), [`${p}Id`]: emailId },
        $unset: { [`${p}SendingAt`]: 1, [`${p}Error`]: 1 },
      },
      { new: true },
    );
  },
  async releaseSubscriptionEmail(subId, kind, message) {
    const p = emailPrefix(kind);
    const safe = String(message || "Error de email").slice(0, 500);
    if (mode === "file") {
      const sub = await fileDb.findSubscriptionById(subId);
      if (!sub) return null;
      sub[`${p}Error`] = safe;
      delete sub[`${p}SendingAt`];
      await sub.save();
      return sub;
    }
    return MongoSubscription.findByIdAndUpdate(
      subId,
      { $set: { [`${p}Error`]: safe }, $unset: { [`${p}SendingAt`]: 1 } },
      { new: true },
    );
  },

  // Pruebas de LAB que terminan dentro de `withinMs` y todavía no recibieron el
  // aviso del primer cobro (server/services/trialReminders.js).
  async listTrialReminderCandidates({ now = new Date(), withinMs }) {
    if (mode === "file") {
      return fileDb.listTrialReminderCandidates({ now, withinMs });
    }
    return MongoSubscription.find({
      status: "authorized",
      canceledAt: null,
      lastPaidAt: null,
      trialReminderEmailSentAt: null,
      trialEndsAt: { $gt: now, $lte: new Date(now.getTime() + withinMs) },
    });
  },

  async isReady() {
    if (mode === "file") return true;
    return mongoose.connection.readyState === 1;
  },
  async disconnect() {
    if (mode === "mongo" && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  },
};
