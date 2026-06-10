import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="text-center py-32 px-4">
      <p className="text-6xl mb-4">🚗</p>
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">404 — Page Not Found</h1>
      <p className="text-muted mb-6">Looks like this road doesn't exist.</p>
      <Link to="/" className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
        Go Home
      </Link>
    </div>
  )
}
