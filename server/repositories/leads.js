import { Lead as MongoLead } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Leads y cupón de bienvenida (el canje es atómico: gana el primero).
 * Cada método elige el almacén (archivos o Mongo) y devuelve lo mismo en los
 * dos; server/db.js los compone en el facade `db`.
 */
export const leadsRepo = {
  // Alta idempotente de un lead por email: `created` dice si es el primer alta.
  async upsertLead(data) {
    if (isFileMode()) return fileDb.upsertLead(data);
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
    if (isFileMode()) return fileDb.listLeads({ unsyncedOnly });
    return MongoLead.find(unsyncedOnly ? { crmSyncedAt: null } : {}).sort({
      createdAt: 1,
    });
  },
  async findLeadByCoupon(code) {
    if (isFileMode()) return fileDb.findLeadByCoupon(code);
    return MongoLead.findOne({ couponCode: code });
  },
  // Canje atómico: gana el primero; repetir con la misma orden es ok.
  async redeemCoupon({ code, orderId }) {
    if (isFileMode()) return fileDb.redeemCoupon({ code, orderId });
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
};
