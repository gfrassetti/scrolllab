import { useT } from '../i18n'

const STATUS_CLASS = {
  paid: 'text-success',
  pending: 'text-warning',
  failed: 'text-danger',
}

/** Único lugar donde se decide cómo se ve un estado de orden. */
export default function OrderStatus({ status, className = '' }) {
  const t = useT()
  const key = status in STATUS_CLASS ? status : 'failed'
  return (
    <span className={`${STATUS_CLASS[key]} ${className}`.trim()}>
      {t(`account.${key}`)}
    </span>
  )
}
