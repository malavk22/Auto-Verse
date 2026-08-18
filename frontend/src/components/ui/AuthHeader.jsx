// The gradient "AutoVerse" header used at the top of every auth surface
// (login/signup modal, forgot-password, reset-password page). Extracted once
// ResetPassword.jsx needed the identical block AuthModal.jsx already had.
export default function AuthHeader({ subtitle, onClose }) {
  return (
    <div className="relative bg-gradient-to-br from-primary to-primary-dark px-6 pt-6 pb-8 text-center">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="flex items-center justify-center gap-1 mb-1.5">
        <span className="text-2xl font-display font-bold text-white">Auto</span>
        <span className="text-2xl font-display font-bold text-accent">Verse</span>
      </div>
      <p className="text-sm text-teal-100/90">{subtitle}</p>
    </div>
  )
}
