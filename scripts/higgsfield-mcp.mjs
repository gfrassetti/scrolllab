#!/usr/bin/env node
// MCP server (stdio) para la API de Higgsfield — https://api.higgsfield.ai
//
// No hay MCP oficial de Higgsfield, así que este server local habla directo con
// la API y no manda las credenciales a código de terceros. Cero dependencias:
// JSON-RPC crudo sobre stdin/stdout.
//
// Credenciales (env): HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET
// Auth: Authorization: Key <id>:<secret>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api.higgsfield.ai';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS = JSON.parse(fs.readFileSync(path.join(HERE, 'higgsfield-models.json'), 'utf8'));
const TERMINAL = new Set(['completed', 'failed', 'nsfw', 'canceled']);

const KEY_ID = process.env.HIGGSFIELD_API_KEY_ID;
const KEY_SECRET = process.env.HIGGSFIELD_API_KEY_SECRET;

function authHeader() {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error('Faltan HIGGSFIELD_API_KEY_ID / HIGGSFIELD_API_KEY_SECRET en el entorno del MCP server.');
  }
  return `Key ${KEY_ID}:${KEY_SECRET}`;
}

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: authHeader(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const detail = json?.detail ?? json?.raw ?? res.statusText;
    throw new Error(`Higgsfield ${res.status} en ${method} ${endpoint}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mediaUrls(status) {
  const urls = [];
  for (const img of status.images ?? []) if (img?.url) urls.push(img.url);
  for (const aud of status.audios ?? []) if (aud?.url) urls.push(aud.url);
  if (status.video?.url) urls.push(status.video.url);
  if (status.audio?.url) urls.push(status.audio.url);
  return urls;
}

async function pollUntilDone(requestId, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let delay = 2000;
  for (;;) {
    const status = await api('GET', `/requests/${requestId}/status`);
    if (TERMINAL.has(status.status)) return status;
    if (Date.now() >= deadline) {
      return {
        ...status,
        timed_out: true,
        note: `Sigue en "${status.status}" tras ${timeoutSeconds}s. Consultá con higgsfield_status usando request_id.`,
      };
    }
    await sleep(Math.min(delay, Math.max(0, deadline - Date.now())));
    delay = Math.min(delay * 1.4, 15000);
  }
}

// --- tools -----------------------------------------------------------------

const tools = [
  {
    name: 'higgsfield_list_models',
    description:
      'Lista los endpoints de generación de Higgsfield (imagen y video: Soul, Sora 2, Veo 3.1, Kling, Hailuo, Seedance, WAN, Nano Banana, Reve, Flux Kontext, DoP). Pasá "endpoint" para ver el esquema completo de parámetros de uno, o "filter" para buscar por texto.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filtro de texto sobre el path, p.ej. "sora", "image-to-video", "soul".' },
        endpoint: { type: 'string', description: 'Path exacto, p.ej. "/sora-2/text-to-video". Devuelve el esquema de parámetros.' },
      },
    },
  },
  {
    name: 'higgsfield_generate',
    description:
      'Genera imagen o video: envía el request y espera (polling) hasta que termine, devolviendo las URLs del resultado. Usá higgsfield_list_models primero para conocer el endpoint y sus parámetros. Ojo: cada llamada consume créditos de la cuenta.',
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', description: 'Path del modelo, p.ej. "/higgsfield-ai/soul/standard".' },
        input: { type: 'object', description: 'Body del request. Casi siempre incluye "prompt".' },
        wait: { type: 'boolean', description: 'true (default) espera el resultado; false devuelve solo el request_id.', default: true },
        timeout_seconds: { type: 'number', description: 'Tope de espera del polling. Default 300.', default: 300 },
      },
      required: ['endpoint', 'input'],
    },
  },
  {
    name: 'higgsfield_status',
    description: 'Consulta el estado de un request por su request_id. Estados: queued, in_progress, completed, failed, nsfw, canceled.',
    inputSchema: {
      type: 'object',
      properties: { request_id: { type: 'string' } },
      required: ['request_id'],
    },
  },
  {
    name: 'higgsfield_cancel',
    description: 'Cancela un request que todavía está en cola.',
    inputSchema: {
      type: 'object',
      properties: { request_id: { type: 'string' } },
      required: ['request_id'],
    },
  },
  {
    name: 'higgsfield_download',
    description: 'Descarga una URL de resultado de Higgsfield a un archivo local del proyecto (p.ej. public/media/hero.mp4).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL devuelta por higgsfield_generate o higgsfield_status.' },
        dest: { type: 'string', description: 'Ruta destino, relativa al cwd o absoluta.' },
      },
      required: ['url', 'dest'],
    },
  },
];

async function callTool(name, args = {}) {
  switch (name) {
    case 'higgsfield_list_models': {
      if (args.endpoint) {
        const model = MODELS[args.endpoint];
        if (!model) {
          throw new Error(`Endpoint desconocido: ${args.endpoint}. Usá higgsfield_list_models sin argumentos para ver la lista.`);
        }
        return { endpoint: args.endpoint, ...model };
      }
      const filter = (args.filter ?? '').toLowerCase();
      const endpoints = Object.entries(MODELS)
        .filter(([p]) => !filter || p.toLowerCase().includes(filter))
        .map(([p, m]) => ({ endpoint: p, required: m.required, params: Object.keys(m.params) }));
      return { count: endpoints.length, endpoints };
    }

    case 'higgsfield_generate': {
      const submitted = await api('POST', args.endpoint, args.input ?? {});
      const requestId = submitted.request_id ?? submitted.id;
      if (args.wait === false || !requestId) return submitted;
      const status = await pollUntilDone(requestId, args.timeout_seconds ?? 300);
      return { ...status, media_urls: mediaUrls(status) };
    }

    case 'higgsfield_status': {
      const status = await api('GET', `/requests/${args.request_id}/status`);
      return { ...status, media_urls: mediaUrls(status) };
    }

    case 'higgsfield_cancel':
      return api('POST', `/requests/${args.request_id}/cancel`);

    case 'higgsfield_download': {
      const res = await fetch(args.url);
      if (!res.ok) throw new Error(`No se pudo descargar (${res.status}): ${args.url}`);
      const dest = path.resolve(args.dest);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      return { saved: dest, bytes: buf.length };
    }

    default:
      throw new Error(`Tool desconocida: ${name}`);
  }
}

// --- JSON-RPC sobre stdio --------------------------------------------------

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handle(req) {
  const { id, method, params } = req;
  // Las notificaciones (sin id) no llevan respuesta.
  if (id === undefined) return;

  try {
    switch (method) {
      case 'initialize':
        return send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: params?.protocolVersion ?? '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'higgsfield', version: '0.1.0' },
          },
        });

      case 'ping':
        return send({ jsonrpc: '2.0', id, result: {} });

      case 'tools/list':
        return send({ jsonrpc: '2.0', id, result: { tools } });

      case 'tools/call': {
        const result = await callTool(params?.name, params?.arguments);
        return send({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
        });
      }

      default:
        return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    if (method === 'tools/call') {
      // Errores de tool van como resultado con isError, no como error de protocolo.
      return send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: String(err.message ?? err) }], isError: true },
      });
    }
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(err.message ?? err) } });
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let req;
    try { req = JSON.parse(line); } catch { continue; }
    handle(req);
  }
});
// Sin handler de 'end': cuando el cliente cierra stdin y no queda trabajo
// pendiente, node sale solo. Salir a mano cortaría respuestas en vuelo.
