---
type: community
cohesion: 0.24
members: 18
---

# Server Catalog & SKU Gating

**Cohesion:** 0.24 - loosely connected
**Members:** 18 nodes

## Members
- [[ARS_ROUNDING]] - code - server/catalog.js
- [[BUILDER_HIDDEN_SKUS_1]] - code - server/catalog.js
- [[PRODUCTS]] - code - server/catalog.js
- [[arsFromUsd()_1]] - code - server/catalog.js
- [[catalog.js]] - code - server/catalog.js
- [[catalogWithArs()]] - code - server/catalog.js
- [[customExtraSections()_1]] - code - server/catalog.js
- [[isAllowedSectionId()]] - code - server/sections.js
- [[isComingSoonSku()_1]] - code - server/catalog.js
- [[isLocalOnlySku()_1]] - code - server/catalog.js
- [[priceCustomRecipeUsd()]] - code - server/catalog.js
- [[recipeHasCommerce()_1]] - code - server/catalog.js
- [[recipeSectionId()]] - code - server/catalog.js
- [[resolveLineItem()]] - code - server/catalog.js
- [[sanitizeSectionProps()]] - code - server/sectionFields.js
- [[validateCheckoutItems()]] - code - server/validation.js
- [[validateRecipe()]] - code - server/validation.js
- [[validation.js]] - code - server/validation.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Server_Catalog__SKU_Gating
SORT file.name ASC
```

## Connections to other communities
- 13 edges to [[_COMMUNITY_FX Rates & Order Retention]]
- 10 edges to [[_COMMUNITY_Server Core & Auth]]
- 6 edges to [[_COMMUNITY_Email Receipts & Orders]]
- 6 edges to [[_COMMUNITY_ZIP Packaging & Licensing]]
- 5 edges to [[_COMMUNITY_Consistency Check Script]]
- 4 edges to [[_COMMUNITY_Visual Check & Poster Capture]]
- 2 edges to [[_COMMUNITY_Server Section Fields]]
- 2 edges to [[_COMMUNITY_Server Sections Allowlist]]

## Top bridge nodes
- [[catalog.js]] - degree 29, connects to 6 communities
- [[validation.js]] - degree 21, connects to 5 communities
- [[validateCheckoutItems()]] - degree 10, connects to 3 communities
- [[arsFromUsd()_1]] - degree 7, connects to 2 communities
- [[validateRecipe()]] - degree 7, connects to 2 communities