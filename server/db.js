import mongoose from "mongoose";
import { getMode, setMode } from "./repositories/mode.js";
import { usersRepo } from "./repositories/users.js";
import { leadsRepo } from "./repositories/leads.js";
import { ordersRepo } from "./repositories/orders.js";
import { hostedRepo } from "./repositories/hosted.js";
import { subscriptionsRepo } from "./repositories/subscriptions.js";
import { withdrawalsRepo } from "./repositories/withdrawals.js";
import { refundsRepo } from "./repositories/refunds.js";
import { eventsRepo } from "./repositories/events.js";

/**
 * Conecta a Mongo o usa file store.
 * En producción (o si STORE no es file) falla si Mongo no responde.
 */
export async function connectDb(config) {
  const wantFile = (config?.store || process.env.STORE) === "file";
  if (wantFile) {
    if (config?.isProd) {
      throw new Error("STORE=file no está permitido en producción");
    }
    setMode("file");
    console.log("STORE=file — using storage/db JSON");
    return getMode();
  }

  const uri =
    config?.mongoUri ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/scrolllab";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected");
    setMode("mongo");
    return getMode();
  } catch (err) {
    if (config?.isProd || process.env.NODE_ENV === "production") {
      throw new Error(`MongoDB requerido en producción: ${err.message}`);
    }
    console.warn(
      `MongoDB no disponible (${err.message}). Usando STORE=file para desarrollo local.` +
        " (Poné STORE=file en .env para silenciar este aviso.)",
    );
    setMode("file");
    // Mantener config alineada con el store efectivo (session, logs, health).
    if (config && typeof config === "object") config.store = "file";
    return getMode();
  }
}

export function storeMode() {
  return getMode();
}

function uid(user) {
  return user?.id || user?._id?.toString();
}

/**
 * Facade de persistencia: la conexión y el ciclo de vida viven acá; las
 * operaciones por entidad, en server/repositories/*. Los imports de `db`
 * (servicios, rutas, tests) no cambian.
 */
export const db = {
  uid,
  ...usersRepo,
  ...leadsRepo,
  ...ordersRepo,
  ...hostedRepo,
  ...subscriptionsRepo,
  ...withdrawalsRepo,
  ...refundsRepo,
  ...eventsRepo,

  async isReady() {
    if (getMode() === "file") return true;
    return mongoose.connection.readyState === 1;
  },
  async disconnect() {
    if (getMode() === "mongo" && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  },
};
