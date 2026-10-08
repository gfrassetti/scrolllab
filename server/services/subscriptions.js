/**
 * Suscripciones de LAB (Fase 4) — Mercado Pago PreApproval. El código vive en
 * server/services/subscriptions/: billing (períodos y reglas base),
 * entitlement (qué puede usar el usuario), planChange (upgrade / downgrade) y
 * mpSync (eventos y estados de MP) y start (el alta). Este archivo re-exporta la API pública:
 * los imports existentes no cambian.
 */
export {
  MIN_UPGRADE_CHARGE,
  addBillingCycle,
  subtractBillingCycle,
  trialEligible,
  paidWindow,
} from './subscriptions/billing.js'
export {
  resolveEntitlement,
  assertCanPublish,
} from './subscriptions/entitlement.js'
export {
  isHigherPlan,
  quoteUpgrade,
  upgradeReference,
  parseUpgradeReference,
  isUpgradeReference,
  previewPlanChange,
  changeSubscriptionPlan,
  applyUpgradePayment,
  applyMockUpgrade,
} from './subscriptions/planChange.js'
export {
  handlePreapprovalEvent,
  syncSubscriptionForUser,
  handleAuthorizedPaymentEvent,
  cancelPreapprovalConfirmed,
  closeLapsedSubscription,
  retirePendingSubscription,
  activateMockSubscription,
} from './subscriptions/mpSync.js'
export { startSubscription } from './subscriptions/start.js'
