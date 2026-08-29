---
type: community
cohesion: 0.13
members: 35
---

# Server Core & Auth

**Cohesion:** 0.13 - loosely connected
**Members:** 35 nodes

## Members
- [[ALLOWED_1]] - code - server/authReturn.js
- [[ROOT_6]] - code - server/loadEnv.js
- [[allowedOrigins()]] - code - server/middleware.js
- [[app.js]] - code - server/app.js
- [[assertObjectIdLike()]] - code - server/validation.js
- [[assertWritableDir()]] - code - server/config.js
- [[asyncHandler()]] - code - server/middleware.js
- [[auth]] - code - server/index.js
- [[authDiagnostics()]] - code - server/config.js
- [[boot()]] - code - server/index.js
- [[config]] - code - server/index.js
- [[connect-mongo]] - code - connect-mongo
- [[connectDb()]] - code - server/db.js
- [[createApp()]] - code - server/app.js
- [[createCors()]] - code - server/middleware.js
- [[createHelmet()]] - code - server/middleware.js
- [[createLogger()]] - code - server/middleware.js
- [[db]] - code - server/db.js
- [[errorHandler()]] - code - server/middleware.js
- [[loadEnv.js]] - code - server/loadEnv.js
- [[middleware.js]] - code - server/middleware.js
- [[notFound()]] - code - server/middleware.js
- [[pendingExpiresAt()]] - code - server/orderRetention.js
- [[publicUser()]] - code - server/app.js
- [[rateLimits()]] - code - server/middleware.js
- [[requestId()]] - code - server/middleware.js
- [[requireAuth()]] - code - server/middleware.js
- [[requireSameOrigin()]] - code - server/middleware.js
- [[sanitizeAuthReturn()_1]] - code - server/authReturn.js
- [[serverauthReturn.js]] - code - server/authReturn.js
- [[serverindex.js]] - code - server/index.js
- [[signDownloadToken()]] - code - server/packaging.js
- [[storeMode()]] - code - server/db.js
- [[verifyDownloadToken()]] - code - server/packaging.js
- [[verifyMpWebhookSignature()]] - code - server/services/mercadoPago.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Server_Core__Auth
SORT file.name ASC
```

## Connections to other communities
- 26 edges to [[_COMMUNITY_FX Rates & Order Retention]]
- 22 edges to [[_COMMUNITY_Email Receipts & Orders]]
- 10 edges to [[_COMMUNITY_Server Catalog & SKU Gating]]
- 6 edges to [[_COMMUNITY_Server Config & Secrets]]
- 5 edges to [[_COMMUNITY_ZIP Packaging & Licensing]]
- 5 edges to [[_COMMUNITY_Order Store & Pruning]]
- 2 edges to [[_COMMUNITY_Visual Check & Poster Capture]]

## Top bridge nodes
- [[app.js]] - degree 55, connects to 7 communities
- [[createApp()]] - degree 39, connects to 4 communities
- [[middleware.js]] - degree 15, connects to 3 communities
- [[signDownloadToken()]] - degree 5, connects to 3 communities
- [[serverindex.js]] - degree 13, connects to 2 communities