/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: '#020617',
                    light: '#0f172a',
                },
                primary: {
                    DEFAULT: '#10b981',
                    dark: '#059669',
                    light: '#34d399',
                    glow: 'rgba(16, 185, 129, 0.4)',
                },
                secondary: {
                    DEFAULT: '#6366f1',
                    dark: '#4f46e5',
                    light: '#818cf8',
                },
                accent: {
                    DEFAULT: '#f59e0b',
                    dark: '#d97706',
                    light: '#fbbf24',
                },
                card: {
                    DEFAULT: 'rgba(30, 41, 59, 0.7)',
                    border: 'rgba(255, 255, 255, 0.1)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px -5px rgba(16, 185, 129, 0.5)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            backdropBlur: {
                'xs': '2px',
            }
        },
    },
    plugins: [],
}
