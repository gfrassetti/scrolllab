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
      // refunded: MP devolvió el pago o hubo contracargo; ya no se descarga.
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    items: [orderItemSchema],
    total: Number,
    // Precio de lista en USD y cotización aplicada al cobrar, para auditar.
    totalUsd: Number,
    fxRate: Number,
    // Cupón de bienvenida: `total` y los `unit_price` ya vienen descontados.
    couponCode: String,
    discountPct: Number,
    currency_id: { type: String, default: "ARS" },
    // Pasarela que cobra la orden: Mercado Pago (ARS) o Paddle (USD, ver
    // docs/paddle.md). En Paddle `total` y los `unit_price` están en USD.
    provider: {
      type: String,
      enum: ["mercadopago", "paddle"],
      default: "mercadopago",
    },
    // Idioma de los mails de la orden (el del sitio al comprar).
    locale: { type: String, enum: ["es", "en"], default: "es" },
    mpPreferenceId: String,
    // Cuándo se cobró: desde acá corre el plazo de reembolso (lib/site REFUND_DAYS).
    paidAt: Date,
    mpPaymentId: { type: String, sparse: true, unique: true },
    // Transacción de Paddle que armamos al abrir el checkout: solo esa la paga.
    paddleTransactionId: { type: String, sparse: true, unique: true },
    // Último pago rechazado (la orden sigue pending: se puede reintentar).
    paymentFailedAt: Date,
    // Mail «pago rechazado»: uno por orden, mismo claim que el recibo.
    failedEmailSendingAt: Date,
    failedEmailSentAt: Date,
    failedEmailId: String,
    failedEmailError: String,
    refundedAt: Date,
    // Estado del pago en MP que la dio vuelta: refunded | charged_back.
    refundReason: String,
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
    // Versión del empaquetador con que se armó (PACK_VERSION): si cambió, el
    // ZIP se rearma en la próxima descarga. La licencia conserva su fecha.
    zipVersion: Number,
    licenseDate: String,
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
    // Hasta cuándo está pago (o, en la prueba, hasta el primer cobro). Solo lo
    // extiende un cobro aprobado; pasada esta fecha corre la gracia
    // (`HOSTED_GRACE_DAYS`) y después `resolveEntitlement` baja a free.
    currentPeriodEnd: Date,
    // Prueba gratis (primera suscripción del usuario): MP autoriza la tarjeta
    // y no cobra hasta esta fecha. Durante la prueba `status` es `authorized`
    // y `currentPeriodEnd` = `trialEndsAt`, así que la entitlement es plena.
    trialEndsAt: Date,
    // Cuándo hace MP el primer cobro (`auto_recurring.start_date`): el fin de
    // la prueba, o el fin de lo ya pagado al re-suscribirse tras una baja.
    firstChargeAt: Date,
    // Cancelada: sigue con acceso hasta `currentPeriodEnd`; no renueva.
    // `resolveEntitlement` la cierra al vencer.
    canceledAt: Date,
    // Primera vez que llegó a `authorized` (la prueba se pierde con esto).
    activatedAt: Date,
    // Alta que nunca se completó y se dio de baja en MP (no quema la prueba).
    abandonedAt: Date,
    lastPaidAt: Date,
    // Primer cobro de período: el único que se puede devolver (src/domain/policy.js).
    firstPaidAt: Date,
    // Con qué plan y ciclo está pago el período en curso (cobro de MP, o la
    // diferencia al subir). Base para cotizar la próxima subida; bajar de plan
    // no lo cambia. En una re-suscripción arranca con lo de la vieja.
    paidPlan: String,
    paidCycle: { type: String, enum: ["monthly", "yearly"] },
    // Subida de plan esperando el pago de la diferencia (checkout abierto).
    pendingUpgrade: {
      plan: String,
      amount: Number,
      reference: String,
      preferenceId: String,
      initPoint: String,
      expiresAt: Date,
      createdAt: Date,
    },
    // Pagos de diferencia ya procesados (idempotencia). `outcome: refund` =
    // llegó pero no se pudo aplicar: devolver a mano.
    upgradePayments: {
      type: [
        {
          _id: false,
          paymentId: String,
          plan: String,
          amount: Number,
          at: Date,
          outcome: String,
        },
      ],
      default: undefined,
    },
    // MP / Paddle no pudo cobrar la cuota del ciclo (reintenta); lo limpia un cobro OK.
    paymentFailedAt: Date,
    mpPreapprovalId: { type: String, sparse: true },
    // Pasarela de la suscripción. Paddle cobra en USD (docs/paddle.md).
    provider: {
      type: String,
      enum: ["mercadopago", "paddle"],
      default: "mercadopago",
    },
    currency_id: { type: String, default: "ARS" },
    locale: { type: String, enum: ["es", "en"], default: "es" },
    // Transacción del alta (checkout) y suscripción que Paddle crea al pagarla.
    paddleTransactionId: { type: String, sparse: true },
    paddleSubscriptionId: { type: String, sparse: true, index: true },
    paddleCustomerId: String,
    // Mails de suscripción (una vez cada uno). Mismo patrón claim/complete/
    // release que el recibo de orden. `welcome` al pasar a `authorized`,
    // `canceled` al setear `canceledAt`, `trialReminder` unos días antes del
    // primer cobro (server/services/trialReminders.js).
    welcomeEmailSendingAt: Date,
    welcomeEmailSentAt: Date,
    welcomeEmailId: String,
    welcomeEmailError: String,
    canceledEmailSendingAt: Date,
    canceledEmailSentAt: Date,
    canceledEmailId: String,
    canceledEmailError: String,
    trialReminderEmailSendingAt: Date,
    trialReminderEmailSentAt: Date,
    trialReminderEmailId: String,
    trialReminderEmailError: String,
    // Mails por evento (uno por cobro): `Ref` es el cobro del último mail
    // reclamado o enviado (authorized_payment de MP / transacción de Paddle).
    chargeEmailRef: String,
    chargeEmailSendingAt: Date,
    chargeEmailSentAt: Date,
    chargeEmailId: String,
    chargeEmailError: String,
    paymentFailedEmailRef: String,
    paymentFailedEmailSendingAt: Date,
    paymentFailedEmailSentAt: Date,
    paymentFailedEmailId: String,
    paymentFailedEmailError: String,
  },
  { timestamps: true },
);

