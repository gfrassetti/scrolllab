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
   */
  async markOrderPaidAtomic({ orderId, mpPaymentId }) {
    if (isFileMode()) {
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
    if (isFileMode()) {
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
