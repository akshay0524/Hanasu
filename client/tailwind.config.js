/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#121212',
                    800: '#1E1E1E',
                    700: '#2C2C2C',
                    600: '#3A3A3A',
                },
                primary: '#8b5cf6', // Violet
                secondary: '#10b981', // Emerald
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
