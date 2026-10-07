import {
  Refund as MongoRefund,
  Withdrawal as MongoWithdrawal,
  Subscription as MongoSubscription,
} from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Libro de reembolsos (una fila por pago o ajuste devuelto, con quién y cuánto)
 * y los listados que usa el panel local (/admin) para la plata que todavía no
 * se toca. Cada método elige el almacén; server/db.js los compone en `db`.
 */
export const refundsRepo = {
  /**
   * Alta o actualización por `externalId` (el pago de MP o el ajuste de Paddle):
   * un webhook repetido no duplica, y un parcial que después se completa queda
   * en la misma fila con el monto acumulado.
   */
  async recordRefund(data) {
    if (isFileMode()) return fileDb.recordRefund(data);
    return MongoRefund.findOneAndUpdate(
      { externalId: data.externalId },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },
  async listRefunds() {
    if (isFileMode()) return fileDb.listRefunds();
    return MongoRefund.find({}).sort({ refundedAt: -1 }).limit(500).lean();
  },
  async listWithdrawals() {
    if (isFileMode()) return fileDb.listWithdrawals();
    return MongoWithdrawal.find({}).sort({ createdAt: -1 }).limit(200).lean();
  },
  async listSubscriptions() {
    if (isFileMode()) return fileDb.listSubscriptions();
    return MongoSubscription.find({}).lean();
  },
};
