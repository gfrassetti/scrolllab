# @scrolllab/embed

Embed a [ScrollLab](https://www.scrolllab.com.ar/lab) hosted section with one tag.
The GSAP section renders inside a cross-origin `<iframe>` served from ScrollLab —
your page only loads a ~4 KB loader script.

```bash
npm i @scrolllab/embed
```

## React / Next.js

```jsx
import ScrollLabEmbed from '@scrolllab/embed'

export default function Footer() {
  return <ScrollLabEmbed embedKey="pub_xxxxxxxxxxxxxxxxxxxxxxxx" />
}
```

In the Next.js App Router the component is already marked `'use client'`, so you
can drop it straight into a Server Component.

## Vue 3

```vue
<script setup>
import ScrollLabEmbed from '@scrolllab/embed/vue'
</script>

<template>
  <ScrollLabEmbed embed-key="pub_xxxxxxxxxxxxxxxxxxxxxxxx" />
</template>
```

## Packs (several sections, one tag)

A LAB pack groups sections you already published, in order. Same component,
`packKey` instead of `embedKey`:

```jsx
<ScrollLabEmbed packKey="pk_xxxxxxxxxxxxxxxxxxxxxxxx" />
```

```vue
<ScrollLabEmbed pack-key="pk_xxxxxxxxxxxxxxxxxxxxxxxx" />
```

Each section renders in its own iframe, stacked in the pack's order. Edit,
reorder or unpublish sections from the LAB dashboard; the page picks it up on
the next load.

## Plain HTML

No package needed — paste the `<script>` tag ScrollLab gives you in the LAB
dashboard.

## TypeScript

Types are included (`ScrollLabEmbedProps`: `embedKey?` and `packKey?`). Nothing to
install besides `@types/react` for React or `vue` for Vue.

## Notes

- The loader is injected once per page and shared across every `<ScrollLabEmbed>`.
- The iframe is sandboxed and same-origin isolated: it cannot read your page,
  its cookies, or its storage.
- The `embedKey` is a public, revocable key. Manage domains and revoke keys from
  the LAB dashboard.
