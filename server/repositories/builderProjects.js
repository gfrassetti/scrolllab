import { BuilderProject as MongoBuilderProject } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Proyectos del builder: composiciones guardadas en la cuenta (borradores que
 * se retoman). Cada método elige el almacén (archivos o Mongo) y devuelve lo
 * mismo en los dos; server/db.js los compone en el facade `db`.
 */
export const builderProjectsRepo = {
  async createBuilderProject(data) {
    if (isFileMode()) return fileDb.createBuilderProject(data);
    return MongoBuilderProject.create(data);
  },
  async findBuilderProjectById(id) {
    if (isFileMode()) return fileDb.findBuilderProjectById(id);
    return MongoBuilderProject.findById(id);
  },
  async findBuilderProjectsByUser(userId) {
    if (isFileMode()) return fileDb.findBuilderProjectsByUser(userId);
    return MongoBuilderProject.find({ userId }).sort({ updatedAt: -1 });
  },
  async deleteBuilderProject(id) {
    if (isFileMode()) return fileDb.deleteBuilderProject(id);
    const res = await MongoBuilderProject.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
};
