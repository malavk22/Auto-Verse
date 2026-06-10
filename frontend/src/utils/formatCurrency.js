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
