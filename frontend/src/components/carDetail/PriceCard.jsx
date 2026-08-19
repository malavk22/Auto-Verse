import { useNavigate } from 'react-router-dom'
import { formatLakhOrCrore, formatINR } from '../../utils/formatCurrency'
import { useCompare } from '../../context/CompareContext'
import Icon from '../ui/Icon'

// Quick client-side EMI estimate for the price card, using the same
// defaults EmiCalculatorPanel seeds with, so the two numbers never
// contradict. Computed locally instead of the real endpoint (which
// requires login) so this teaser works without gating it behind auth.
function estimateMonthlyEmi(price) {
  if (!price) return null
  const onRoad = price * 1.1
  const loan = onRoad * 0.8
  const monthlyRate = 9.5 / 1200
  const n = 60
  const factor = Math.pow(1 + monthlyRate, n)
  return (loan * monthlyRate * factor) / (factor - 1)
}

// Price + CTA card - pulled into its own bordered block with fixed-width,
// icon-led buttons so the stack reads as one deliberate action group
// instead of three ragged-width links of differing widths and colors.
// `cardRef` is forwarded up to CarDetail so it can watch this card with an
// IntersectionObserver to drive the sticky mini bar's visibility.
export default function PriceCard({ car, cardRef }) {
  const navigate = useNavigate()
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()
  const monthlyEmi = estimateMonthlyEmi(Number(car.price))

  return (
    <div ref={cardRef} className="w-full sm:w-64 shrink-0 bg-surface-alt rounded-xl p-4 text-right">
      <p className="text-xs text-muted mb-1">Ex-showroom price</p>
      <p className="text-3xl font-display font-bold text-primary leading-tight">{formatLakhOrCrore(car.price)}</p>
      {monthlyEmi != null && (
        <p
          className="text-xs text-gray-600 mt-1 mb-3"
          title="Estimate: ex-showroom + 10% on-road, 20% down payment, 9.5% p.a., 60-month tenure"
        >
          Starts at <span className="font-semibold text-gray-900">{formatINR(Math.round(monthlyEmi))}/mo*</span>
        </p>
      )}
      <div className="flex flex-col gap-2 pt-3 border-t border-border/70">
        <button
          onClick={() => isInCompare(car.id) ? removeFromCompare(car.id) : addToCompare(car)}
          disabled={compareList.length >= 3 && !isInCompare(car.id)}
          className={`w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
            isInCompare(car.id)
              ? 'bg-primary text-white border-primary'
              : 'bg-white border-border text-gray-700 hover:border-primary hover:text-primary disabled:opacity-40'
          }`}
        >
          <Icon name="compare" className="w-4 h-4 shrink-0" />
          {isInCompare(car.id) ? 'Added to Compare' : 'Add to Compare'}
        </button>
        <button
          onClick={() => navigate(`/calculator?car_id=${car.id}`)}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-accent bg-white text-accent hover:bg-accent hover:text-white transition-colors"
        >
          <Icon name="wallet" className="w-4 h-4 shrink-0" />
          Ownership Cost
        </button>
        <button
          onClick={() => navigate(`/calculator?car_id=${car.id}&tab=emi`)}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-primary bg-white text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <Icon name="bolt" className="w-4 h-4 shrink-0" />
          Calculate EMI
        </button>
      </div>
    </div>
  )
}