/**
 * Lead: el mail que recibió el cupón de bienvenida. Hoy sale de quien entra con
 * su cuenta de Google y todavía no compró (`source: "account"`); los primeros
 * salieron de un formulario de la home (`source: "home"`), que ya no existe.
 * Se guarda siempre acá; el CRM (Brevo, opcional) es una copia que se sincroniza
 * a mano con `npm run leads:sync` (`crmSyncedAt` / `crmError`). Ver server/services/crm.js.
 */
const leadSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // De dónde salió el cupón (account, o home en los primeros). Sale en el CSV.
    source: { type: String, default: "home" },
    // Canal de la primera visita (utm_* del link): mide qué trae mails.
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    locale: { type: String, enum: ["es", "en"], default: "es" },
    // Cuándo se le dio el cupón (y se le mandó el mail). No hay newsletters.
    consentAt: { type: Date, default: Date.now },
    crmSyncedAt: Date,
    crmError: String,
    // Cupón de bienvenida (uno por mail). Se canjea cuando se paga la orden.
    couponCode: { type: String, unique: true, sparse: true },
    couponPercent: Number,
    couponExpiresAt: Date,
    couponRedeemedAt: Date,
    couponOrderId: String,
  },
  { timestamps: true },
);

/**
 * Evento de analítica propia (clics y vistas): ver server/services/analytics.js.
 * Anónimo a propósito: un id de visitante random, sin IP ni mail. Se borra solo
 * a los 400 días (índice TTL).
 */
const eventSchema = new mongoose.Schema(
  {
    vid: { type: String, required: true },
    type: { type: String, enum: ["click", "view"], required: true },
    path: { type: String, required: true },
    sku: { type: String, default: "" },
    label: { type: String, default: "" },
    tag: { type: String, default: "" },
    href: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: { expires: 400 * 86400 } },
  },
  { versionKey: false },
);

/**
 * Los modelos se exportan con `mongoose.models.X || mongoose.model(...)` (para
 * no registrarlos dos veces en tests / recargas): esa expresión es una unión
 * que TypeScript no deja llamar. Se tipan como `Model<any>`; los documentos
 * son los de los esquemas de arriba.
 * @typedef {import('mongoose').Model<any>} AnyModel
 */

/** @type {AnyModel} */
export const User = mongoose.models.User || mongoose.model("User", userSchema);
/** @type {AnyModel} */
export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
/** @type {AnyModel} */
export const HostedInstance =
  mongoose.models.HostedInstance ||
  mongoose.model("HostedInstance", hostedInstanceSchema);
/** @type {AnyModel} */
export const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
/**
 * Solicitud del botón de arrepentimiento (Resolución 424/2020): pedido público,
 * sin cuenta, con su código de seguimiento. `orderId` es la orden asociada por
 * mail + número (si se encontró); `eligibility` es la foto del reembolso al
 * momento del pedido, para que el dueño decida rápido.
 */
const withdrawalSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true },
    orderRef: String,
    orderId: { type: String, default: null },
    message: String,
    locale: { type: String, enum: ["es", "en"], default: "es" },
    eligibility: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ["received", "resolved"], default: "received" },
  },
  { timestamps: true },
);

/**
 * Libro de reembolsos: una fila por pago de MP o ajuste de Paddle devuelto (o
 * contracargo), con quién y cuánto. Lo escriben los webhooks; lo lee el panel.
 */
const refundSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    provider: { type: String, enum: ["mercadopago", "paddle"], required: true },
    kind: { type: String, enum: ["order", "lab"], required: true },
    orderId: { type: String, default: null },
    subscriptionId: { type: String, default: null },
    userId: { type: String, default: null },
    email: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    partial: { type: Boolean, default: false },
    reason: { type: String, default: "refunded" },
    refundedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

/** @type {AnyModel} */
export const Refund = mongoose.models.Refund || mongoose.model("Refund", refundSchema);

/** @type {AnyModel} */
export const Withdrawal =
  mongoose.models.Withdrawal || mongoose.model("Withdrawal", withdrawalSchema);
/** @type {AnyModel} */
export const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
/** @type {AnyModel} */
export const Event =
  mongoose.models.Event || mongoose.model("Event", eventSchema);
