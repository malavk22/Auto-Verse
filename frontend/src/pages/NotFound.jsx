import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'

export default function NotFound() {
  return (
    <div className="py-16">
      <EmptyState
        icon="road"
        tone="gray"
        title="404 — Page Not Found"
        description="Looks like this road doesn't exist."
        action={
          <Link to="/" className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
            Go Home
          </Link>
        }
      />
    </div>
  )
}
