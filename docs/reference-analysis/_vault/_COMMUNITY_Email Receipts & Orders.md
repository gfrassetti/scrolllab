---
type: community
cohesion: 0.17
members: 23
---

# Email Receipts & Orders

**Cohesion:** 0.17 - loosely connected
**Members:** 23 nodes

## Members
- [[dot-constructor()]] - code - server/validation.js
- [[HttpError]] - code - server/validation.js
- [[approvedPayment()]] - code - server/__tests__/fulfill.test.js
- [[assertPathInsideStorage()]] - code - server/services/orders.js
- [[assertPaymentMatchesOrder()]] - code - server/services/mercadoPago.js
- [[buildOrderAdminNotify()]] - code - server/services/email.js
- [[buildOrderReceipt()]] - code - server/services/email.js
- [[consumeDownload()]] - code - server/services/orders.js
- [[email.js]] - code - server/services/email.js
- [[ensureOrderZip()]] - code - server/services/orders.js
- [[escapeHtml()]] - code - server/services/email.js
- [[formatDateTime()]] - code - server/services/email.js
- [[formatMoney()]] - code - server/services/email.js
- [[fulfill.test.js]] - code - server/__tests__/fulfill.test.js
- [[fulfillApprovedPayment()]] - code - server/services/orders.js
- [[markOrderPaid()]] - code - server/services/orders.js
- [[orders.js]] - code - server/services/orders.js
- [[packingLocks]] - code - server/services/orders.js
- [[seedOrder()]] - code - server/__tests__/fulfill.test.js
- [[seedPaidOrder()]] - code - server/__tests__/fulfill.test.js
- [[sendOrderAdminNotifyOnce()]] - code - server/services/email.js
- [[sendOrderReceiptOnce()]] - code - server/services/email.js
- [[sendReceiptSafely()]] - code - server/app.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Email_Receipts__Orders
SORT file.name ASC
```

## Connections to other communities
- 22 edges to [[_COMMUNITY_Server Core & Auth]]
- 9 edges to [[_COMMUNITY_FX Rates & Order Retention]]
- 7 edges to [[_COMMUNITY_ZIP Packaging & Licensing]]
- 6 edges to [[_COMMUNITY_Server Catalog & SKU Gating]]
- 3 edges to [[_COMMUNITY_Order Store & Pruning]]
- 1 edge to [[_COMMUNITY_Visual Check & Poster Capture]]

## Top bridge nodes
- [[orders.js]] - degree 23, connects to 6 communities
- [[HttpError]] - degree 18, connects to 3 communities
- [[email.js]] - degree 13, connects to 3 communities
- [[ensureOrderZip()]] - degree 9, connects to 2 communities
- [[fulfill.test.js]] - degree 7, connects to 2 communities