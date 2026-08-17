import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import Navbar from './components/Navbar'
import CompareBar from './components/CompareBar'
import AuthModal from './components/AuthModal'
import Home from './pages/Home'
import CarListing from './pages/CarListing'
import CarDetail from './pages/CarDetail'
import Compare from './pages/Compare'
import OwnershipCalculator from './pages/OwnershipCalculator'
import Recommendations from './pages/Recommendations'
import ResetPassword from './pages/ResetPassword'
import Favorites from './pages/Favorites'
import History from './pages/History'
import NotFound from './pages/NotFound'
import { CompareProvider } from './context/CompareContext'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'

function AnimatedRoutes() {
  const location = useLocation()

  // React Router doesn't reset scroll position on navigation the way a
  // real page load would - a link clicked from partway down a scrolled
  // page (e.g. a car card near the bottom of Browse Cars) would otherwise
  // open the new page still scrolled to that same pixel offset, since the
  // browser just keeps whatever scrollY it already had.
  //
  // `behavior: 'instant'` is required here, not just `window.scrollTo(0, 0)`
  // - the <html> element has global `scroll-behavior: smooth` CSS (used
  // intentionally elsewhere, e.g. the EMI calculator scrolling to its
  // results), which would otherwise make this animate smoothly back to top
  // over time instead of snapping there immediately like a real page load.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<CarListing />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/calculator" element={<OwnershipCalculator />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    // reducedMotion="user" makes every Motion animation in the app defer to
    // the OS-level "reduce motion" accessibility setting automatically.
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <FavoritesProvider>
          <CompareProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1 pb-14">
                <AnimatedRoutes />
              </main>
              <CompareBar />
              <AuthModal />
            </div>
          </CompareProvider>
        </FavoritesProvider>
      </AuthProvider>
    </MotionConfig>
  )
}
