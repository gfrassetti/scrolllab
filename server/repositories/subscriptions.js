import { Subscription as MongoSubscription } from "../models.js";
import { fileDb, trialReminderDue } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Suscripciones de LAB (Fase 4) y el claim idempotente de sus mails.
 * Cada método elige el almacén (archivos o Mongo) y devuelve lo mismo en los
 * dos; server/db.js los compone en el facade `db`.
 */
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

export const subscriptionsRepo = {
  // ——— Suscripciones (LAB, Fase 4) ———
  async createSubscription(data) {
    if (isFileMode()) return fileDb.createSubscription(data);
    return MongoSubscription.create(data);
  },
  async findSubscriptionById(id) {
    if (isFileMode()) return fileDb.findSubscriptionById(id);
    return MongoSubscription.findById(id);
  },
  async findSubscriptionByPreapproval(preapprovalId) {
    if (isFileMode())
      return fileDb.findSubscriptionByPreapproval(preapprovalId);
    return MongoSubscription.findOne({ mpPreapprovalId: String(preapprovalId) });
  },
  // Vigente = `authorized` o `paused` (una pausa respeta lo ya pagado).
  async findActiveSubscriptionByUser(userId) {
    if (isFileMode()) return fileDb.findActiveSubscriptionByUser(userId);
    return MongoSubscription.findOne({
      userId,
      status: { $in: ["authorized", "paused"] },
    }).sort({ createdAt: -1 });
  },
  async findSubscriptionsByUser(userId) {
    if (isFileMode()) return fileDb.findSubscriptionsByUser(userId);
    return MongoSubscription.find({ userId }).sort({ createdAt: -1 });
  },
  async deleteSubscription(id) {
    if (isFileMode()) return fileDb.deleteSubscription(id);
    const res = await MongoSubscription.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },

  // Mails de suscripción: bienvenida al activarse, confirmación al cancelar y
  // aviso antes del primer cobro de la prueba. claim/complete/release igual que
  // el recibo de orden — se manda una vez.
  // `kind` (y su gate): 'welcome' (status authorized) | 'canceled' (canceledAt) |
  // 'trialReminder' (prueba sin cancelar que termina dentro de `withinMs`).
  // `now` solo lo inyectan los tests para mover el reloj de la prueba.
  /**
   * @param {string} subId
   * @param {string} kind
   * @param {{ withinMs?: number, now?: Date | string | number }} [options]
   */
  async claimSubscriptionEmail(subId, kind, { withinMs, now: at } = {}) {
    const p = emailPrefix(kind);
    if (kind === "trialReminder" && !(/** @type {number} */ (withinMs) > 0)) {
      return null;
    }
    const now = new Date();
    const trialNow = at ? new Date(at) : now;
    const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);
    if (isFileMode()) {
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
          // Solo se arma para trialReminder, y arriba se exigió withinMs > 0.
          $lte: new Date(trialNow.getTime() + /** @type {number} */ (withinMs)),
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
    if (isFileMode()) {
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
    if (isFileMode()) {
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
    if (isFileMode()) {
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
};
