import { User as MongoUser } from "../models.js";
import { fileDb } from "../fileStore.js";
import { isFileMode } from "./mode.js";

/**
 * Usuarios.
 * Cada método elige el almacén (archivos o Mongo) y devuelve lo mismo en los
 * dos; server/db.js los compone en el facade `db`.
 */
export const usersRepo = {
  async findUser(query) {
    return isFileMode() ? fileDb.findUser(query) : MongoUser.findOne(query);
  },
  async findUserById(id) {
    return isFileMode() ? fileDb.findUserById(id) : MongoUser.findById(id);
  },
  async createUser(data) {
    return isFileMode() ? fileDb.createUser(data) : MongoUser.create(data);
  },
  async updateUser(user) {
    if (isFileMode()) return fileDb.updateUser(user);
    return user.save();
  },
};
