/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A7A7A',
          dark: '#0F5555',
        },
        accent: {
          DEFAULT: '#F5A623',
          dark: '#D4891A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F7FAFA',
        },
        border: '#E0EEEE',
        muted: '#6B7280',
        error: '#DC2626',
        success: '#16A34A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.08)',
        'card-hover': '0 4px 12px rgba(0,0,0,.10)',
        lg: '0 8px 24px rgba(0,0,0,.12)',
      },
    },
  },
  plugins: [],
}
