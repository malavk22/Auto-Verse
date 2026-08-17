import { motion } from 'motion/react'
import Icon from './Icon'

const TONES = {
  primary: 'bg-primary/10 text-primary',
  rose: 'bg-rose-50 text-rose-500',
  amber: 'bg-amber-50 text-amber-600',
  gray: 'bg-gray-100 text-gray-400',
}

export default function EmptyState({ icon, title, description, action, tone = 'primary' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="text-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${TONES[tone]}`}
      >
        <Icon name={icon} className="w-7 h-7" strokeWidth={1.5} />
      </motion.div>
      <p className="font-display font-semibold text-gray-800 text-lg mb-1.5">{title}</p>
      {description && <p className="text-sm text-muted mb-5 max-w-sm mx-auto">{description}</p>}
      {action}
    </motion.div>
  )
}
