---
source_file: "server/models.js"
type: "code"
community: "Order Store & Pruning"
location: "L1"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Order_Store__Pruning
---

# models.js

## Connections
- [[Order]] - `contains` [EXTRACTED]
- [[User]] - `contains` [EXTRACTED]
- [[db.js]] - `imports_from` [EXTRACTED]
- [[delete-pending-orders.js]] - `imports_from` [EXTRACTED]
- [[orderItemSchema]] - `contains` [EXTRACTED]
- [[orderSchema]] - `contains` [EXTRACTED]
- [[prune-orders.mjs]] - `imports_from` [EXTRACTED]
- [[userSchema]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Order_Store__Pruning