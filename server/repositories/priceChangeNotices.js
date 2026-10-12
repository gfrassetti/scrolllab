import { PriceChangeNotice as MongoNotice } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Avisos de cambio de precio de LAB: una fila por (suscripción, cambio) con lo
 * que se anunció (de / a, fecha efectiva), el mail (claim / complete / release,
 * como los demás) y si ya se aplicó en la pasarela. El índice único
 * (subscriptionId, changeId) hace idempotente el anuncio aunque dos barridos
 * corran a la vez. Cada método elige el almacén (archivos o Mongo) y devuelve lo
 * mismo en los dos; server/db.js los compone en el facade `db`.
 *
 * Estado de una fila, sin enum: sin `emailSentAt` = por avisar · con
 * `emailSentAt` = avisada · `appliedAt` = aplicada · `skippedAt` = descartada
 * (se dio de baja, cambió de plan, ya paga el precio nuevo…).
 *
 * Invariante que impone el repositorio y no el servicio: **nunca se marca
 * aplicada una fila cuyo mail no salió** (ver markPriceChangeApplied).
 */
const CLAIM_STALE_MS = 10 * 60 * 1000;
const MAX_LIST = 500;

export const priceChangeNoticesRepo = {
  /**
   * Alta idempotente por (subscriptionId, changeId): `created` dice si es la
   * primera vez. Con dos llamadas a la vez gana una sola.
   * @param {{ subscriptionId: string, changeId: string, [k: string]: any }} data
   */
  async ensurePriceChangeNotice(data) {
    if (isFileMode()) return fileDb.ensurePriceChangeNotice(data);
    const subscriptionId = String(data.subscriptionId);
    const changeId = String(data.changeId);
    try {
      return {
        notice: await MongoNotice.create({ ...data, subscriptionId, changeId }),
        created: true,
      };
    } catch (err) {
      if (err?.code !== 11000) throw err;
      return {
        notice: await MongoNotice.findOne({ subscriptionId, changeId }),
        created: false,
      };
    }
  },
  async findPriceChangeNoticeById(id) {
    if (isFileMode()) return fileDb.findPriceChangeNoticeById(id);
    return MongoNotice.findById(id);
  },
  async findPriceChangeNotice(subscriptionId, changeId) {
    if (isFileMode()) return fileDb.findPriceChangeNotice(subscriptionId, changeId);
    return MongoNotice.findOne({
      subscriptionId: String(subscriptionId),
      changeId: String(changeId),
    });
  },
  /** De la más vieja a la más nueva. */
  async findPriceChangeNoticesBySubscription(subscriptionId) {
    if (isFileMode()) return fileDb.findPriceChangeNoticesBySubscription(subscriptionId);
    return MongoNotice.find({ subscriptionId: String(subscriptionId) }).sort({ createdAt: 1 });
  },

  /**
   * Reclama el mail del aviso: una sola llamada gana. `effectiveAt` es la fecha
   * que el mail va a decir (se fija acá, cuando el mail SALE, y se pisa si el
   * envío falla y se reintenta más tarde). No reclama avisos ya enviados,
   * aplicados o descartados.
   * @param {string} noticeId
   * @param {{ effectiveAt?: Date | string | number | null }} [options]
   */
  async claimPriceChangeEmail(noticeId, { effectiveAt } = {}) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - CLAIM_STALE_MS);
    const eff = effectiveAt == null ? null : new Date(effectiveAt);
    if (isFileMode()) {
      return fileDb.updatePriceChangeNoticeIf(
        noticeId,
        (row) =>
          !row.emailSentAt &&
          !row.skippedAt &&
          !row.appliedAt &&
          !(row.emailSendingAt && new Date(row.emailSendingAt) >= staleBefore),
        (row) => {
          row.emailSendingAt = now.toISOString();
          if (eff) row.effectiveAt = eff.toISOString();
          delete row.emailError;
        },
      );
    }
    return MongoNotice.findOneAndUpdate(
      {
        _id: noticeId,
        emailSentAt: null,
        skippedAt: null,
        appliedAt: null,
        $or: [{ emailSendingAt: null }, { emailSendingAt: { $lt: staleBefore } }],
      },
      {
        $set: { emailSendingAt: now, ...(eff ? { effectiveAt: eff } : {}) },
        $unset: { emailError: 1 },
      },
      { new: true },
    );
  },
  async completePriceChangeEmail(noticeId, emailId) {
    const now = new Date();
    if (isFileMode()) {
      return fileDb.updatePriceChangeNoticeIf(
        noticeId,
        () => true,
        (row) => {
          row.emailSentAt = now.toISOString();
          row.emailId = emailId;
          delete row.emailSendingAt;
          delete row.emailError;
        },
      );
    }
    return MongoNotice.findByIdAndUpdate(
      noticeId,
      {
        $set: { emailSentAt: now, emailId },
        $unset: { emailSendingAt: 1, emailError: 1 },
      },
      { new: true },
    );
  },
  /** El envío falló: se suelta el claim y la fecha (se recalcula al reintentar). */
  async releasePriceChangeEmail(noticeId, message) {
    const safe = String(message || "Error de email").slice(0, 500);
    if (isFileMode()) {
      return fileDb.updatePriceChangeNoticeIf(
        noticeId,
        () => true,
        (row) => {
          row.emailError = safe;
          delete row.emailSendingAt;
          delete row.effectiveAt;
        },
      );
    }
    return MongoNotice.findByIdAndUpdate(
      noticeId,
      {
        $set: { emailError: safe },
        $unset: { emailSendingAt: 1, effectiveAt: 1 },
      },
      { new: true },
    );
  },

  /**
   * Avisos cuyo mail todavía no salió (y que nadie está mandando ahora): los
   * que el barrido reintenta. Del más viejo al más nuevo.
   * @param {{ limit?: number }} [options]
   */
  async listPriceChangeNoticesToAnnounce({ limit = 200 } = {}) {
    const cap = Math.min(Math.max(Number(limit) || 0, 1), MAX_LIST);
    const staleBefore = new Date(Date.now() - CLAIM_STALE_MS);
    if (isFileMode()) {
      return (await fileDb.listPriceChangeNotices())
        .filter(
          (n) =>
            !n.emailSentAt &&
            !n.skippedAt &&
            !n.appliedAt &&
            (!n.emailSendingAt || new Date(n.emailSendingAt) < staleBefore),
        )
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .slice(0, cap);
    }
    return MongoNotice.find({
      emailSentAt: null,
      skippedAt: null,
      appliedAt: null,
      $or: [{ emailSendingAt: null }, { emailSendingAt: { $lt: staleBefore } }],
    })
      .sort({ createdAt: 1 })
      .limit(cap);
  },
  /**
   * Avisados, sin aplicar ni descartar, cuya fecha efectiva llega antes de
   * `before` (el barrido pasa «ahora + el margen de aplicación»). De la fecha
   * más próxima a la más lejana.
   * @param {{ before: Date | string | number, limit?: number }} args
   */
  async listPriceChangeNoticesDue({ before, limit = 200 }) {
    const cap = Math.min(Math.max(Number(limit) || 0, 1), MAX_LIST);
    const limitDate = new Date(before);
    if (isFileMode()) {
      return (await fileDb.listPriceChangeNotices())
        .filter(
          (n) =>
            n.emailSentAt &&
            !n.appliedAt &&
            !n.skippedAt &&
            n.effectiveAt &&
            new Date(n.effectiveAt) <= limitDate,
        )
        .sort((a, b) => new Date(a.effectiveAt).getTime() - new Date(b.effectiveAt).getTime())
        .slice(0, cap);
    }
    return MongoNotice.find({
      emailSentAt: { $ne: null },
      appliedAt: null,
      skippedAt: null,
      effectiveAt: { $ne: null, $lte: limitDate },
    })
      .sort({ effectiveAt: 1 })
      .limit(cap);
  },

  /**
   * Marca el aviso como aplicado en la pasarela. Atómico y de una sola vez, y
   * **solo si el mail salió**: sin `emailSentAt` devuelve null aunque el
   * servicio se equivoque (no hay cobro nuevo sin aviso). También null si ya
   * estaba aplicado o descartado.
   * @param {string} noticeId
   */
  async markPriceChangeApplied(noticeId) {
    const now = new Date();
    if (isFileMode()) {
      return fileDb.updatePriceChangeNoticeIf(
        noticeId,
        (row) => !!row.emailSentAt && !row.appliedAt && !row.skippedAt,
        (row) => {
          row.appliedAt = now.toISOString();
        },
      );
    }
    return MongoNotice.findOneAndUpdate(
      { _id: noticeId, emailSentAt: { $ne: null }, appliedAt: null, skippedAt: null },
      { $set: { appliedAt: now } },
      { new: true },
    );
  },
  /**
   * Descarta un aviso que ya no corresponde (se dio de baja, cambió de plan,
   * ya paga el precio nuevo…). Una sola vez, y no si ya se aplicó.
   * @param {string} noticeId
   * @param {string} reason
   */
  async skipPriceChangeNotice(noticeId, reason) {
    const now = new Date();
    const skipReason = String(reason || "").slice(0, 200);
    if (isFileMode()) {
      return fileDb.updatePriceChangeNoticeIf(
        noticeId,
        (row) => !row.appliedAt && !row.skippedAt,
        (row) => {
          row.skippedAt = now.toISOString();
          row.skipReason = skipReason;
        },
      );
    }
    return MongoNotice.findOneAndUpdate(
      { _id: noticeId, appliedAt: null, skippedAt: null },
      { $set: { skippedAt: now, skipReason } },
      { new: true },
    );
  },
};
