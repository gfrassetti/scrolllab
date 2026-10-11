import { useMemo } from 'react'
import { api } from '../../lib/api'
import { useCart } from '../../lib/cart'
import { projectCompositionId } from '../../lib/composition'

const PREFIX = projectCompositionId('')

/**
 * Manda un proyecto guardado al carrito sin abrirlo en el builder: trae su
 * receta del servidor y la suma como una composición más (su id es el del
 * proyecto, así que si después se abre y se edita, el carrito la sigue).
 * Devuelve false si el carrito ya tiene el tope de composiciones (el carrito
 * muestra su propio aviso).
 * @param {{ id: string }} project
 * @param {string} title  título genérico de la línea (el nombre va aparte)
 */
export async function addProjectToCart(project, title) {
  const { project: full } = await api.builderProject(project.id)
  if (!Array.isArray(full.recipe) || full.recipe.length === 0) return false
  return useCart.getState().addItem({
    sku: 'custom',
    title,
    compositionId: projectCompositionId(full.id),
    projectName: full.name || undefined,
    recipe: full.recipe,
  })
}

/** Ids de los proyectos que ya están en el carrito. */
export function useProjectsInCart() {
  const items = useCart((s) => s.items)
  return useMemo(
    () =>
      new Set(
        items
          .filter((i) => i.sku === 'custom' && String(i.compositionId || '').startsWith(PREFIX))
          .map((i) => String(i.compositionId).slice(PREFIX.length)),
      ),
    [items],
  )
}
