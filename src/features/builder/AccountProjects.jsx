import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import ProjectList from './ProjectList.jsx'
import { addProjectToCart, useProjectsInCart } from './projectCart.js'

/**
 * «Proyectos del builder» en Mi cuenta: la misma lista del panel del builder,
 * con abrir (lleva al builder con ese proyecto) y borrar. Sin proyectos no se
 * muestra: la cuenta no suma una sección vacía para quien nunca usó el builder.
 */
export default function AccountProjects({ t, locale, showEmpty = false }) {
  const [projects, setProjects] = useState(null)
  const navigate = useNavigate()
  const inCartIds = useProjectsInCart()

  useEffect(() => {
    let cancelled = false
    api
      .builderProjects()
      .then((data) => {
        if (!cancelled) setProjects(data.projects || [])
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (projects === null) return null
  if (!projects.length) {
    if (!showEmpty) return null
    return (
      <div className="border border-dashed border-ink/20 px-6 py-10 text-center" data-account-projects>
        <p className="mx-auto max-w-[48ch] text-body text-ink/60">{t('builder.projects.empty')}</p>
        <Link to="/builder" className="btn btn-ghost mt-5">
          {t('account.projectsNew')}
        </Link>
      </div>
    )
  }

  return (
    <section id="proyectos" className={`scroll-mt-24 ${showEmpty ? '' : 'mt-16'}`} data-account-projects>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title-sm font-medium tracking-[-0.01em]">{t('account.projectsTitle')}</h2>
          <p className="mt-1 max-w-[52ch] text-body-sm text-ink/60">{t('account.projectsBody')}</p>
        </div>
        <Link
          to="/builder"
          className="min-h-11 content-center text-[11px] uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-accent"
        >
          {t('account.projectsNew')}
        </Link>
      </div>
      <div className="mt-6">
        <ProjectList
          t={t}
          locale={locale}
          projects={projects}
          onOpen={(id) => navigate(`/builder?project=${encodeURIComponent(id)}`)}
          onAddToCart={(project) => addProjectToCart(project, t('builder.compositionTitle'))}
          inCartIds={inCartIds}
          onRemove={async (id) => {
            await api.builderProjectDelete(id)
            setProjects((list) => list.filter((p) => p.id !== id))
          }}
        />
      </div>
    </section>
  )
}
