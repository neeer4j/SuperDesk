/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,jsx}",
        "./src/components/**/*.{js,jsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#613da9',
                    light: '#8b5cf6',
                    dark: '#4c2d8a',
                },
                accent: {
                    DEFAULT: '#7c3aed',
                    light: '#a78bfa',
                },
                surface: {
                    light: '#f8f7fc',
                    dark: '#0d0d14',
                },
                card: {
                    light: '#ffffff',
                    dark: '#1a1a2e',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
