---
type: community
cohesion: 0.25
members: 11
---

# Server Config & Secrets

**Cohesion:** 0.25 - loosely connected
**Members:** 11 nodes

## Members
- [[ROOT_2]] - code - server/config.js
- [[WEAK_SECRETS]] - code - server/config.js
- [[__dirname_2]] - code - server/config.js
- [[assertProdAuthHosts()]] - code - server/config.js
- [[assertStrongSecret()]] - code - server/config.js
- [[bool()]] - code - server/config.js
- [[config.js]] - code - server/config.js
- [[hostOf()]] - code - server/config.js
- [[loadConfig()]] - code - server/config.js
- [[requireEnv()]] - code - server/config.js
- [[withEnv()]] - code - server/__tests__/unit.test.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Server_Config__Secrets
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Server Core & Auth]]
- 2 edges to [[_COMMUNITY_FX Rates & Order Retention]]
- 1 edge to [[_COMMUNITY_Visual Check & Poster Capture]]

## Top bridge nodes
- [[config.js]] - degree 16, connects to 3 communities
- [[loadConfig()]] - degree 5, connects to 1 community
- [[hostOf()]] - degree 3, connects to 1 community
- [[withEnv()]] - degree 2, connects to 1 community