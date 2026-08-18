import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import Icon from '../ui/Icon'

// Cars whose real-world design changed mid-lifecycle but the dataset only
// has one representative photo for - flags the image as illustrative
// rather than implying every year variant looked identical.
const REPRESENTATIVE_IMAGE_CUTOFFS = {
  City: 2020, Creta: 2020, i20: 2020, Swift: 2018, Baleno: 2022,
  Seltos: 2023, Nexon: 2023, Venue: 2023, Altroz: 2021, Thar: 2020,
}

// Main inline gallery (full-bleed image, arrows, dots, thumbnails) plus the
// fullscreen lightbox - both share the same activeImg/prev/next state since
// they're really one feature, just two views of it.
export default function CarGallery({ car, gallery }) {
  const [activeImg, setActiveImg] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const prev = useCallback(() => setActiveImg(i => (i - 1 + gallery.length) % gallery.length), [gallery.length])
  const next = useCallback(() => setActiveImg(i => (i + 1) % gallery.length), [gallery.length])

  // Left/right arrow keys browse the gallery, same as the on-image buttons -
  // skipped when the user is typing into an input/textarea elsewhere on the
  // page so it doesn't hijack normal text navigation. Escape closes the
  // lightbox if it's open.
  useEffect(() => {
    if (gallery.length <= 1 && !lightboxOpen) return
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [gallery.length, prev, next, lightboxOpen])

  const cutoff = REPRESENTATIVE_IMAGE_CUTOFFS[car.model]
  const isRepresentativeImage = cutoff && car.year && car.year < cutoff

  return (
    <>
      <div className="relative bg-surface-alt overflow-hidden">
        {/* Full-bleed object-cover - some photos crop slightly, but the
            full uncropped image is one click away via the lightbox. */}
        <div className="h-72 sm:h-96 flex items-center justify-center overflow-hidden">
          {gallery.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImg}
                src={gallery[activeImg]}
                alt={`${car.brand.name} ${car.model} view ${activeImg + 1}`}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setLightboxOpen(true)}
                className="w-full h-full object-cover cursor-zoom-in"
              />
            </AnimatePresence>
          ) : (
            <Icon name="car" className="w-32 h-32 text-gray-300" />
          )}
        </div>

        {/* Prev / Next arrows */}
        {gallery.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            >
              ›
            </button>
          </>
        )}

        {isRepresentativeImage && (
          <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
            Representative image · actual appearance may vary
          </div>
        )}

        {/* Image counter */}
        {gallery.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {activeImg + 1} / {gallery.length}
          </div>
        )}

        {/* Dot indicators - a compact at-a-glance position marker that
            reads well even when the thumbnail strip below has scrolled
            off-screen (e.g. on a small phone). */}
        {gallery.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {gallery.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeImg ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip */}
        {gallery.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-t border-border">
            {gallery.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all duration-200 ${
                  i === activeImg
                    ? 'border-primary ring-2 ring-primary/25'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`view ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen lightbox - reuses the gallery's activeImg/prev/next
          state, and renders via portal so its `fixed` positioning isn't
          affected by an ancestor's transform (Motion's page wrapper uses one). */}
      {createPortal(
        <AnimatePresence>
          {lightboxOpen && gallery.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {gallery.length > 1 && (
                <div className="absolute top-4 left-4 z-10 bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {activeImg + 1} / {gallery.length}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  src={gallery[activeImg]}
                  alt={`${car.brand.name} ${car.model} view ${activeImg + 1}`}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-[92vw] max-h-[85vh] object-contain cursor-default"
                />
              </AnimatePresence>

              {gallery.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prev() }}
                    aria-label="Previous image"
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-11 h-11 rounded-full flex items-center justify-center text-xl transition-colors"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); next() }}
                    aria-label="Next image"
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-11 h-11 rounded-full flex items-center justify-center text-xl transition-colors"
                  >
                    ›
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
