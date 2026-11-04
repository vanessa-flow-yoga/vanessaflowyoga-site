import checkout from '../../shared/checkout.cjs'

export function changePrice(plan, amount) {
  if (plan.amount !== amount) plan.momence_confirmed_amount = null
  plan.amount = amount
}

export function confirmPrice(plan, checked) {
  plan.momence_confirmed_amount = checked ? plan.amount : null
}

export function preparePrices(plans) {
  for (const plan of plans) {
    const id = checkout.productId(plan.booking_url)
    if (!id) throw Error(`${plan.label}: paste a valid Momence membership link.`)
    if (!Number.isInteger(plan.amount) || plan.amount < 1 || plan.amount > 5000) throw Error(`${plan.label}: enter a whole-pound price between £1 and £5,000.`)
    if (plan.amount !== plan.momence_confirmed_amount) throw Error(`${plan.label}: tick the confirmation that £${plan.amount} matches Momence.`)
  }
  for (const plan of plans) {
    plan.product_id = checkout.productId(plan.booking_url)
    plan.booking_url = plan.booking_url.trim()
  }
}
