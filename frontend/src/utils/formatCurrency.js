export function formatINR(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatLakh(amount) {
  if (amount == null) return '—'
  const lakh = amount / 100000
  return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} L`
}

// Like formatLakh, but switches to Crore above ₹1Cr - the dataset now spans
// ₹4.3L hatchbacks to ₹1.36Cr Porsches, and "₹136 L" reads worse than "₹1.36 Cr".
export function formatLakhOrCrore(amount) {
  if (amount == null) return '—'
  if (amount >= 10000000) {
    const crore = amount / 10000000
    return `₹${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Cr`
  }
  return formatLakh(amount)
}
