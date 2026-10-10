import { HostedPack as MongoHostedPack } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Packs de LAB: varias instancias bajo un solo `<script data-pack>`. Cada
 * método elige el almacén (archivos o Mongo) y devuelve lo mismo en los dos;
 * server/db.js los compone en el facade `db`.
 */
export const hostedPacksRepo = {
  async createHostedPack(data) {
    if (isFileMode()) return fileDb.createHostedPack(data);
    return MongoHostedPack.create(data);
  },
  async findHostedPackById(id) {
    if (isFileMode()) return fileDb.findHostedPackById(id);
    return MongoHostedPack.findById(id);
  },
  async findHostedPackByKey(key) {
    if (isFileMode()) return fileDb.findHostedPackByKey(key);
    return MongoHostedPack.findOne({ key: String(key) });
  },
  async findHostedPacksByUser(userId) {
    if (isFileMode()) return fileDb.findHostedPacksByUser(userId);
    return MongoHostedPack.find({ userId }).sort({ createdAt: -1 });
  },
  async deleteHostedPack(id) {
    if (isFileMode()) return fileDb.deleteHostedPack(id);
    const res = await MongoHostedPack.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
  // Al borrar una instancia, sale de los packs de su dueño (si no, el pack
  // guarda un id muerto que el endpoint público igual saltea).
  async removeInstanceFromPacks(userId, instanceId) {
    if (isFileMode()) return fileDb.removeInstanceFromPacks(userId, instanceId);
    await MongoHostedPack.updateMany(
      { userId, items: String(instanceId) },
      { $pull: { items: String(instanceId) } },
    );
  },
};
