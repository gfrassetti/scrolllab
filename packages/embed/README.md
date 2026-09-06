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

## Plain HTML

No package needed — paste the `<script>` tag ScrollLab gives you in the LAB
dashboard.

## Notes

- The loader is injected once per page and shared across every `<ScrollLabEmbed>`.
- The iframe is sandboxed and same-origin isolated: it cannot read your page,
  its cookies, or its storage.
- The `embedKey` is a public, revocable key. Manage domains and revoke keys from
  the LAB dashboard.
