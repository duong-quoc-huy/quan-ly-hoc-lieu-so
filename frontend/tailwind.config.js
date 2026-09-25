/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: '#FAFAF8',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#1C1F26', muted: '#5B6070' },
        border: '#E3E1DA',
        primary: { DEFAULT: '#2B4C7E', hover: '#1E3A63' },
        status: { success: '#3B7A57', warning: '#B8863B', danger: '#B0413E' },
      },
    },
  },
  plugins: [],
}