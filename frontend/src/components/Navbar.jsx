import { useState, useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react'
import { useCompare } from '../context/CompareContext'
import { useAuth } from '../context/AuthContext'
import Icon from './ui/Icon'

function HeartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.9.7 5 2.3C11.6 4.7 13.5 3.7 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3z" />
    </svg>
  )
}

const NAV_LINKS = [
  { to: '/',               label: 'Home',        end: true  },
  { to: '/cars',           label: 'Browse Cars', end: false },
  { to: '/compare',        label: 'Compare',     end: false, badge: true },
  { to: '/calculator',     label: 'Calculator',  end: false },
  { to: '/recommendations',label: 'Recommend',   end: false },
]

function Avatar({ username, className = '' }) {
  const initial = username?.[0]?.toUpperCase() || '?'
  return (
    <div className={`rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold shrink-0 ${className}`}>
      {initial}
    </div>
  )
}

// Animated count badge — pops in with a spring whenever the count itself
// changes (keyed on the number), instead of just appearing/updating flatly.
function CountBadge({ count, className = '' }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className={`bg-accent text-white font-bold rounded-full flex items-center justify-center ${className}`}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative pl-3 ml-1 border-l border-border" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
        className="flex items-center gap-2 rounded-full hover:bg-surface-alt pl-0.5 pr-2 py-0.5 transition-colors"
      >
        <Avatar username={user?.username} className="w-8 h-8 text-sm" />
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50 origin-top-right"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-alt">
              <Avatar username={user?.username} className="w-9 h-9 text-sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.username}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
            </div>
            <Link
              to="/favorites"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-surface-alt transition-colors"
            >
              <HeartIcon />
              Favorites
            </Link>
            <button
              onClick={() => { logout(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 text-left px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-error transition-colors border-t border-border"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3" />
              </svg>
              Log Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Desktop nav links with a shared-layout "pill" that glides between items
// as you hover, instead of each link just changing color on its own.
function DesktopNavLinks({ compareCount }) {
  const [hovered, setHovered] = useState(null)

  return (
    <nav className="hidden md:flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {NAV_LINKS.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onMouseEnter={() => setHovered(link.to)}
          className={({ isActive }) =>
            `relative px-3 py-2 text-sm font-medium transition-colors rounded-lg ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
          }
        >
          {hovered === link.to && (
            <motion.span
              layoutId="nav-hover-pill"
              className="absolute inset-0 bg-primary/8 rounded-lg -z-10"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
          )}
          {link.label}
          {link.badge && (
            <CountBadge count={compareCount} className="absolute -top-1.5 -right-2 text-[10px] w-4 h-4" />
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default function Navbar() {
  const { compareList } = useCompare()
  const { user, isAuthenticated, logout, openAuthModal } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 8)
  })

  return (
    <motion.header
      animate={{
        boxShadow: scrolled ? '0 4px 16px -4px rgb(0 0 0 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.03)',
      }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled ? 'bg-white/90 backdrop-blur-md border-border' : 'bg-white border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-1 shrink-0 group" onClick={() => setOpen(false)}>
          <motion.span
            className="text-2xl font-display font-bold text-primary"
            whileHover={{ rotate: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            Auto
          </motion.span>
          <span className="text-2xl font-display font-bold text-accent">Verse</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <DesktopNavLinks compareCount={compareList.length} />

          {/* Recently Visited works without login (purely localStorage),
              so its entry point has to live outside the auth-gated user
              menu below - otherwise a guest could never reach it. */}
          <Link
            to="/history"
            aria-label="Recently visited cars"
            title="Recently Visited"
            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-surface-alt transition-colors"
          >
            <Icon name="history" className="w-5 h-5" />
          </Link>

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <motion.button
              onClick={openAuthModal}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="text-sm font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors ml-2"
            >
              Log In
            </motion.button>
          )}
        </div>

        {/* Mobile: compare badge + hamburger */}
        <div className="md:hidden flex items-center gap-3">
          {compareList.length > 0 && (
            <Link to="/compare" className="relative text-sm font-medium text-gray-600">
              Compare
              <CountBadge count={compareList.length} className="absolute -top-2 -right-3 text-[10px] w-4 h-4" />
            </Link>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
            aria-label="Toggle menu"
          >
            <motion.svg
              className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </motion.svg>
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden border-t border-border bg-white px-4 overflow-hidden"
          >
            <div className="py-1">
              {NAV_LINKS.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between py-3.5 text-sm font-medium border-b border-gray-100 last:border-0 transition-colors ${
                      isActive ? 'text-primary' : 'text-gray-700'
                    }`
                  }
                >
                  <span>{link.label}</span>
                  {link.badge && compareList.length > 0 && (
                    <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {compareList.length}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* Outside NAV_LINKS (which also drives the desktop pill nav,
                  where this already has its own icon button) and outside
                  the auth block below, since it works without login. */}
              <NavLink
                to="/history"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 py-3.5 text-sm font-medium border-b border-gray-100 transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-700'
                  }`
                }
              >
                <Icon name="history" className="w-4 h-4" />
                Recently Visited
              </NavLink>

              {isAuthenticated ? (
                <div className="py-2 border-t border-border">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar username={user?.username} className="w-8 h-8 text-sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
                        <p className="text-xs text-muted truncate">{user?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { logout(); setOpen(false) }}
                      className="text-sm font-medium text-error shrink-0 ml-3"
                    >
                      Log Out
                    </button>
                  </div>
                  <Link
                    to="/favorites"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-gray-700"
                  >
                    <HeartIcon />
                    Favorites
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => { openAuthModal(); setOpen(false) }}
                  className="w-full text-left py-3.5 text-sm font-semibold text-primary"
                >
                  Log In
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
