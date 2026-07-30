import mongoose from "mongoose";
import { User as MongoUser, Order as MongoOrder } from "./models.js";
import { fileDb } from "./fileStore.js";

let mode = process.env.STORE === "file" ? "file" : "mongo";

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
    // Solo fallback silencioso si el caller eligió mongo local y falló:
    // ahora NO hacemos fallback — hay que poner STORE=file explícito.
    throw new Error(
      `MongoDB no disponible (${err.message}). Usá STORE=file para desarrollo local sin Mongo.`,
    );
  }
}

export function storeMode() {
  return mode;
}

function uid(user) {
  return user?.id || user?._id?.toString();
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
      },
      { new: true },
    );
    if (updated) return { order: updated, created: true };

    const current = await MongoOrder.findById(orderId);
    return { order: current, created: false };
  },
  async consumeDownloadAtomic(orderId, maxDownloads) {
    if (mode === "file") {
      const order = await fileDb.findOrderById(orderId);
      if (!order || order.status !== "paid") return null;
      if ((order.downloadCount || 0) >= maxDownloads) return null;
      order.downloadCount = (order.downloadCount || 0) + 1;
      await order.save();
      return order;
    }
    return MongoOrder.findOneAndUpdate(
      {
        _id: orderId,
        status: "paid",
        downloadCount: { $lt: maxDownloads },
      },
      { $inc: { downloadCount: 1 } },
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
