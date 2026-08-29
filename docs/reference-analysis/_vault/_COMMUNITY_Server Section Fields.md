---
type: community
cohesion: 0.33
members: 6
---

# Server Section Fields

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[ALLOWED_PROPS_BY_SECTION]] - code - server/sectionFields.js
- [[ASSET_URL_KEYS]] - code - server/sectionFields.js
- [[FLAVOR_PRESETS]] - code - server/sectionFields.js
- [[SHAPE_PRESETS]] - code - server/sectionFields.js
- [[THEME_PRESETS]] - code - server/sectionFields.js
- [[serversectionFields.js]] - code - server/sectionFields.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Server_Section_Fields
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Server Catalog & SKU Gating]]
- 2 edges to [[_COMMUNITY_Consistency Check Script]]

## Top bridge nodes
- [[serversectionFields.js]] - degree 8, connects to 2 communities
- [[ALLOWED_PROPS_BY_SECTION]] - degree 2, connects to 1 community