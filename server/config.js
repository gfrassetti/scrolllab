import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_CUSTOM_SECTIONS } from "../src/domain/catalog.js";
import { parseQaEmails } from "../src/domain/qa.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const isProd = process.env.NODE_ENV === "production";
const WEAK_SECRETS = new Set([
  "dev-secret",
  "download-secret",
  "change-me-in-production-scrolllab",
  "change-me-in-production-scrolllab-min24",
  "change-me-download-secret",
  "change-me-download-secret-min24chars",
  "dev-scrollypages-session",
  "dev-download-secret",
]);

function bool(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

/** Cómo firma la marca los mails (title case, no SCROLLLAB): lo que ve el cliente en la bandeja. */
export const EMAIL_SENDER_NAME = "Scroll Lab";

/**
 * Remitente con el nombre de la marca, sea cual sea el que traiga EMAIL_FROM
 * («SCROLLLAB <compras@…>» o la dirección sola): la dirección es la del env, el
 * nombre lo pone el código para que no dependa de cómo quedó cargada la variable.
 * @param {string} raw
 */
export function brandedFrom(raw) {
  const value = String(raw || "").trim();
  const address = (/<([^>]+)>/.exec(value)?.[1] || value).trim();
  return `${EMAIL_SENDER_NAME} <${address}>`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function assertStrongSecret(name, value) {
  if (!value || value.length < 24 || WEAK_SECRETS.has(value)) {
    throw new Error(
      `${name} debe ser un secreto fuerte (mín. 24 chars, no default)`,
    );
  }
}

/** ADMIN_TOKEN usable: en producción, solo si es fuerte; si no, apagado (sin tirar el arranque). */
function adminTokenFrom(value) {
  const token = value || "";
  if (isProd && token && (token.length < 24 || WEAK_SECRETS.has(token))) {
    console.error("ADMIN_TOKEN DESACTIVADO: tiene que tener 24 caracteres o más (y no ser de ejemplo).");
    return "";
  }
  return token;
}

function hostOf(url) {
  return new URL(url).hostname;
}

/** Diagnóstico público para /api/ready y logs de boot. */
export function authDiagnostics(config) {
  const clientHost = hostOf(config.clientUrl);
  const apiHost = hostOf(config.apiPublicUrl);
  const callbackHost = hostOf(config.google.callbackUrl);
  const sameOrigin = clientHost === apiHost && callbackHost === clientHost;
  let hint = "";
  if (sameOrigin) {
    hint =
      "Front proxy /api en Vercel. Login OK si GCP redirect usa el mismo host.";
  } else if (callbackHost.includes("railway.app")) {
    hint =
      "Callback en Railway + front en otro dominio: la cookie no llega al browser. " +
      "Usá GOOGLE_CALLBACK_URL con www.scrolllab.com.ar y proxy /api en Vercel.";
  } else {
    hint = "Hosts distintos: hace falta cookie SameSite=None y VITE_API_URL apuntando al API.";
  }
  return {
    clientHost,
    apiHost,
    callbackHost,
    mode: sameOrigin ? "same-origin" : "cross-origin",
    loginLikelyOk: sameOrigin,
    hint,
  };
}

function assertProdAuthHosts(clientUrl, apiPublicUrl, googleCallback) {
  const clientHost = hostOf(clientUrl);
  const apiHost = hostOf(apiPublicUrl);
  const callbackHost = hostOf(googleCallback);

  // Vercel proxy: client === api public, pero callback en Railway = login roto.
  if (clientHost === apiHost && callbackHost !== clientHost) {
    const expected = `${apiPublicUrl.replace(/\/$/, "")}/api/auth/google/callback`;
    throw new Error(
      `GOOGLE_CALLBACK_URL apunta a ${callbackHost} pero CLIENT_URL/API_PUBLIC_URL usan ${clientHost}. ` +
        `Para login con proxy Vercel, poné GOOGLE_CALLBACK_URL=${expected}`,
    );
  }
}

/**
 * Polar (pasarela internacional en USD, ver docs/polar.md). Nunca tira: sin token ni
 * secreto del webhook queda apagado y el resto de la API arranca igual.
 * `POLAR_ENV=sandbox` (por defecto) usa el entorno de prueba: no cobra plata real y,
 * existe solo para las cuentas de QA.
 * En desarrollo el token puede venir como `POLAR_SANDBOX_TOKEN`.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadPolarConfig(env = process.env) {
  const environment = (env.POLAR_ENV || "sandbox").trim().toLowerCase() === "production" ? "production" : "sandbox";
  const accessToken = (
    env.POLAR_ACCESS_TOKEN ||
    (environment === "sandbox" ? env.POLAR_SANDBOX_TOKEN : "") ||
    ""
  ).trim();
  const webhookSecret = (env.POLAR_WEBHOOK_SECRET || "").trim();
  const hidden = env.POLAR_HIDDEN === "true" || env.POLAR_HIDDEN === "1";
  const missing = [!accessToken && "POLAR_ACCESS_TOKEN", !webhookSecret && "POLAR_WEBHOOK_SECRET"].filter(Boolean);
  const apiBase = (
    env.POLAR_API_BASE ||
    (environment === "production" ? "https://api.polar.sh/v1" : "https://sandbox-api.polar.sh/v1")
  ).replace(/\/$/, "");
  return {
    enabled: !hidden && missing.length === 0,
    hidden,
    missing,
    environment,
    testMode: environment === "sandbox",
    accessToken,
    webhookSecret,
    apiBase,
  };
}

/**
 * Parseo y validación central de env.
 * En producción falla el boot si faltan secretos, Mongo o flags inseguros.
 */
export function loadConfig() {
  const storeExplicit = String(process.env.STORE || "").toLowerCase();
  let store;
  if (storeExplicit === "file") store = "file";
  else if (storeExplicit === "mongo") store = "mongo";
  else store = isProd ? "mongo" : "file";
  if (isProd && store === "file") {
    throw new Error("STORE=file no está permitido en producción");
  }

  const authDev = bool("AUTH_DEV_ENABLED", !isProd);
  const mpAccessToken = process.env.MP_ACCESS_TOKEN || "";
  let mpMock = bool("MP_MOCK_ENABLED", !mpAccessToken);

  if (isProd) {
    if (authDev)
      throw new Error("AUTH_DEV_ENABLED no puede estar activo en producción");
    if (mpMock || bool("MP_MOCK_ENABLED", false)) {
      throw new Error("MP_MOCK_ENABLED no puede estar activo en producción");
    }
    mpMock = false;
    requireEnv("MONGODB_URI");
    requireEnv("MP_ACCESS_TOKEN");
    requireEnv("MP_WEBHOOK_SECRET");
    requireEnv("GOOGLE_CLIENT_ID");
    requireEnv("GOOGLE_CLIENT_SECRET");
    requireEnv("GOOGLE_CALLBACK_URL");
    requireEnv("CLIENT_URL");
    requireEnv("API_PUBLIC_URL");
    requireEnv("STORAGE_DIR");
    assertStrongSecret("SESSION_SECRET", process.env.SESSION_SECRET);
    assertStrongSecret("DOWNLOAD_SECRET", process.env.DOWNLOAD_SECRET);

    const clientUrl = requireEnv("CLIENT_URL");
    const apiUrl = requireEnv("API_PUBLIC_URL");
    const googleCallback = requireEnv("GOOGLE_CALLBACK_URL");
    if (!clientUrl.startsWith("https://") || !apiUrl.startsWith("https://")) {
      throw new Error(
        "CLIENT_URL y API_PUBLIC_URL deben ser HTTPS en producción",
      );
    }
    if (!googleCallback.startsWith("https://")) {
      throw new Error("GOOGLE_CALLBACK_URL debe ser HTTPS en producción");
    }
    const expectedCallback = `${apiUrl.replace(/\/$/, "")}/api/auth/google/callback`;
    if (googleCallback.replace(/\/$/, "") !== expectedCallback) {
      throw new Error(
        `GOOGLE_CALLBACK_URL debe ser exactamente ${expectedCallback}`,
      );
    }
    assertProdAuthHosts(clientUrl, apiUrl, googleCallback);
  }

  const sessionSecret =
    process.env.SESSION_SECRET || (isProd ? null : "dev-secret-local-only");
  const downloadSecret =
    process.env.DOWNLOAD_SECRET ||
    (isProd ? null : "download-secret-local-only");

  if (!sessionSecret || !downloadSecret) {
    throw new Error("SESSION_SECRET y DOWNLOAD_SECRET son obligatorios");
  }

  const sameSite = process.env.COOKIE_SAME_SITE || (isProd ? "none" : "lax");
  if (!["lax", "strict", "none"].includes(sameSite)) {
    throw new Error("COOKIE_SAME_SITE inválido (lax|strict|none)");
  }

  // Link firmado efímero (anti-filtración): se regenera en cada click y la
  // compra sigue en Mis compras para siempre, sin tope de re-descargas.
  const downloadTtlDefault = 15 * 60; // 15 minutos
  // 0 / vacío = sin tope. Queda como palanca por si aparece abuso concreto.
  const maxDownloadsRaw = Number(process.env.MAX_DOWNLOADS || 0);
  const maxDownloads =
    Number.isFinite(maxDownloadsRaw) && maxDownloadsRaw > 0
      ? Math.floor(maxDownloadsRaw)
      : 0;
  const downloadTtlRaw = Number(process.env.DOWNLOAD_TTL_SECONDS || 0);
  const downloadTtl =
    Number.isFinite(downloadTtlRaw) && downloadTtlRaw > 0
      ? Math.floor(downloadTtlRaw)
      : downloadTtlDefault;
  // Un TTL largo convierte el link en algo compartible: avisar, no pisar el env.
  if (downloadTtl > 60 * 60) {
    console.warn(
      `DOWNLOAD_TTL_SECONDS=${downloadTtl} deja el link de descarga vivo más de una hora (recomendado: ${downloadTtlDefault})`,
    );
  }

  const polar = loadPolarConfig();

  const emailEnabled = bool("EMAIL_ENABLED", Boolean(process.env.RESEND_API_KEY));
  if (emailEnabled) {
    requireEnv("RESEND_API_KEY");
    requireEnv("EMAIL_FROM");
  }

  return {
    isProd,
    port: Number(process.env.PORT || 8787),
    clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
    apiPublicUrl:
      process.env.API_PUBLIC_URL ||
      `http://localhost:${Number(process.env.PORT || 8787)}`,
    sessionSecret,
    downloadSecret,
    downloadTtl,
    maxDownloads,
    storageDir: path.resolve(
      process.env.STORAGE_DIR || path.join(ROOT, "storage", "orders"),
    ),
    store,
    mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scrolllab",
    authDev: isProd ? false : authDev,
    mpMock: isProd ? false : mpMock,
    mpAccessToken,
    mpWebhookSecret: process.env.MP_WEBHOOK_SECRET || "",
    polar,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        `http://localhost:${Number(process.env.PORT || 8787)}/api/auth/google/callback`,
    },
    email: {
      enabled: emailEnabled,
      apiKey: process.env.RESEND_API_KEY || "",
      from: brandedFrom(process.env.EMAIL_FROM || "onboarding@resend.dev"),
      replyTo: process.env.EMAIL_REPLY_TO || "",
      notifyTo: process.env.EMAIL_NOTIFY_TO || "",
      logoUrl: process.env.EMAIL_LOGO_URL || "",
    },
    // CRM de marketing (Brevo). Sin key no se sincroniza: los leads quedan
    // guardados y `npm run leads:sync` los sube cuando se configure.
    crm: {
      brevoApiKey: process.env.BREVO_API_KEY || "",
      brevoListId: (() => {
        const n = Number(process.env.BREVO_LIST_ID);
        return Number.isInteger(n) && n > 0 ? n : null;
      })(),
    },
    cookie: {
      name: "sp.sid",
      httpOnly: true,
      sameSite,
      secure: isProd || sameSite === "none",
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
    maxCartItems: 5,
    maxRecipeSections: MAX_CUSTOM_SECTIONS,
    // Hosted Component (LAB): origen del CDN que sirve loader/frame y token
    // para suspender/reactivar una instancia (revocación de key).
    embedCdnUrl: (
      process.env.EMBED_CDN_URL || "https://embed.scrolllab.com.ar"
    ).replace(/\/$/, ""),
    // SRI en el snippet (integrity + crossorigin). Requiere que el host del
    // embed mande `Access-Control-Allow-Origin: *` en loader.js. Off por
    // defecto para que ande en cualquier host sin configurar headers; prendelo
    // (`EMBED_SRI=true`) una vez confirmado el CORS.
    embedSri: process.env.EMBED_SRI === "true",
    // Un token corto o de ejemplo en producción no abre nada: queda apagado (y se avisa).
    adminToken: adminTokenFrom(process.env.ADMIN_TOKEN),
    // Cuentas que ven y compran los productos de prueba (src/domain/qa.js).
    qaBuyerEmails: parseQaEmails(process.env.QA_BUYER_EMAILS),
    // Cuántas instancias hosteadas PUBLICADAS puede tener un usuario sin
    // suscripción. Default 1: el plan gratis incluye 1 sección hosteada real.
    // Crear/publicar una 2da → 402. 0 = LAB 100% de pago.
    hostedFreeQuota: (() => {
      const n = Number(process.env.HOSTED_FREE_QUOTA);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
    })(),
    // Días de prueba gratis al abrir la PRIMERA suscripción (una vez por
    // usuario, cualquier plan). 0 = sin prueba. Va a MP como
    // `auto_recurring.start_date` (fecha del primer cobro; verificado en
    // sandbox: MP agenda el cobro ahí y lo registra como `free_trial`).
    hostedTrialDays: (() => {
      const n = Number(process.env.HOSTED_TRIAL_DAYS);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 7;
    })(),
    // Mail de aviso N días antes del primer cobro, a quien está en la prueba
    // (server/services/trialReminders.js). 0 = sin aviso. Si la prueba dura N
    // días o menos no se manda: el mail de bienvenida ya trae la fecha.
    hostedTrialReminderDays: (() => {
      const n = Number(process.env.HOSTED_TRIAL_REMINDER_DAYS);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 2;
    })(),
    // Tolerancia por cobro fallido (no confundir con la prueba gratis): días
    // que el plan sigue cuando una renovación no se cobró (tarjeta rechazada o
    // webhook demorado). Pasados, cae a free; MP sigue reintentando hasta 4
    // veces en 10 días y, si un reintento cobra, el plan vuelve solo. El
    // primer cobro (fin de la prueba) tiene como mucho 1 día. 0 = sin gracia.
    hostedGraceDays: (() => {
      const n = Number(process.env.HOSTED_GRACE_DAYS);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 7;
    })(),
    // Suscripciones (LAB) — MercadoPago PreApproval con monto inline (sin plan
    // pre-creado). Es la misma app de MP que Checkout Pro: si no seteás las env
    // `MP_SUBS_*`, reusa las de Checkout Pro. `MP_SUBS_*` solo si querés una app
    // o un webhook aparte.
    mpSubs: {
      accessToken:
        process.env.MP_SUBS_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "",
      webhookSecret:
        process.env.MP_SUBS_WEBHOOK_SECRET ||
        process.env.MP_WEBHOOK_SECRET ||
        "",
    },
  };
}

export function assertWritableDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, `.write-probe-${process.pid}`);
  fs.writeFileSync(probe, "ok");
  fs.unlinkSync(probe);
}
