import { formatINR } from '../../utils/formatCurrency'
import Icon from '../ui/Icon'

// Groups the flat spec list into labeled sections so it reads as a
// scannable sheet. Empty rows are filtered per-group so zebra striping
// stays contiguous instead of leaving gaps.
function buildSpecGroups(car) {
  const groups = [
    {
      label: 'Overview',
      icon: 'car',
      rows: [
        { label: 'Brand', icon: 'building', value: car.brand.name },
        { label: 'Model', icon: 'tag', value: car.model },
        { label: 'Year', icon: 'calendar', value: car.year },
      ],
    },
    {
      label: 'Performance & Efficiency',
      icon: 'road',
      rows: [
        { label: 'Fuel Type', icon: 'fuel', value: car.fuel_type },
        { label: 'Transmission', icon: 'sliders', value: car.transmission },
        { label: 'Engine', icon: 'bolt', value: car.engine_cc ? `${car.engine_cc} cc` : null },
        { label: 'Mileage', icon: 'road', value: car.mileage ? `${car.mileage} kmpl` : null },
      ],
    },
    {
      label: 'Comfort & Space',
      icon: 'users',
      rows: [
        { label: 'Seating', icon: 'users', value: car.seats ? `${car.seats} persons` : null },
      ],
    },
    {
      label: 'Pricing',
      icon: 'wallet',
      rows: [
        { label: 'Ex-showroom', icon: 'wallet', value: formatINR(car.price) },
        { label: 'Annual Service', icon: 'wallet', value: car.service_cost ? formatINR(car.service_cost) : null },
      ],
    },
  ]
  return groups
    .map(g => ({ ...g, rows: g.rows.filter(r => r.value != null && r.value !== '') }))
    .filter(g => g.rows.length > 0)
}

// Full spec table - grouped into labeled sections with per-row icons and
// zebra striping instead of one long flat list.
export default function SpecTable({ car }) {
  return (
    <>
      <h2 className="text-lg font-display font-semibold text-gray-900 mb-4">Full Specifications</h2>
      <div className="space-y-5">
        {buildSpecGroups(car).map(group => (
          <div key={group.label}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon name={group.icon} className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">{group.label}</h3>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface-alt/60' : ''}`}
                    >
                      <td className="py-2.5 px-4 w-44">
                        <div className="flex items-center gap-2 text-sm text-muted font-medium">
                          <Icon name={row.icon} className="w-4 h-4 shrink-0" />
                          {row.label}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-sm text-gray-900 font-semibold">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
