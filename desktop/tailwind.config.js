/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB', // Blue 600
        secondary: '#4F46E5', // Indigo 600
        accent: '#0EA5E9', // Sky 500
        background: '#F8FAFC', // Slate 50
        surface: '#FFFFFF', // White
        foreground: '#0F172A', // Slate 900
        muted: '#64748B', // Slate 500
        border: '#E2E8F0', // Slate 200
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        danger: '#EF4444', // Red 500
      }
    },
  },
  plugins: [],
}
