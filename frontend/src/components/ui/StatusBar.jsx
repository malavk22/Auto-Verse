// Indian-style comma grouping (last 3 digits, then pairs): 581900 -> 5,81,900
function formatGrouped(value) {
  if (value === '' || value === null || value === undefined) return ''
  const str = String(value)
  const negative = str.startsWith('-')
  const [intPart, decPart] = (negative ? str.slice(1) : str).split('.')
  const lastThree = intPart.slice(-3)
  const rest = intPart.slice(0, -3)
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  const grouped = rest ? `${groupedRest},${lastThree}` : lastThree
  return `${negative ? '-' : ''}${grouped}${decPart !== undefined ? '.' + decPart : ''}`
}

export default function StatusBar({ label, icon, min, max, step, value, onChange, format, unit, color = 'bg-primary' }) {
  const pct = Math.round(((Math.min(value, max) - min) / (max - min)) * 100)

  const handleInput = (raw) => {
    const cleaned = raw.replace(/,/g, '')
    const v = Number(cleaned)
    if (isNaN(v) || cleaned === '') return
    onChange(Math.min(max, Math.max(min, v)))
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={formatGrouped(value)}
            onChange={e => handleInput(e.target.value)}
            onBlur={e => handleInput(e.target.value)}
            className="w-28 text-sm font-bold text-primary text-center bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
          />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className={`absolute left-0 top-0 h-full ${color} rounded-full transition-all duration-150`} style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={Math.min(value, max)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-3 opacity-0 cursor-pointer block -mt-5"
      />
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}
