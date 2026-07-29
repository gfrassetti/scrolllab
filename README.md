# SCROLLLAB

Marketplace de templates scrollytelling. Cada modelo es una demo completa; el builder arma composiciones; la compra entrega un ZIP con código fuente + `LICENSE.txt`.

## Stack

- Vite + React 19 + Tailwind CSS v4
- GSAP 3 + Lenis + three
- Express API (`server/`) + MongoDB + Passport Google OAuth
- Mercado Pago Checkout Pro (pagos únicos)

## Setup local

```bash
cp .env.example .env
npm install
npm run pack:templates
npm run dev
```

- Front: http://localhost:5173  
- API: http://localhost:8787  

Sin `MP_ACCESS_TOKEN`, el checkout usa mock pay. Sin credenciales de Google, usá “Login de desarrollo”.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite + API |
| `npm run dev:web` | Solo Vite |
| `npm run dev:api` | Solo Express |
| `npm run build` | Build del front |
| `npm start` | API en producción |
| `npm test` | Tests de API |
| `npm run pack:templates` | Prearma ZIPs del catálogo |

## Deploy

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Licencia

Código del marketplace: privado. Los ZIPs vendidos incluyen `LICENSE.txt` con watermark de orden/email.
