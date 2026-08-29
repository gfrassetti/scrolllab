---
type: community
cohesion: 0.14
members: 27
---

# GTM Analytics

**Cohesion:** 0.14 - loosely connected
**Members:** 27 nodes

## Members
- [[App()]] - code - src/App.jsx
- [[GTM_ID]] - code - src/lib/gtm.js
- [[PURCHASE_KEY()]] - code - src/lib/gtm.js
- [[alreadyTrackedPurchase()]] - code - src/lib/gtm.js
- [[authReturn.test.js]] - code - src/lib/__tests__/authReturn.test.js
- [[bootGtm()]] - code - src/lib/gtm.js
- [[cart.test.js]] - code - src/lib/__tests__/cart.test.js
- [[cartItemsToEcommerce()]] - code - src/lib/gtm.js
- [[createMemoryStorage()]] - code - src/lib/__tests__/storageMock.js
- [[dataLayer()]] - code - src/lib/gtm.js
- [[gtm.js]] - code - src/lib/gtm.js
- [[gtm.test.js]] - code - src/lib/__tests__/gtm.test.js
- [[gtmPush()]] - code - src/lib/gtm.js
- [[hasWindow()]] - code - src/lib/gtm.js
- [[installBrowserStorageMocks()]] - code - src/lib/__tests__/storageMock.js
- [[isGtmId()]] - code - src/lib/gtm.js
- [[main.jsx]] - code - src/main.jsx
- [[markTrackedPurchase()]] - code - src/lib/gtm.js
- [[orderItemsToEcommerce()]] - code - src/lib/gtm.js
- [[purchaseId()]] - code - src/lib/gtm.js
- [[pushEcommerce()]] - code - src/lib/gtm.js
- [[seenPurchases]] - code - src/lib/gtm.js
- [[startCheckout.test.js]] - code - src/lib/__tests__/startCheckout.test.js
- [[storageMock.js]] - code - src/lib/__tests__/storageMock.js
- [[trackAddToCart()]] - code - src/lib/gtm.js
- [[trackBeginCheckout()]] - code - src/lib/gtm.js
- [[trackPurchase()]] - code - src/lib/gtm.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/GTM_Analytics
SORT file.name ASC
```

## Connections to other communities
- 9 edges to [[_COMMUNITY_Cart API & Buy Pill]]
- 3 edges to [[_COMMUNITY_SEO & Document Head]]
- 3 edges to [[_COMMUNITY_Order Status & Thumbnails]]
- 2 edges to [[_COMMUNITY_App Routing & Pages]]
- 1 edge to [[_COMMUNITY_Client Auth & Return]]
- 1 edge to [[_COMMUNITY_Pricing & Custom Quotes]]

## Top bridge nodes
- [[gtm.js]] - degree 24, connects to 3 communities
- [[cart.test.js]] - degree 4, connects to 2 communities
- [[trackPurchase()]] - degree 8, connects to 1 community
- [[gtmPush()]] - degree 5, connects to 1 community
- [[trackAddToCart()]] - degree 5, connects to 1 community