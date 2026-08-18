import { useState, useEffect, useRef } from 'react'

// A horizontally-scrolling row with desktop-only arrow buttons and edge
// fades that only appear when there's actually more content that way -
// horizontal-scroll-only is easy to miss on a non-touch desktop. Shared by
// Home's Trending Cars strip and Car Detail's Similar Cars row.
export default function HorizontalScroller({ children, className, fadeFrom = 'from-surface-alt' }) {
  const scrollRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(update, [children])

  const scrollByCard = (dir) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  return (
    <div className="relative">
      {canLeft && (
        <div aria-hidden="true" className={`pointer-events-none absolute left-0 top-0 bottom-4 w-14 bg-gradient-to-r ${fadeFrom} to-transparent z-10`} />
      )}
      {canRight && (
        <div aria-hidden="true" className={`pointer-events-none absolute right-0 top-0 bottom-4 w-14 bg-gradient-to-l ${fadeFrom} to-transparent z-10`} />
      )}
      <div ref={scrollRef} onScroll={update} className={className}>
        {children}
      </div>
      {canLeft && (
        <button
          onClick={() => scrollByCard(-1)}
          aria-label="Scroll left"
          className="hidden sm:flex absolute left-1 top-[calc(50%-1rem)] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-card border border-border items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-colors"
        >
          ←
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scrollByCard(1)}
          aria-label="Scroll right"
          className="hidden sm:flex absolute right-1 top-[calc(50%-1rem)] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-card border border-border items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-colors"
        >
          →
        </button>
      )}
    </div>
  )
}
