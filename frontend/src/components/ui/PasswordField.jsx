import { useState } from 'react'

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

// A password input with a show/hide toggle. `icon` is optional (as used in
// AuthModal); omit it for a label-above layout like ResetPassword's.
export default function PasswordField({ icon, label, className = '', ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">{label}</label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          {...inputProps}
          type={visible ? 'text' : 'password'}
          className={`w-full text-sm border border-border rounded-xl ${icon ? 'pl-10' : 'px-4'} pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  )
}
