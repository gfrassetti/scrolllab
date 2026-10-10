import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import ProjectList from './ProjectList.jsx'

/**
 * «Proyectos del builder» en Mi cuenta: la misma lista del panel del builder,
 * con abrir (lleva al builder con ese proyecto) y borrar. Sin proyectos no se
 * muestra: la cuenta no suma una sección vacía para quien nunca usó el builder.
 */
export default function AccountProjects({ t, locale }) {
  const [projects, setProjects] = useState(null)
  const navigate = useNavigate()

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

  if (!projects?.length) return null

  return (
    <section id="proyectos" className="mt-16 scroll-mt-24" data-account-projects>
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
          onRemove={async (id) => {
            await api.builderProjectDelete(id)
            setProjects((list) => list.filter((p) => p.id !== id))
          }}
        />
      </div>
    </section>
  )
}
