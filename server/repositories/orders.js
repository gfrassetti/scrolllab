import { Order as MongoOrder } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Órdenes: alta, consulta, transiciones atómicas de pago / reembolso / descarga y el claim idempotente del mail de recibo.
 * Cada método elige el almacén (archivos o Mongo) y devuelve lo mismo en los
 * dos; server/db.js los compone en el facade `db`.
 */
export const ordersRepo = {
  async createOrder(data) {
    if (isFileMode()) return fileDb.createOrder(data);
    return MongoOrder.create(data);
  },
  async findOrderById(id) {
    return isFileMode() ? fileDb.findOrderById(id) : MongoOrder.findById(id);
  },
  async findOrderByPaddleTransaction(transactionId) {
    return isFileMode()
      ? fileDb.findOrderByPaddleTransaction(transactionId)
      : MongoOrder.findOne({ paddleTransactionId: String(transactionId) });
  },
  /** Borra una orden que nunca llegó a cobrarse (el checkout no se pudo abrir). */
  async deletePendingOrder(orderId) {
    if (isFileMode()) return fileDb.deletePendingOrder(orderId);
    const res = await MongoOrder.deleteOne({ _id: orderId, status: "pending" });
    return res.deletedCount > 0;
  },
  async findOrdersByUser(userId) {
    return isFileMode()
      ? fileDb.findOrdersByUser(userId)
      : MongoOrder.find({ userId }).sort({ createdAt: -1 });
  },
  /**
   * @param {string} orderId
   * @param {string} zipPath
   * @param {{ zipVersion?: number, licenseDate?: string }} [options]
   */
  async setOrderZipPath(orderId, zipPath, { zipVersion, licenseDate } = {}) {
    const fields = { zipPath };
    if (zipVersion !== undefined) fields.zipVersion = zipVersion;
    if (licenseDate) fields.licenseDate = licenseDate;
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      Object.assign(order, fields);
      await order.save();
      return order;
    }
    return MongoOrder.findByIdAndUpdate(
      orderId,
      { $set: fields },
      { new: true },
    );
  },
  /**
   * Transición pending→paid atómica. Si ya está paga con el mismo paymentId, ok.
   * Mercado Pago pasa `mpPaymentId` (queda guardado); Paddle pasa
   * `paddleTransactionId`, que la orden ya tiene desde el checkout: solo esa
   * transacción la paga.
   * @param {{ orderId: string, mpPaymentId?: string, paddleTransactionId?: string }} args
   */
  async markOrderPaidAtomic({ orderId, mpPaymentId, paddleTransactionId }) {
    const paddle = paddleTransactionId != null;
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return { order: null, created: false };
      if (order.status === "paid") {
        return { order, created: false };
      }
      if (paddle && order.paddleTransactionId !== String(paddleTransactionId)) {
        return { order, created: false };
      }
      order.status = "paid";
      order.paidAt = new Date().toISOString();
      if (!paddle) order.mpPaymentId = String(mpPaymentId);
      delete order.expiresAt;
      await order.save();
      return { order, created: true };
    }

    const paidBy = paddle
      ? { paddleTransactionId: String(paddleTransactionId) }
      : { mpPaymentId: String(mpPaymentId) };
    const existing = await MongoOrder.findOne({ ...paidBy, status: "paid" });
    if (existing) {
      return { order: existing, created: false };
    }

    const updated = await MongoOrder.findOneAndUpdate(
      { _id: orderId, status: "pending", ...(paddle ? paidBy : {}) },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          ...(paddle ? {} : paidBy),
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
   * @param {{ orderId: string, mpPaymentId?: string, paddleTransactionId?: string, reason: string }} args
   */
  async markOrderRefundedAtomic({ orderId, mpPaymentId, paddleTransactionId, reason }) {
    const at = new Date();
    const paidBy =
      paddleTransactionId != null
        ? { paddleTransactionId: String(paddleTransactionId) }
        : { mpPaymentId: String(mpPaymentId) };
    const [field, value] = Object.entries(paidBy)[0];
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      if (order.status !== "paid" || order[field] !== value) {
        return null;
      }
      order.status = "refunded";
      order.refundedAt = at.toISOString();
      order.refundReason = reason;
      await order.save();
      return order;
    }
    return MongoOrder.findOneAndUpdate(
      { _id: orderId, status: "paid", ...paidBy },
      { $set: { status: "refunded", refundedAt: at, refundReason: reason } },
      { new: true },
    );
  },
  // maxDownloads 0 = sin tope: el contador se sigue llevando, pero no frena.
  // `meta` ({ ip }) alimenta el log de descargas (ip-protection-brief §3.5).
  async consumeDownloadAtomic(orderId, maxDownloads, meta = {}) {
    const capped = Number(maxDownloads) > 0;
    const entry = { at: new Date(), ip: meta.ip ? String(meta.ip) : undefined };
    if (isFileMode()) {
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

    if (isFileMode()) {
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
    if (isFileMode()) {
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
  /**
   * Mail «pago rechazado»: uno por orden y solo mientras sigue pendiente (si
   * después se pagó, no se manda). Mismo claim/complete/release que el recibo.
   */
  async claimFailedEmail(orderId) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order || order.status !== "pending" || order.failedEmailSentAt) {
        return null;
      }
      if (
        order.failedEmailSendingAt &&
        new Date(order.failedEmailSendingAt) >= staleBefore
      ) {
        return null;
      }
      order.failedEmailSendingAt = now.toISOString();
      delete order.failedEmailError;
      await order.save();
      return order;
    }
    return MongoOrder.findOneAndUpdate(
      {
        _id: orderId,
        status: "pending",
        failedEmailSentAt: null,
        $or: [
          { failedEmailSendingAt: null },
          { failedEmailSendingAt: { $lt: staleBefore } },
        ],
      },
      {
        $set: { failedEmailSendingAt: now },
        $unset: { failedEmailError: 1 },
      },
      { new: true },
    );
  },
  async completeFailedEmail(orderId, emailId) {
    const now = new Date();
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      order.failedEmailSentAt = now.toISOString();
      order.failedEmailId = emailId;
      delete order.failedEmailSendingAt;
      delete order.failedEmailError;
      await order.save();
      return order;
    }
    return MongoOrder.findByIdAndUpdate(
      orderId,
      {
        $set: { failedEmailSentAt: now, failedEmailId: emailId },
        $unset: { failedEmailSendingAt: 1, failedEmailError: 1 },
      },
      { new: true },
    );
  },
  async releaseFailedEmail(orderId, message) {
    const safeMessage = String(message || "Error de email").slice(0, 500);
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order) return null;
      order.failedEmailError = safeMessage;
      delete order.failedEmailSendingAt;
      await order.save();
      return order;
    }
    return MongoOrder.findByIdAndUpdate(
      orderId,
      {
        $set: { failedEmailError: safeMessage },
        $unset: { failedEmailSendingAt: 1 },
      },
      { new: true },
    );
  },
  /**
   * Órdenes con un pago rechazado hace más de un rato (`before`) que siguen sin
   * pagarse y sin mail: las que el barrido de rechazos avisa.
   * @param {{ before: Date }} args
   */
  async listFailedOrdersDue({ before }) {
    if (isFileMode()) {
      return fileDb.listFailedOrdersDue({ before });
    }
    return MongoOrder.find({
      status: "pending",
      paymentFailedAt: { $ne: null, $lte: before },
      failedEmailSentAt: null,
    }).limit(200);
  },
  /** Marca el último rechazo de una orden pendiente (la UI / soporte lo ven). */
  async markOrderPaymentFailed(orderId) {
    const at = new Date();
    if (isFileMode()) {
      const order = await fileDb.findOrderById(orderId);
      if (!order || order.status !== "pending") return null;
      order.paymentFailedAt = at.toISOString();
      await order.save();
      return order;
    }
    return MongoOrder.findOneAndUpdate(
      { _id: orderId, status: "pending" },
      { $set: { paymentFailedAt: at } },
      { new: true },
    );
  },
  async releaseReceiptEmail(orderId, message) {
    const safeMessage = String(message || "Error de email").slice(0, 500);
    if (isFileMode()) {
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
};
