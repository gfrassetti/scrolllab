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
  /** El pedido más reciente del mismo mail y orden desde `since` (un doble click no abre dos). */
  async findRecentWithdrawal({ email, orderId, since }) {
    if (isFileMode()) return fileDb.findRecentWithdrawal({ email, orderId, since });
    return MongoWithdrawal.findOne({
      email,
      orderId: orderId || null,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });
  },
};
