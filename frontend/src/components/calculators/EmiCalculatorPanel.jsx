import { useState, useEffect, useRef } from 'react'
import { getEmi } from '../../api/calculators'
import { formatINR, formatLakh } from '../../utils/formatCurrency'
import StatusBar from '../ui/StatusBar'
import { useAuth } from '../../context/AuthContext'

export default function EmiCalculatorPanel({ car }) {
  const { isAuthenticated, openAuthModal } = useAuth()
  const [onRoadPrice, setOnRoadPrice] = useState(1000000)
  const [downPayment, setDownPayment] = useState(200000)
  const [interestRate, setInterestRate] = useState(9.5)
  const [tenureMonths, setTenureMonths] = useState(60)

  const [result, setResult] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)
  const resultsRef = useRef(null)

  useEffect(() => {
    if (!car?.price) return
    const price = Math.round(Number(car.price) * 1.1)
    setOnRoadPrice(price)
    setDownPayment(Math.round(price * 0.2))
    setResult(null)
  }, [car?.id])

  const handleCalculate = async () => {
    if (!isAuthenticated) { openAuthModal(); return }
    setCalculating(true)
    setError(null)
    try {
      const data = await getEmi(onRoadPrice, downPayment, interestRate, tenureMonths)
      setResult(data)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Failed to calculate. Please try again.')
    } finally {
      setCalculating(false)
    }
  }

  const principalPct = result ? (Number(result.loan_amount) / Number(result.total_payment)) * 100 : 0
  const interestPct = result ? 100 - principalPct : 0

  return (
    <>
      {car && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          {car.image_url && (
            <img src={car.image_url} alt={car.model} className="w-16 h-11 object-cover rounded-lg shrink-0 border border-border" />
          )}
          <p className="text-sm text-gray-700">
            Prefilled from <span className="font-semibold">{car.brand.name} {car.model}</span> — adjust below as needed.
          </p>
        </div>
      )}

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-5">
        <h2 className="text-base font-display font-semibold text-gray-900 mb-5">Loan Details</h2>
        <div className="space-y-4">
          <StatusBar label="On-Road Price" icon="🏷️" min={100000} max={10000000} step={10000}
            value={onRoadPrice} onChange={setOnRoadPrice}
            format={v => `₹${(v / 100000).toFixed(1)}L`} unit="₹" color="bg-primary" />
          <StatusBar label="Down Payment" icon="💰" min={0} max={onRoadPrice} step={5000}
            value={Math.min(downPayment, onRoadPrice)} onChange={setDownPayment}
            format={v => `₹${(v / 100000).toFixed(1)}L`} unit="₹" color="bg-accent" />
          <StatusBar label="Interest Rate" icon="📈" min={5} max={20} step={0.1}
            value={interestRate} onChange={setInterestRate}
            format={v => `${v}%`} unit="% p.a." color="bg-purple-500" />
          <StatusBar label="Loan Tenure" icon="🗓️" min={12} max={84} step={12}
            value={tenureMonths} onChange={setTenureMonths}
            format={v => `${(v / 12).toFixed(0)} yr${v > 12 ? 's' : ''}`} unit="months" color="bg-orange-500" />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={calculating || downPayment > onRoadPrice}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm shadow-card mb-5"
      >
        {calculating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Calculating…
          </>
        ) : 'Calculate EMI'}
      </button>

      {error && <p className="mb-5 text-sm text-error text-center">{error}</p>}

      {result && (
        <div ref={resultsRef} className="space-y-5">

          {/* Total banner */}
          <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6">
            <p className="text-sm font-medium text-teal-100 mb-1">
              Monthly EMI — {result.tenure_months} months @ {Number(result.interest_rate)}% p.a.
            </p>
            <p className="text-4xl font-display font-bold">{formatINR(result.monthly_emi)}<span className="text-lg font-normal">/mo</span></p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div>
                <p className="text-teal-200 text-xs">Loan Amount</p>
                <p className="font-semibold">{formatINR(result.loan_amount)}</p>
              </div>
              <div>
                <p className="text-teal-200 text-xs">Down Payment</p>
                <p className="font-semibold">{formatINR(result.down_payment)} ({Number(result.down_payment_pct)}%)</p>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-base font-display font-semibold text-gray-900 mb-4">Total Repayment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Principal</p>
                <p className="text-lg font-display font-bold text-blue-700">{formatLakh(result.loan_amount)}</p>
                <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${principalPct}%` }} />
                </div>
                <p className="text-xs text-muted mt-1 text-right">{principalPct.toFixed(1)}% of total</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">Interest</p>
                <p className="text-lg font-display font-bold text-purple-700">{formatLakh(result.total_interest)}</p>
                <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${interestPct}%` }} />
                </div>
                <p className="text-xs text-muted mt-1 text-right">{interestPct.toFixed(1)}% of total</p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted">Total Payment (Principal + Interest)</span>
              <span className="text-lg font-display font-bold text-gray-900">{formatINR(result.total_payment)}</span>
            </div>
          </div>

          {/* Amortization schedule */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-base font-display font-semibold text-gray-900 mb-1">Yearly Amortization Schedule</h3>
            <p className="text-xs text-muted mb-5">How much of your EMI goes toward principal vs. interest each year.</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide py-2 pr-3">Year</th>
                    <th className="text-left text-xs font-semibold text-blue-600 uppercase tracking-wide py-2 pr-3">Principal Paid</th>
                    <th className="text-left text-xs font-semibold text-purple-600 uppercase tracking-wide py-2 pr-3">Interest Paid</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map(row => (
                    <tr key={row.year} className="border-b border-border last:border-0">
                      <td className="py-3 pr-3 text-sm font-medium text-gray-900">Year {row.year}</td>
                      <td className="py-3 pr-3 text-sm text-blue-700 font-semibold">{formatINR(row.principal_paid)}</td>
                      <td className="py-3 pr-3 text-sm text-purple-700 font-semibold">{formatINR(row.interest_paid)}</td>
                      <td className="py-3 text-sm text-gray-500">{formatINR(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assumptions */}
          <div className="bg-surface-alt rounded-xl p-5 text-xs text-muted space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Assumptions</p>
            <p>• Reducing-balance (standard bank) EMI method</p>
            <p>• EMI = P × r × (1+r)ⁿ ÷ ((1+r)ⁿ − 1), where r is the monthly interest rate</p>
            <p>• Indicative only — excludes processing fees, insurance bundling, and prepayment charges</p>
          </div>
        </div>
      )}
    </>
  )
}
