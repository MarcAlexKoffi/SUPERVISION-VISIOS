/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Empêche Tailwind d'activer le mode sombre automatiquement avec le système
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0f42a5', // UDMCI Blue
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#0f42a5', // UDMCI Deep Blue
        },
        surface: {
          50: '#f8fafc',  // Ultra light grey for app background
          100: '#f1f5f9', // Light grey for secondary background
          200: '#e2e8f0', // Borders
          300: '#cbd5e1',
          white: '#ffffff', // Cards background
        }
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)',
        'floating': '0 10px 40px -10px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')({
      strategy: 'class', // Use .form-input, .form-select to avoid breaking existing inputs
    }),
  ],
}