import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../api/auth'
import PasswordStrengthBar from './ui/PasswordStrengthBar'

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

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.22A10.48 10.48 0 001.5 12c1.7 4.28 5.9 7.5 10.5 7.5 1.6 0 3.13-.36 4.5-1.02M8.7 6.14A10.6 10.6 0 0112 5.5c4.6 0 8.8 3.22 10.5 7.5a11.36 11.36 0 01-2.16 3.36M14.83 14.83a3 3 0 11-4.24-4.24" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
    </svg>
  ) : (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12c1.7-4.28 5.9-7.5 10.5-7.5s8.8 3.22 10.5 7.5c-1.7 4.28-5.9 7.5-10.5 7.5S3.2 16.28 1.5 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconInput({ icon, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        {...props}
        className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
      />
    </div>
  )
}

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  useEffect(() => {
    if (authModalOpen) {
      setUsername(''); setEmail(''); setPassword(''); setError(null); setMode('login')
      setShowPassword(false); setForgotSent(false)
    }
  }, [authModalOpen])

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
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary to-primary-dark px-6 pt-6 pb-8 text-center">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center justify-center gap-1 mb-1.5">
            <span className="text-2xl font-display font-bold text-white">Auto</span>
            <span className="text-2xl font-display font-bold text-accent">Verse</span>
          </div>
          <p className="text-sm text-teal-100/90">
            {mode === 'forgot' ? 'Reset your password' : 'Unlock EMI, Ownership Cost & Recommendations'}
          </p>
        </div>

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
                  icon={<EnvelopeIcon />}
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email"
                />

                {error && (
                  <p className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

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
                icon={<UserIcon />}
                type="text"
                required
                minLength={3}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                aria-label="Username"
              />
            )}

            <IconInput
              icon={<EnvelopeIcon />}
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              aria-label="Email"
            />

            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full text-sm border border-border rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                  placeholder="Password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

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
              <p className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
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
