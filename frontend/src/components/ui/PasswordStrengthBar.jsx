import { passwordStrength } from '../../utils/passwordStrength'

const BAR_COLORS = ['bg-gray-200', 'bg-error', 'bg-yellow-500', 'bg-green-500']
const LABEL_COLORS = ['text-muted', 'text-error', 'text-yellow-600', 'text-green-600']

export default function PasswordStrengthBar({ password }) {
  if (!password) return null
  const { score, label } = passwordStrength(password)

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? BAR_COLORS[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-[11px] mt-1 font-medium ${LABEL_COLORS[score]}`}>{label}</p>
    </div>
  )
}
