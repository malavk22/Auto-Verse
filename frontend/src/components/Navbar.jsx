import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'

const NAV_LINKS = [
  { to: '/',               label: 'Home',        end: true  },
  { to: '/cars',           label: 'Browse Cars', end: false },
  { to: '/compare',        label: 'Compare',     end: false, badge: true },
  { to: '/calculator',     label: 'Calculator',  end: false },
  { to: '/recommendations',label: 'Recommend',   end: false },
]

export default function Navbar() {
  const { compareList } = useCompare()
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-1 shrink-0" onClick={() => setOpen(false)}>
          <span className="text-2xl font-display font-bold text-primary">Auto</span>
          <span className="text-2xl font-display font-bold text-accent">Verse</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `relative text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
              }
            >
              {link.label}
              {link.badge && compareList.length > 0 && (
                <span className="absolute -top-2 -right-3 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {compareList.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile: compare badge + hamburger */}
        <div className="md:hidden flex items-center gap-3">
          {compareList.length > 0 && (
            <Link to="/compare" className="relative text-sm font-medium text-gray-600">
              Compare
              <span className="absolute -top-2 -right-3 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {compareList.length}
              </span>
            </Link>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {open && (
        <nav className="md:hidden border-t border-border bg-white px-4 py-1">
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
        </nav>
      )}
    </header>
  )
}
