import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'

/**
 * Animates a number counting up from 0 to `target` over ~1.2s with an
 * ease-out curve - reads like an odometer settling rather than a static
 * number just appearing. `format` lets it count through a formatted string
 * (e.g. formatLakhOrCrore, so it counts up through "₹4.31 L" and can even
 * cross the L→Cr unit boundary mid-count) rather than a raw integer.
 *
 * Extracted from Home's stat capsule, which needed the count to wait until
 * scrolled into view (`triggerOnView`) - calculator results don't need
 * that, since the number only exists once a fresh result has already
 * mounted on screen, so the default starts immediately on mount instead.
 */
export default function Counter({ target, suffix = '', format, triggerOnView = false }) {
  const [value, setValue] = useState(0)
  const [inView, setInView] = useState(!triggerOnView)
  const started = useRef(false)
  // A genuinely new `target` (e.g. recalculating with different inputs
  // without unmounting) must restart the count - without tracking it,
  // `started` latched true on the first result and never counted again.
  const lastTarget = useRef(target)

  useEffect(() => {
    if (lastTarget.current !== target) {
      started.current = false
      lastTarget.current = target
    }
    if (!inView || !target || started.current) return
    started.current = true
    const duration = 1200
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target])

  const content = !target ? '—' : (format ? format(value) : `${Math.round(value).toLocaleString()}${suffix}`)

  if (!triggerOnView) return <span>{content}</span>

  return (
    <motion.span onViewportEnter={() => setInView(true)} viewport={{ once: true, margin: '-40px' }}>
      {content}
    </motion.span>
  )
}
