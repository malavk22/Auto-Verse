import { useState, useEffect, useRef, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../api/auth'
import PasswordStrengthBar from './ui/PasswordStrengthBar'
import PasswordField from './ui/PasswordField'
import AuthHeader from './ui/AuthHeader'
import FormError from './ui/FormError'

function UserIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 7l9.03 6.02a1.5 1.5 0 001.66 0L22.22 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3M6 10.5h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 19.5V12A1.5 1.5 0 016 10.5z" />
    </svg>
  )
}

const IconInput = forwardRef(function IconInput({ icon, ...props }, ref) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        ref={ref}
        {...props}
        className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
      />
    </div>
  )
})

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, login, register, sessionExpired } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (authModalOpen) {
      setUsername(''); setEmail(''); setPassword(''); setError(null); setMode('login')
      setForgotSent(false)
      // Wait a beat for the entrance animation to mount the field before
      // focusing it, so focus doesn't land while the modal is still sliding in.
      const t = setTimeout(() => firstFieldRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [authModalOpen])

  useEffect(() => {
    if (!authModalOpen) return
    const onKeyDown = e => { if (e.key === 'Escape') closeAuthModal() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [authModalOpen, closeAuthModal])

  const switchTab = (next) => {
    if (next === mode) return
    setMode(next)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(username, email, password)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await forgotPassword(email)
      setForgotSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {authModalOpen && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeAuthModal}
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        <AuthHeader
          onClose={closeAuthModal}
          subtitle={
            mode === 'forgot' ? 'Reset your password'
            : sessionExpired ? 'Your session expired — log back in to continue'
            : 'Unlock EMI, Ownership Cost & Recommendations'
          }
        />

        {mode !== 'forgot' && (
          /* Tab switcher — overlaps the header for a layered look */
          <div className="px-6 -mt-4 relative">
            <div className="flex gap-1 bg-white shadow-card rounded-xl p-1 border border-border">
              {[
                { key: 'login', label: 'Log In' },
                { key: 'register', label: 'Sign Up' },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={`relative isolate flex-1 text-sm font-semibold py-2.5 rounded-lg transition-colors ${
                    mode === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === t.key && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      className="absolute inset-0 bg-primary rounded-lg shadow-sm -z-10"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'forgot' ? (
          <div className="px-6 pt-5 pb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className="text-xs font-semibold text-primary hover:underline mb-4 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Log In
            </button>

            {forgotSent ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-1">Check your inbox</p>
                <p className="text-sm text-muted">If an account exists for <span className="font-medium text-gray-700">{email}</span>, we've sent a link to reset your password.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <p className="text-sm text-muted -mt-1 mb-1">Enter your email and we'll send you a link to reset your password.</p>
                <IconInput
                  ref={firstFieldRef}
                  icon={<EnvelopeIcon />}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email"
                />

                <FormError message={error} />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-opacity text-sm shadow-card"
                >
                  {submitting ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6 space-y-3.5">
            {mode === 'register' && (
              <IconInput
                ref={firstFieldRef}
                icon={<UserIcon />}
                type="text"
                required
                minLength={3}
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                aria-label="Username"
              />
            )}

            <IconInput
              ref={mode === 'register' ? undefined : firstFieldRef}
              icon={<EnvelopeIcon />}
              type="email"
              required
              autoComplete={mode === 'register' ? 'email' : 'username'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              aria-label="Email"
            />

            <div>
              <PasswordField
                icon={<LockIcon />}
                required
                minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
              />

              {mode === 'register' ? (
                <PasswordStrengthBar password={password} />
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setForgotSent(false) }}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {error && (
              <FormError message={error} />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-opacity text-sm shadow-card flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Please wait…
                </>
              ) : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
