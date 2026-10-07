import { Event as MongoEvent, User as MongoUser, Order as MongoOrder } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Eventos de analítica (clics y vistas) y los listados completos que usa el
 * panel local (/admin): ver server/services/analytics.js.
 */
export const eventsRepo = {
  async addEvents(rows) {
    if (!rows.length) return;
    if (isFileMode()) return fileDb.addEvents(rows);
    await MongoEvent.insertMany(rows, { ordered: false });
  },
  /** @param {{ since?: Date | string | number }} [options] */
  async listEvents({ since } = {}) {
    if (isFileMode()) return fileDb.listEvents({ since });
    return MongoEvent.find(since ? { createdAt: { $gte: new Date(since) } } : {})
      .sort({ createdAt: 1 })
      .limit(200000)
      .lean();
  },
  async listUsers() {
    return isFileMode() ? fileDb.listUsers() : MongoUser.find({}).sort({ createdAt: -1 }).lean();
  },
  async listOrders() {
    return isFileMode() ? fileDb.listOrders() : MongoOrder.find({}).sort({ createdAt: -1 }).lean();
  },
};
