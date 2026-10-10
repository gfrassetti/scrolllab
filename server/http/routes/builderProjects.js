import express from 'express'
import { db } from '../../db.js'
import { requireAuth, asyncHandler } from '../../middleware.js'
import { assertObjectIdLike } from '../../validation.js'
import {
  listBuilderProjects,
  getBuilderProject,
  createBuilderProject,
  updateBuilderProject,
  deleteBuilderProject,
  MAX_BUILDER_PROJECTS,
} from '../../services/builderProjects.js'

/**
 * Proyectos del builder (composiciones guardadas en la cuenta). Solo traduce
 * HTTP ↔ servicio: las reglas viven en services/builderProjects.js.
 */
export function createBuilderProjectsRouter({ config, limits }) {
  const router = express.Router()
  const opts = { maxRecipeSections: config.maxRecipeSections }
  const userOf = (req) => db.uid(req.user)

  router.get(
    '/api/builder-projects',
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ projects: await listBuilderProjects(userOf(req)), max: MAX_BUILDER_PROJECTS })
    }),
  )

  router.post(
    '/api/builder-projects',
    requireAuth,
    limits.builderProjects,
    asyncHandler(async (req, res) => {
      const project = await createBuilderProject(userOf(req), req.body || {}, opts)
      res.status(201).json({ project })
    }),
  )

  router.get(
    '/api/builder-projects/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      assertObjectIdLike(req.params.id)
      res.json({ project: await getBuilderProject(userOf(req), req.params.id) })
    }),
  )

  router.put(
    '/api/builder-projects/:id',
    requireAuth,
    limits.builderProjects,
    asyncHandler(async (req, res) => {
      assertObjectIdLike(req.params.id)
      const project = await updateBuilderProject(userOf(req), req.params.id, req.body || {}, opts)
      res.json({ project })
    }),
  )

  router.delete(
    '/api/builder-projects/:id',
    requireAuth,
    limits.builderProjects,
    asyncHandler(async (req, res) => {
      assertObjectIdLike(req.params.id)
      await deleteBuilderProject(userOf(req), req.params.id)
      res.json({ ok: true })
    }),
  )

  return router
}
