import { Link, NavLink } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'

export default function Navbar() {
  const { compareList } = useCompare()

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-primary">Auto</span>
          <span className="text-2xl font-display font-bold text-accent">Verse</span>
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/cars"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
            }
          >
            Browse Cars
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) =>
              `relative text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
            }
          >
            Compare
            {compareList.length > 0 && (
              <span className="absolute -top-2 -right-3 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {compareList.length}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/calculator"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
            }
          >
            Calculator
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
