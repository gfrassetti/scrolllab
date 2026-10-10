import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import {
  projectCompositionId,
  readCurrentProject,
  recipeToComposition,
  writeCurrentProject,
} from '../lib/composition'

/** Pausa entre el último cambio y el guardado automático. */
export const PROJECT_AUTOSAVE_MS = 1200

/**
 * Proyectos guardados del builder: varias composiciones por cuenta, que se
 * retoman donde quedaron. Se apoya en useBuilderComposition (la composición
 * abierta y su id) y no la reemplaza: sin sesión el builder sigue igual, con
 * el borrador en este navegador.
 *
 * - El proyecto abierto es el que corresponde al id de la composición: si el
 *   lienzo empieza otra (Vaciar, Nuevo), el proyecto queda guardado como estaba.
 * - Con un proyecto abierto, cada cambio se guarda solo (PROJECT_AUTOSAVE_MS).
 * - El servidor manda: al volver al builder, si el proyecto cambió en otro
 *   dispositivo se abre esa versión, no la copia vieja de este navegador.
 *
 * `status`: 'idle' | 'pending' | 'saving' | 'saved' | 'error'.
 */
export function useBuilderProjects({
  enabled,
  recipe,
  compositionId,
  switchComposition,
  renameComposition,
  startFresh,
}) {
  const [stored, setStored] = useState(readCurrentProject)
  const project = stored && compositionId === projectCompositionId(stored.id) ? stored : null
  const projectId = project?.id || null
  const projectName = project?.name || ''

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [syncedId, setSyncedId] = useState(null)
  const [projects, setProjects] = useState(null)
  const [max, setMax] = useState(null)

  const recipeJson = JSON.stringify(recipe)
  // Lo último que confirmó el servidor, y lo último del lienzo (para el guardado
  // que sale al cerrar la pestaña, fuera del ciclo de render).
  const savedJson = useRef(null)
  const latest = useRef({ enabled, projectId, recipeJson })
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    latest.current = { enabled, projectId, recipeJson }
  }, [enabled, projectId, recipeJson])

  useEffect(() => {
    writeCurrentProject(projectId ? { id: projectId, name: projectName } : null)
  }, [projectId, projectName])

  // La lista refleja lo último guardado (secciones, fecha) sin volver a pedirla.
  const patchListed = useCallback((updated) => {
    if (!updated?.id) return
    setProjects((list) => {
      if (!list) return list
      const rest = list.filter((p) => p.id !== updated.id)
      const { recipe: _recipe, ...row } = updated
      return [row, ...rest]
    })
  }, [])

  const detach = useCallback(() => {
    setStored(null)
    savedJson.current = null
    setSyncedId(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const data = await api.builderProjects()
      setProjects(data.projects || [])
      if (data.max) setMax(data.max)
    } catch {
      setProjects((prev) => prev || [])
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) refresh()
    else setProjects(null)
  }, [enabled, refresh])

  // Guardados en fila: uno no pisa al siguiente aunque el servidor tarde.
  const save = useCallback(() => {
    queue.current = queue.current.then(async () => {
      const { enabled: on, projectId: id, recipeJson: json } = latest.current
      if (!on || !id || json === savedJson.current) {
        setStatus((s) => (s === 'pending' ? 'saved' : s))
        return
      }
      setStatus('saving')
      try {
        const { project: updated } = await api.builderProjectUpdate(id, { recipe: JSON.parse(json) })
        savedJson.current = json
        patchListed(updated)
        setError('')
        setStatus(latest.current.recipeJson === json ? 'saved' : 'pending')
      } catch (err) {
        if (err?.status === 404) {
          // Lo borraron (desde otra pestaña o la cuenta): el lienzo queda como borrador.
          detach()
          setStatus('missing')
          refresh()
          return
        }
        setError(err?.message || '')
        setStatus('error')
      }
    })
    return queue.current
  }, [detach, patchListed, refresh])

  // Al abrir el builder con un proyecto: traer la versión del servidor.
  useEffect(() => {
    if (!enabled || !projectId || syncedId === projectId) return undefined
    let cancelled = false
    api
      .builderProject(projectId)
      .then(({ project: remote }) => {
        if (cancelled) return
        const remoteJson = JSON.stringify(remote.recipe || [])
        savedJson.current = remoteJson
        setStored({ id: remote.id, name: remote.name })
        if (remoteJson !== latest.current.recipeJson) {
          switchComposition(projectCompositionId(remote.id), recipeToComposition(remote.recipe))
        }
        setSyncedId(remote.id)
        setStatus('saved')
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.status === 404) detach()
        else setSyncedId(projectId) // sin red: se sigue con la copia local
      })
    return () => {
      cancelled = true
    }
  }, [enabled, projectId, syncedId, switchComposition, detach])

  // Guardado automático.
  useEffect(() => {
    if (!enabled || !projectId || syncedId !== projectId) return undefined
    if (recipeJson === savedJson.current) return undefined
    setStatus('pending')
    const timer = window.setTimeout(save, PROJECT_AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, projectId, syncedId, recipeJson, save])

  // Cerrar la pestaña con un cambio en la pausa: sale igual (keepalive).
  useEffect(() => {
    if (!enabled) return undefined
    const flush = () => {
      const { projectId: id, recipeJson: json } = latest.current
      if (!id || json === savedJson.current || savedJson.current === null) return
      api.builderProjectUpdate(id, { recipe: JSON.parse(json) }, { keepalive: true }).catch(() => {})
      savedJson.current = json
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [enabled])

  /** Guarda el lienzo como proyecto nuevo y lo deja abierto. */
  const saveAs = useCallback(
    async (name) => {
      setStatus('saving')
      try {
        const { project: created } = await api.builderProjectCreate({ name, recipe })
        savedJson.current = JSON.stringify(created.recipe || [])
        renameComposition(projectCompositionId(created.id))
        setStored({ id: created.id, name: created.name })
        setSyncedId(created.id)
        setError('')
        setStatus('saved')
        refresh()
        return created
      } catch (err) {
        setError(err?.message || '')
        setStatus('error')
        throw err
      }
    },
    [recipe, renameComposition, refresh],
  )

  /** Abre un proyecto guardado en el lienzo. */
  const open = useCallback(
    async (id) => {
      if (id === projectId) return
      await save()
      const { project: remote } = await api.builderProject(id)
      savedJson.current = JSON.stringify(remote.recipe || [])
      switchComposition(projectCompositionId(remote.id), recipeToComposition(remote.recipe))
      setStored({ id: remote.id, name: remote.name })
      setSyncedId(remote.id)
      setError('')
      setStatus('saved')
    },
    [projectId, save, switchComposition],
  )

  /**
   * Lienzo en blanco; el proyecto abierto queda guardado como estaba (lo que
   * estaba en la pausa del guardado automático sale antes).
   */
  const startNew = useCallback(async () => {
    await save()
    startFresh()
    detach()
    setStatus('idle')
  }, [save, startFresh, detach])

  const rename = useCallback(
    async (id, name) => {
      const { project: updated } = await api.builderProjectUpdate(id, { name })
      if (id === projectId) setStored({ id, name: updated.name })
      patchListed(updated)
      return updated
    },
    [projectId, patchListed],
  )

  const remove = useCallback(
    async (id) => {
      await api.builderProjectDelete(id)
      // Borrar el abierto no vacía el lienzo: queda como borrador sin guardar.
      if (id === projectId) {
        detach()
        setStatus('idle')
      }
      setProjects((list) => list?.filter((p) => p.id !== id) || list)
    },
    [projectId, detach],
  )

  const duplicate = useCallback(
    async (id, name) => {
      if (id === projectId) await save()
      const { project: source } = await api.builderProject(id)
      const { project: copy } = await api.builderProjectCreate({ name, recipe: source.recipe })
      await refresh()
      return copy
    },
    [projectId, save, refresh],
  )

  return {
    project,
    status,
    error,
    projects,
    max,
    refresh,
    retry: save,
    saveAs,
    open,
    startNew,
    rename,
    remove,
    duplicate,
  }
}
