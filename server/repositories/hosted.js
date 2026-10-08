import { HostedInstance as MongoHostedInstance } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Instancias de Hosted Component / LAB (docs/hosted-component-plan.md, Fase 3).
 * Cada método elige el almacén (archivos o Mongo) y devuelve lo mismo en los
 * dos; server/db.js los compone en el facade `db`.
 */
export const hostedRepo = {
  // ——— Hosted Component (docs/hosted-component-plan.md, Fase 3) ———
  async createHostedInstance(data) {
    if (isFileMode()) return fileDb.createHostedInstance(data);
    return MongoHostedInstance.create(data);
  },
  async findHostedInstanceById(id) {
    if (isFileMode()) return fileDb.findHostedInstanceById(id);
    return MongoHostedInstance.findById(id);
  },
  async findHostedInstanceByKey(key) {
    if (isFileMode()) return fileDb.findHostedInstanceByKey(key);
    return MongoHostedInstance.findOne({ key: String(key) });
  },
  async findHostedInstancesByUser(userId) {
    if (isFileMode()) return fileDb.findHostedInstancesByUser(userId);
    return MongoHostedInstance.find({ userId }).sort({ createdAt: -1 });
  },
  // Para el embudo de /admin: solo los campos que cuenta, sin props.
  async listHostedInstances() {
    if (isFileMode()) return fileDb.listHostedInstances();
    return MongoHostedInstance.find(
      {},
      { userId: 1, sectionId: 1, status: 1, createdAt: 1, publishedAt: 1, views: 1 },
    ).lean();
  },
  async deleteHostedInstance(id) {
    if (isFileMode()) return fileDb.deleteHostedInstance(id);
    const res = await MongoHostedInstance.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
  async incHostedViews(key) {
    if (isFileMode()) {
      const inst = await fileDb.findHostedInstanceByKey(key);
      if (!inst) return;
      inst.views = (inst.views || 0) + 1;
      await inst.save();
      return;
    }
    await MongoHostedInstance.updateOne(
      { key: String(key) },
      { $inc: { views: 1 } },
    );
  },
  async countPublishedHosted(userId, exceptId) {
    if (isFileMode()) return fileDb.countPublishedHosted(userId, exceptId);
    return MongoHostedInstance.countDocuments({
      userId,
      status: "published",
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    });
  },
  // Publicadas del usuario creadas ANTES que `createdAt` (orden estable para
  // decidir cuáles quedan cubiertas por la cuota cuando el plan cae).
  // Desempate por `_id` cuando el `createdAt` coincide → orden total.
  async countPublishedHostedCreatedBefore(userId, createdAt, exceptId) {
    if (isFileMode())
      return fileDb.countPublishedHostedCreatedBefore(
        userId,
        createdAt,
        exceptId,
      );
    const d = new Date(createdAt);
    return MongoHostedInstance.countDocuments({
      userId,
      status: "published",
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
      $or: [
        { createdAt: { $lt: d } },
        ...(exceptId ? [{ createdAt: d, _id: { $lt: exceptId } }] : []),
      ],
    });
  },
};
