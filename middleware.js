// Vercel Edge Middleware: bloqueo activo (403) de bots de IA en el catálogo,
// Builder y LAB. robots.txt pide lo mismo por las buenas; esto lo hace cumplir
// para los que no lo respetan. Deja afuera legal/login/cart/checkout/api a
// propósito — no aportan nada a un scraper y no vale la pena tocarlos.
const AI_BOT_PATTERN =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|Claude-User|anthropic-ai|CCBot|Google-Extended|Applebot-Extended|Bytespider|PerplexityBot|Perplexity-User|Amazonbot|Meta-ExternalAgent|Meta-ExternalFetcher|FacebookBot|Diffbot|ImagesiftBot|Omgilibot|Omgili|YouBot|AI2Bot|cohere-ai|Timpibot|Google-CloudVertexBot/i

export const config = {
  matcher: ['/', '/templates/:path*', '/builder', '/lab', '/lab/:path*'],
}

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || ''
  if (AI_BOT_PATTERN.test(ua)) {
    return new Response('Blocked', { status: 403 })
  }
}
