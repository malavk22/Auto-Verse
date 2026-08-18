import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PasswordStrengthBar from '../components/ui/PasswordStrengthBar'
import PasswordField from '../components/ui/PasswordField'
import AuthHeader from '../components/ui/AuthHeader'
import FormError from '../components/ui/FormError'
import EmptyState from '../components/ui/EmptyState'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { openAuthModal } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const confirmTouched = confirmPassword.length > 0
  const passwordsMatch = confirmTouched && password === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto">
        <EmptyState
          icon="alertTriangle"
          tone="amber"
          title="Invalid reset link"
          description="This link is missing its reset token. Request a new one from the login screen."
          action={<Link to="/" className="text-sm font-semibold text-primary hover:underline">Back to Home</Link>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <AuthHeader subtitle="Set a new password" />

        <div className="p-6">
          {done ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 font-medium mb-1">Password reset</p>
              <p className="text-sm text-muted mb-5">You can now log in with your new password.</p>
              <button
                onClick={openAuthModal}
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-opacity text-sm shadow-card"
              >
                Log In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PasswordField
                  label="New Password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <PasswordStrengthBar password={password} />
              </div>

              <div>
                <PasswordField
                  label="Confirm New Password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {confirmTouched && (
                  <p className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${passwordsMatch ? 'text-success' : 'text-error'}`}>
                    {passwordsMatch ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
                  </p>
                )}
              </div>

              <FormError message={error} />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-opacity text-sm shadow-card"
              >
                {submitting ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
