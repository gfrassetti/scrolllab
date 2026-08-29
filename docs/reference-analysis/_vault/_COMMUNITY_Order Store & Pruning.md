---
type: community
cohesion: 0.11
members: 29
---

# Order Store & Pruning

**Cohesion:** 0.11 - loosely connected
**Members:** 29 nodes

## Members
- [[dot-save()]] - code - server/fileStore.js
- [[DATA_DIR]] - code - server/fileStore.js
- [[FILE_DB]] - code - scripts/prune-orders.mjs
- [[Order]] - code - server/models.js
- [[REPO]] - code - scripts/prune-orders.mjs
- [[User]] - code - server/models.js
- [[__dirname]] - code - server/fileStore.js
- [[db.js]] - code - server/db.js
- [[delete-pending-orders.js]] - code - server/scripts/delete-pending-orders.js
- [[describe()]] - code - scripts/prune-orders.mjs
- [[doc]] - code - server/fileStore.js
- [[ensure()]] - code - server/fileStore.js
- [[fileDb]] - code - server/fileStore.js
- [[fileStore.js]] - code - server/fileStore.js
- [[fmtArs()]] - code - scripts/prune-orders.mjs
- [[models.js]] - code - server/models.js
- [[nid()]] - code - server/fileStore.js
- [[orderItemSchema]] - code - server/models.js
- [[orderSchema]] - code - server/models.js
- [[parseArgs()]] - code - scripts/prune-orders.mjs
- [[prune-orders.mjs]] - code - scripts/prune-orders.mjs
- [[pruneFileStore()]] - code - scripts/prune-orders.mjs
- [[pruneMongo()]] - code - scripts/prune-orders.mjs
- [[read()]] - code - server/fileStore.js
- [[report()]] - code - scripts/prune-orders.mjs
- [[uid()]] - code - server/db.js
- [[userSchema]] - code - server/models.js
- [[withSave()]] - code - server/fileStore.js
- [[write()]] - code - server/fileStore.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Order_Store__Pruning
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Server Core & Auth]]
- 3 edges to [[_COMMUNITY_Email Receipts & Orders]]

## Top bridge nodes
- [[db.js]] - degree 14, connects to 2 communities