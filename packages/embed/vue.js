import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { mountEmbed } from './loader-client.js'

/**
 * <ScrollLabEmbed embed-key="pub_…" />   una sección
 * <ScrollLabEmbed pack-key="pk_…" />     un pack (varias secciones, en orden)
 */
export default defineComponent({
  name: 'ScrollLabEmbed',
  props: {
    embedKey: { type: String, default: '' },
    packKey: { type: String, default: '' },
  },
  setup(props) {
    const el = ref(null)
    let cleanup = () => {}
    onMounted(() => {
      cleanup = mountEmbed(
        el.value,
        props.embedKey ? { key: props.embedKey } : { pack: props.packKey },
      )
    })
    onBeforeUnmount(() => cleanup())
    return () => h('div', { ref: el })
  },
})
