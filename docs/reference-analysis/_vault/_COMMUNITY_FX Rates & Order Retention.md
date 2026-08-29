---
type: community
cohesion: 0.12
members: 30
---

# FX Rates & Order Retention

**Cohesion:** 0.12 - loosely connected
**Members:** 30 nodes

## Members
- [[COMMERCE_PACK_SURCHARGE_USD]] - code - server/catalog.js
- [[CUSTOM_BASE_SECTIONS]] - code - server/catalog.js
- [[CUSTOM_EXTRA_SECTION_USD]] - code - server/catalog.js
- [[MP_DEFAULT_ITEM_PICTURE]] - code - server/services/mercadoPago.js
- [[MP_STATEMENT_DESCRIPTOR]] - code - server/services/mercadoPago.js
- [[PENDING_RETENTION_MS]] - code - server/orderRetention.js
- [[PENDING_VISIBLE_MS]] - code - server/orderRetention.js
- [[absoluteClientAsset()]] - code - server/services/mercadoPago.js
- [[buildPreferenceBody()]] - code - server/services/mercadoPago.js
- [[clearFxCache()]] - code - server/fx.js
- [[createCheckoutPreference()]] - code - server/services/mercadoPago.js
- [[createMpClient()]] - code - server/services/mercadoPago.js
- [[extractRate()]] - code - server/fx.js
- [[fetchPayment()]] - code - server/services/mercadoPago.js
- [[fetchRate()]] - code - server/fx.js
- [[fxConfig()]] - code - server/fx.js
- [[getUsdArsRate()]] - code - server/fx.js
- [[isStalePending()]] - code - server/orderRetention.js
- [[mercadoPago.js]] - code - server/services/mercadoPago.js
- [[mpPaymentError()]] - code - server/services/mercadoPago.js
- [[num()]] - code - server/fx.js
- [[orderRetention.js]] - code - server/orderRetention.js
- [[picturePathForSku()]] - code - server/services/mercadoPago.js
- [[run()]] - code - server/__tests__/unit.test.js
- [[send()]] - code - server/__tests__/unit.test.js
- [[serverfx.js]] - code - server/fx.js
- [[setFxCacheForTests()]] - code - server/fx.js
- [[sign()]] - code - server/__tests__/unit.test.js
- [[unit.test.js]] - code - server/__tests__/unit.test.js
- [[visibleOrders()]] - code - server/orderRetention.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/FX_Rates__Order_Retention
SORT file.name ASC
```

## Connections to other communities
- 26 edges to [[_COMMUNITY_Server Core & Auth]]
- 13 edges to [[_COMMUNITY_Server Catalog & SKU Gating]]
- 9 edges to [[_COMMUNITY_Email Receipts & Orders]]
- 3 edges to [[_COMMUNITY_Consistency Check Script]]
- 2 edges to [[_COMMUNITY_Server Config & Secrets]]
- 1 edge to [[_COMMUNITY_Visual Check & Poster Capture]]
- 1 edge to [[_COMMUNITY_ZIP Packaging & Licensing]]

## Top bridge nodes
- [[unit.test.js]] - degree 48, connects to 6 communities
- [[mercadoPago.js]] - degree 18, connects to 3 communities
- [[COMMERCE_PACK_SURCHARGE_USD]] - degree 4, connects to 3 communities
- [[CUSTOM_BASE_SECTIONS]] - degree 3, connects to 2 communities
- [[CUSTOM_EXTRA_SECTION_USD]] - degree 3, connects to 2 communities