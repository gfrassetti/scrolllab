import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, sparse: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar: String,
  },
  { timestamps: true },
);

const orderItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    title: String,
    // unit_price es el cobrado (ARS); unit_price_usd es el precio de lista.
    unit_price: Number,
    unit_price_usd: Number,
    currency_id: { type: String, default: "ARS" },
    // string[] legacy or [{ id, props? }, ...]
    recipe: { type: [mongoose.Schema.Types.Mixed], default: undefined },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    items: [orderItemSchema],
    total: Number,
    // Precio de lista en USD y cotización aplicada al cobrar, para auditar.
    totalUsd: Number,
    fxRate: Number,
    currency_id: { type: String, default: "ARS" },
    mpPreferenceId: String,
    mpPaymentId: { type: String, sparse: true, unique: true },
    downloadCount: { type: Number, default: 0 },
    // Log de descargas (docs/ip-protection-brief.md §3.5): quién bajó qué y
    // cuándo. Acotado a las últimas 50 para no crecer sin techo.
    downloads: {
      type: [
        {
          _id: false,
          at: { type: Date, default: Date.now },
          ip: String,
        },
      ],
      default: [],
    },
    // Solo en las pendientes: índice TTL para que Mongo limpie los checkouts
    // abandonados. Se borra al pagar (ver db.markOrderPaidAtomic).
    expiresAt: { type: Date, index: { expires: 0 } },
    zipPath: String,
    receiptEmailSendingAt: Date,
    receiptEmailSentAt: Date,
    receiptEmailId: String,
    receiptEmailError: String,
  },
  { timestamps: true },
);

/**
 * Instancia de Hosted Component: una sección configurada por un usuario que se
 * sirve por `<script>` en un sitio ajeno. Ver docs/hosted-component-plan.md.
 * `draftProps` es lo que se edita; `publishedProps` lo que ve el embed público.
 */
const hostedInstanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: { type: String, required: true, unique: true, index: true },
    sectionId: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "published", "suspended"],
      default: "draft",
      index: true,
    },
    // Allowlist de dominios (domain-lock). Vacío = sin restricción.
    domains: { type: [String], default: [] },
    draftProps: { type: mongoose.Schema.Types.Mixed, default: undefined },
    publishedProps: { type: mongoose.Schema.Types.Mixed, default: undefined },
    publishedAt: Date,
    // Señal de uso / abuso. Cuenta hits al endpoint público de config (con
    // el cache de 30s el número es aproximado, alcanza para eso).
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/**
 * Suscripción de Hosted Component (LAB) — MercadoPago PreApproval.
 * Una activa por usuario (la más nueva `authorized`). Ver
 * docs/hosted-component-plan.md Fase 4.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: { type: String, required: true }, // 'hosted_starter' | 'hosted_pro' | 'hosted_studio'
    cycle: { type: String, enum: ["monthly", "yearly"], required: true },
    status: {
      type: String,
      enum: ["pending", "authorized", "paused", "cancelled"],
      default: "pending",
      index: true,
    },
    currentPeriodEnd: Date,
    // Cancelada por el usuario: sigue `authorized` (con acceso) hasta
    // `currentPeriodEnd`; no renueva. `resolveEntitlement` la cierra al vencer.
    canceledAt: Date,
    mpPreapprovalId: { type: String, sparse: true },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
export const HostedInstance =
  mongoose.models.HostedInstance ||
  mongoose.model("HostedInstance", hostedInstanceSchema);
export const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
