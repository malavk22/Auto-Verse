import { motion } from 'motion/react'
import Icon from '../ui/Icon'

// Generic pill-selector used across the Recommendations form (fuel type,
// body type, use case, year, priority, brand preference) - single or
// multi-select via `multi`.
export default function ChipGroup({ label, options, selected, onToggle, multi = false }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const val = typeof opt === 'object' ? opt.value : opt
          const active = multi ? selected.includes(val) : selected === val
          return (
            <motion.button
              key={val}
              type="button"
              onClick={() => onToggle(val)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.94 }}
              animate={active ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.25 }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white border-border text-gray-600 hover:border-primary/60 hover:text-primary'
              }`}
            >
              {typeof opt === 'object' && opt.icon && <Icon name={opt.icon} className="w-4 h-4" />}
              {typeof opt === 'object' ? opt.label : opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
