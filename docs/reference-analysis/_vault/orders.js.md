---
source_file: "server/services/orders.js"
type: "code"
community: "Email Receipts & Orders"
location: "L1"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Email_Receipts__Orders
---

# orders.js

## Connections
- [[BUNDLE_MODELS]] - `imports` [EXTRACTED]
- [[HttpError]] - `imports` [EXTRACTED]
- [[app.js]] - `imports_from` [EXTRACTED]
- [[assertPathInsideStorage()]] - `contains` [EXTRACTED]
- [[assertPaymentMatchesOrder()]] - `imports` [EXTRACTED]
- [[catalog.js]] - `imports_from` [EXTRACTED]
- [[consumeDownload()]] - `contains` [EXTRACTED]
- [[db]] - `imports` [EXTRACTED]
- [[db.js]] - `imports_from` [EXTRACTED]
- [[email.js]] - `imports_from` [EXTRACTED]
- [[ensureOrderZip()]] - `contains` [EXTRACTED]
- [[fulfill.test.js]] - `dynamic_import` [EXTRACTED]
- [[fulfillApprovedPayment()]] - `contains` [EXTRACTED]
- [[markOrderPaid()]] - `contains` [EXTRACTED]
- [[mercadoPago.js]] - `imports_from` [EXTRACTED]
- [[packBundleTemplate()]] - `imports` [EXTRACTED]
- [[packCustomTemplate()]] - `imports` [EXTRACTED]
- [[packFixedTemplate()]] - `imports` [EXTRACTED]
- [[packaging.js]] - `imports_from` [EXTRACTED]
- [[packingLocks]] - `contains` [EXTRACTED]
- [[sendOrderAdminNotifyOnce()]] - `imports` [EXTRACTED]
- [[sendOrderReceiptOnce()]] - `imports` [EXTRACTED]
- [[validation.js]] - `imports_from` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Email_Receipts__Orders