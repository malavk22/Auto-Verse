// A single, consistent line-icon set for the whole app — replaces the ad-hoc
// emoji that used to stand in for icons. All icons share a 24x24 viewBox and
// render with `stroke="currentColor"`, so they inherit color and size from
// their wrapping element exactly like text does (e.g. `className="w-5 h-5 text-primary"`).

const PATHS = {
  search: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <line x1="20" y1="20" x2="14.9" y2="14.9" />
    </>
  ),
  compare: (
    <>
      <path d="M4 8h13" />
      <path d="M13 4l4 4-4 4" />
      <path d="M20 16H7" />
      <path d="M11 12l-4 4 4 4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  fuel: (
    <>
      <rect x="4" y="4" width="10" height="16" rx="1.5" />
      <path d="M8 8h2" />
      <path d="M14 9.5h2a2 2 0 012 2v5.8a1.5 1.5 0 003 0V9.5L18.5 7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M12 3.5L21.5 20h-19L12 3.5z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h9M17 6h3" />
      <circle cx="14" cy="6" r="2" />
      <path d="M4 12h3M11 12h9" />
      <circle cx="8" cy="12" r="2" />
      <path d="M4 18h9M17 18h3" />
      <circle cx="14" cy="18" r="2" />
    </>
  ),
  road: (
    <>
      <path d="M9 3L4 21" />
      <path d="M15 3l5 18" />
      <path d="M11 9h2M10.3 13h3.4M9.6 17h4.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0111 0" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M14.7 20a4.8 4.4 0 019.3 0" opacity="0.55" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="9" height="18" rx="1" />
      <rect x="13" y="9" width="7" height="12" rx="1" />
      <path d="M7 7h2M7 11h2M7 15h2M16 13h2M16 17h2" />
    </>
  ),
  flag: (
    <>
      <path d="M6 3v18" />
      <path d="M6 4h12l-2.5 3.5L18 11H6" />
    </>
  ),
  star: (
    <path d="M12 2.5l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.8 5.7 21.8l1.7-7.1L2 9.9l7.1-.5z" />
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  tag: (
    <>
      <path d="M3 3h8l10 10-8 8L3 11V3z" />
      <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  trendingUp: (
    <>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </>
  ),
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  award: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M9 12.5L7 21l5-3 5 3-2-8.5" />
    </>
  ),
  heart: (
    <path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.9.7 5 2.3C11.6 4.7 13.5 3.7 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3z" />
  ),
  flame: (
    <path d="M12 21a7 7 0 01-7-7c0-4 3-6 4-10 1 2 1 4 3 4s2-2 1-4c3 2 6 6 6 10a7 7 0 01-7 7z" />
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  hatchback: (
    <>
      <path d="M3 16V13L6 10L8 9H15L17 12L19 13V16Z" />
      <circle cx="7" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  sedan: (
    <>
      <path d="M2 16V13L5 10L7 9H12L14 11.5L20 12L21 13.5V16Z" />
      <circle cx="6" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
}

/**
 * A themed line icon. Fill-based icons (currently just `car`) opt out of the
 * shared stroke styling via the `filled` prop.
 */
export default function Icon({ name, className = 'w-5 h-5', filled = false, strokeWidth = 1.75 }) {
  if (name === 'car') {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="currentColor">
        <path d="M54 22l-4-8a4 4 0 0 0-3.6-2.2H17.6A4 4 0 0 0 14 14l-4 8A6 6 0 0 0 6 28v8a2 2 0 0 0 2 2h2a6 6 0 0 0 12 0h20a6 6 0 0 0 12 0h2a2 2 0 0 0 2-2v-8a6 6 0 0 0-4-6zM18 40a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm28 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM12 26l3.2-6.4A2 2 0 0 1 17 18h30a2 2 0 0 1 1.8 1.6L52 26H12z" />
      </svg>
    )
  }

  const path = PATHS[name]
  if (!path) return null

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  )
}
