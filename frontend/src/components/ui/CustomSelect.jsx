import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function CustomSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!buttonRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (dropdownRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  const toggle = () => {
    if (disabled) return
    if (!open && buttonRef.current) setPos(buttonRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  const selected = options.find(o => o.value === value)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm transition-all
          ${disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' : ''}
          ${!disabled && open ? 'border-primary ring-2 ring-primary/20 bg-white' : ''}
          ${!disabled && !open ? 'border-border bg-white hover:border-primary/60 hover:shadow-sm' : ''}`}
      >
        <span className={selected?.value !== '' && selected ? 'text-gray-900 font-medium' : 'text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.bottom + 4, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: 220 }}
          className="bg-white border border-border rounded-xl shadow-lg overflow-y-auto"
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left
                ${o.value === value ? 'bg-primary/8 text-primary font-semibold' : 'text-gray-700 hover:bg-surface-alt'}`}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
