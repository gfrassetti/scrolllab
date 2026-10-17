import { LoginLink as MongoLoginLink } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Links de acceso por mail (server/services/emailLogin.js): se guarda el hash
 * del token, nunca el token. Un link sirve una sola vez y vence solo: el
 * repositorio lo canjea de forma atómica (dos clics a la vez no abren dos
 * sesiones).
 */
export const loginLinksRepo = {
  /** @param {{ tokenHash: string, email: string, next?: string | null, locale?: string, expiresAt: Date }} data */
  async createLoginLink(data) {
    if (isFileMode()) return fileDb.createLoginLink(data);
    return MongoLoginLink.create(data);
  },
  /**
   * Lo marca usado si existe, no se usó y no venció; si no, null.
   * @param {string} tokenHash
   * @param {Date} [now]
   */
  async consumeLoginLink(tokenHash, now = new Date(Date.now())) {
    if (isFileMode()) return fileDb.consumeLoginLink(tokenHash, now);
    return MongoLoginLink.findOneAndUpdate(
      { tokenHash: String(tokenHash), usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
      { new: true },
    );
  },
  /** Cuántos links se pidieron para ese mail desde `since` (tope por mail). */
  async countLoginLinksSince(email, since) {
    if (isFileMode()) return fileDb.countLoginLinksSince(email, since);
    return MongoLoginLink.countDocuments({ email: String(email), createdAt: { $gte: since } });
  },
};
