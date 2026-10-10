import { db } from '../db.js'
import { HttpError } from '../errors.js'
import { validateRecipe } from '../validation.js'

/** Tope de proyectos guardados por cuenta (abuso / tamaño de la lista). */
export const MAX_BUILDER_PROJECTS = 30
const NAME_MAX = 80

/**
 * Proyectos del builder: composiciones guardadas en la cuenta para retomarlas
 * o tener varias. La receta se valida con la misma regla que el checkout
 * (secciones permitidas, props saneadas, tope de secciones); a diferencia del
 * checkout, un proyecto puede estar vacío (es un borrador).
 */

function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

function cleanRecipe(raw, maxRecipeSections) {
  if (raw === undefined || (Array.isArray(raw) && raw.length === 0)) return []
  if (!Array.isArray(raw)) throw new HttpError(400, 'La receta tiene que ser una lista', { expose: true })
  return validateRecipe(raw, maxRecipeSections)
}

/** Lo que ve el cliente de un proyecto (con o sin receta). */
export function publicProject(project, { withRecipe = true } = {}) {
  const recipe = Array.isArray(project.recipe) ? project.recipe : []
  return {
    id: db.uid(project) || project.id,
    name: project.name || '',
    sections: recipe.length,
    ...(withRecipe ? { recipe } : {}),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

async function loadOwned(userId, id) {
  const project = await db.findBuilderProjectById(id)
  if (!project || String(project.userId) !== String(userId)) {
    throw new HttpError(404, 'Proyecto no encontrado')
  }
  return project
}

export async function listBuilderProjects(userId) {
  const rows = await db.findBuilderProjectsByUser(userId)
  return rows.map((p) => publicProject(p, { withRecipe: false }))
}

export async function getBuilderProject(userId, id) {
  return publicProject(await loadOwned(userId, id))
}

export async function createBuilderProject(userId, { name, recipe }, { maxRecipeSections }) {
  const mine = await db.findBuilderProjectsByUser(userId)
  if (mine.length >= MAX_BUILDER_PROJECTS) {
    throw new HttpError(400, `Podés guardar hasta ${MAX_BUILDER_PROJECTS} proyectos: borrá uno para sumar otro`, {
      expose: true,
    })
  }
  const project = await db.createBuilderProject({
    userId,
    name: cleanName(name),
    recipe: cleanRecipe(recipe, maxRecipeSections),
  })
  return publicProject(project)
}

export async function updateBuilderProject(userId, id, { name, recipe }, { maxRecipeSections }) {
  const project = await loadOwned(userId, id)
  if (name !== undefined) project.name = cleanName(name)
  if (recipe !== undefined) {
    project.recipe = cleanRecipe(recipe, maxRecipeSections)
    if (typeof project.markModified === 'function') project.markModified('recipe')
  }
  await project.save()
  return publicProject(project)
}

export async function deleteBuilderProject(userId, id) {
  const project = await loadOwned(userId, id)
  await db.deleteBuilderProject(db.uid(project) || project.id)
}
