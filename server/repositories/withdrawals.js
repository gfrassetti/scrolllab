import { Withdrawal as MongoWithdrawal } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Solicitudes del botón de arrepentimiento (Res. 424/2020): una fila por
 * pedido, con su código de seguimiento. Cada método elige el almacén
 * (archivos o Mongo); server/db.js los compone en el facade `db`.
 */
export const withdrawalsRepo = {
  async createWithdrawal(data) {
    if (isFileMode()) return fileDb.createWithdrawal(data);
    return MongoWithdrawal.create(data);
  },
  /**
   * El pedido más reciente del mismo mail y compra desde `since` (un doble click no abre dos).
   * @param {{ email: string, orderId?: string | null, subscriptionId?: string | null, since: Date }} args
   */
  async findRecentWithdrawal({ email, orderId, subscriptionId = null, since }) {
    if (isFileMode()) return fileDb.findRecentWithdrawal(/** @type {any} */ ({ email, orderId, subscriptionId, since }));
    return MongoWithdrawal.findOne({
      email,
      orderId: orderId || null,
      subscriptionId: subscriptionId || null,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });
  },
  async findWithdrawalByCode(code) {
    if (isFileMode()) return fileDb.findWithdrawalByCode(code);
    return MongoWithdrawal.findOne({ code: String(code) }).lean();
  },
  async updateWithdrawal(code, patch) {
    if (isFileMode()) return fileDb.updateWithdrawal(code, patch);
    return MongoWithdrawal.findOneAndUpdate({ code: String(code) }, { $set: patch }, { new: true }).lean();
  },
  /**
   * Pasa la solicitud de `from` a `to` solo si sigue en `from` (atómico): el
   * link de confirmación tocado dos veces ejecuta una sola devolución.
   */
  async claimWithdrawal(code, from, to) {
    if (isFileMode()) return fileDb.claimWithdrawal(code, from, to);
    return MongoWithdrawal.findOneAndUpdate(
      { code: String(code), status: from },
      { $set: { status: to, confirmedAt: new Date() } },
      { new: true },
    ).lean();
  },
};
