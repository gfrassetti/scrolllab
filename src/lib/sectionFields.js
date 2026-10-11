// Los campos editables viven en src/domain/sectionFields/ (dominio puro: lo importan
// el front y el servidor). Este archivo re-exporta todo para que los imports de
// siempre no cambien. Un campo nuevo se escribe en fields/<modelo>.js.
export * from '../domain/sectionFields/index.js'
