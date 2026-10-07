import { summarizeLeads } from "./leadStats.js";

/**
 * Analítica propia (first-party): clics y vistas del sitio, sin cookies de
 * terceros y sin datos personales. Cada evento lleva un id de visitante
 * anónimo (random, vive en el navegador de quien visita) para contar
 * visitantes únicos; no se guarda IP, mail ni nada que identifique a alguien.
 *
 * `sanitizeEvents` valida lo que llega del navegador (nunca confiar en él);
 * `buildDashboard` arma el resumen para el panel local (/admin).
 */

const MAX_BATCH = 25;
const TYPES = new Set(["click", "view"]);

const str = (v, max) => {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
};

// Solo el path: sin origen, sin query ni hash (pueden traer tokens).
const cleanPath = (v) => {
  const s = str(v, 200);
  if (!s.startsWith("/")) return "";
  return s.split(/[?#]/)[0];
};

const cleanSku = (v) => {
  const s = str(v, 40).toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(s) ? s : "";
};

export function sanitizeEvents(body, now = new Date()) {
  const list = Array.isArray(body?.events)
    ? body.events.slice(0, MAX_BATCH)
    : [];
  const vid = str(body?.vid, 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(vid)) return [];
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const type = TYPES.has(raw.type) ? raw.type : null;
    const path = cleanPath(raw.path);
    if (!type || !path) continue;
    out.push({
      vid,
      type,
      path,
      sku: cleanSku(raw.sku),
      label: type === "click" ? str(raw.label, 80) : "",
      tag: type === "click" ? str(raw.tag, 12).toLowerCase() : "",
      href: type === "click" ? str(raw.href, 200).split(/[?#]/)[0] : "",
      createdAt: now.toISOString(),
    });
  }
  return out;
}

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function lastDays(n, now) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    days.push(dayKey(new Date(now.getTime() - i * 86400000)));
  }
  return days;
}

const top = (counts, limit) =>
  [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);

export function buildDashboard({
  events = [],
  users = [],
  orders = [],
  leads = [],
  days = 30,
  now = new Date(),
  store = "file",
  dbHost = "",
}) {
  const span = lastDays(days, now);
  const since = new Date(`${span[0]}T00:00:00.000Z`).getTime();

  // — Eventos —
  const inWindow = events.filter(
    (e) => new Date(e.createdAt).getTime() >= since,
  );
  const clicks = inWindow.filter((e) => e.type === "click");
  const views = inWindow.filter((e) => e.type === "view");

  const perDay = new Map(span.map((d) => [d, { day: d, clicks: 0, views: 0 }]));
  for (const e of inWindow) {
    const row = perDay.get(dayKey(e.createdAt));
    if (row) row[e.type === "click" ? "clicks" : "views"] += 1;
  }

  const bySku = new Map();
  const skuRow = (sku) => {
    if (!bySku.has(sku)) {
      bySku.set(sku, {
        sku,
        views: 0,
        clicks: 0,
        visitors: new Set(),
        labels: new Map(),
        paid: 0,
      });
    }
    return bySku.get(sku);
  };
  for (const e of inWindow) {
    const sku = e.sku || "(sitio)";
    const row = skuRow(sku);
    row.visitors.add(e.vid);
    if (e.type === "view") row.views += 1;
    else {
      row.clicks += 1;
      const label = e.label || e.href || "(sin texto)";
      row.labels.set(label, (row.labels.get(label) || 0) + 1);
    }
  }

  const paidOrders = orders.filter((o) => o.status === "paid");
  for (const order of paidOrders) {
    for (const item of order.items || []) {
      if (item?.sku && bySku.has(item.sku)) bySku.get(item.sku).paid += 1;
    }
  }

  const byTemplate = [...bySku.values()]
    .map((r) => ({
      sku: r.sku,
      views: r.views,
      clicks: r.clicks,
      visitors: r.visitors.size,
      paid: r.paid,
      topLabels: top(r.labels, 6),
    }))
    .sort(
      (a, b) =>
        b.clicks - a.clicks || b.views - a.views || a.sku.localeCompare(b.sku),
    );

  const labelCounts = new Map();
  for (const e of clicks) {
    const key = `${e.sku || "(sitio)"} · ${e.label || e.href || "(sin texto)"}`;
    labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
  }

  // — Usuarios —
  const usersPerDay = new Map(span.map((d) => [d, 0]));
  for (const u of users) {
    const k = u.createdAt ? dayKey(u.createdAt) : null;
    if (k && usersPerDay.has(k))
      usersPerDay.set(k, (usersPerDay.get(k) || 0) + 1);
  }
  const newer = (u, n) =>
    u.createdAt &&
    new Date(u.createdAt).getTime() >= now.getTime() - n * 86400000;
  const recentUsers = [...users]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 10)
    .map((u) => ({
      name: u.name || "",
      email: u.email || "",
      createdAt: u.createdAt || null,
    }));

  // — Órdenes —
  const revenue = new Map();
  for (const o of paidOrders) {
    const cur = o.currency_id || "ARS";
    revenue.set(cur, (revenue.get(cur) || 0) + (Number(o.total) || 0));
  }
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 10)
    .map((o) => ({
      status: o.status,
      total: o.total ?? null,
      currency: o.currency_id || "ARS",
      items: (o.items || [])
        .map((i) => i.sku)
        .filter(Boolean)
        // Una receta del builder es un sku larguísimo ("custom:a/b+c/d…"): se resume.
        .map((sku) =>
          sku.startsWith("custom:")
            ? `builder (${sku.split("+").length} secciones)`
            : sku,
        ),
      createdAt: o.createdAt || null,
    }));

  return {
    store,
    dbHost,
    days,
    generatedAt: now.toISOString(),
    totals: {
      clicks: clicks.length,
      views: views.length,
      visitors: new Set(inWindow.map((e) => e.vid)).size,
    },
    byDay: [...perDay.values()],
    byTemplate,
    topClicks: top(labelCounts, 15),
    users: {
      total: users.length,
      last7: users.filter((u) => newer(u, 7)).length,
      last30: users.filter((u) => newer(u, 30)).length,
      byDay: [...usersPerDay.entries()].map(([day, count]) => ({ day, count })),
      recent: recentUsers,
    },
    orders: {
      total: orders.length,
      paid: paidOrders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      revenue: [...revenue.entries()].map(([currency, total]) => ({
        currency,
        total,
      })),
      recent: recentOrders,
    },
    leads: summarizeLeads(leads),
  };
}
