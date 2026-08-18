import { motion, AnimatePresence } from 'motion/react'

// A form-level error banner that gives itself a brief shake on arrival -
// motion draws the eye to it instead of the message just silently appearing
// among static form fields. Keyed on the message text so a new error
// (even with the same wording) re-triggers the shake.
export default function FormError({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          key={message}
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
