---
source_file: "server/services/orders.js"
type: "code"
community: "Email Receipts & Orders"
location: "L110"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Email_Receipts__Orders
---

# fulfillApprovedPayment()

## Connections
- [[HttpError]] - `calls` [EXTRACTED]
- [[app.js]] - `imports` [EXTRACTED]
- [[assertPaymentMatchesOrder()]] - `calls` [EXTRACTED]
- [[createApp()]] - `calls` [EXTRACTED]
- [[ensureOrderZip()]] - `calls` [EXTRACTED]
- [[markOrderPaid()]] - `calls` [EXTRACTED]
- [[orders.js]] - `contains` [EXTRACTED]
- [[sendOrderAdminNotifyOnce()]] - `calls` [EXTRACTED]
- [[sendOrderReceiptOnce()]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Email_Receipts__Orders