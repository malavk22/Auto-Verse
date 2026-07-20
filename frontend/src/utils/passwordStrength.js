const LABELS = ['Too weak', 'Weak', 'Medium', 'Strong']

export function passwordStrength(password) {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  const varietyCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(password)).length
  if (varietyCount >= 3) score++
  const clamped = Math.min(score, 3)
  return { score: clamped, label: LABELS[clamped] }
}
