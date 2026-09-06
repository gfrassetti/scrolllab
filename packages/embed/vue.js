import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { mountEmbed } from './loader-client.js'

/**
 * <ScrollLabEmbed embed-key="pub_…" />
 */
export default defineComponent({
  name: 'ScrollLabEmbed',
  props: {
    embedKey: { type: String, required: true },
  },
  setup(props) {
    const el = ref(null)
    let cleanup = () => {}
    onMounted(() => {
      cleanup = mountEmbed(el.value, props.embedKey)
    })
    onBeforeUnmount(() => cleanup())
    return () => h('div', { ref: el })
  },
})
