/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode (useful for theming)
    theme: {
        extend: {
            colors: {
                // Semantic colors using CSS variables
                bg: {
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    panel: 'var(--bg-panel)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    accent: 'var(--text-accent)',
                },
                accent: {
                    DEFAULT: 'var(--accent-primary)',
                    hover: 'var(--accent-hover)',
                    glow: 'var(--accent-glow)',
                },
                // Hanasu warm palette tokens
                hanasu: {
                    orange: '#FF6A00',
                    amber: '#FFB000',
                    yellow: '#FFD166',
                    bg: '#090705',
                    surface: '#12100D',
                    surface2: '#191510',
                    text: '#FFF7EA',
                    muted: '#B8AA98',
                    border: 'rgba(255, 177, 0, 0.16)',
                },
                // Keep existing palettes for backward compatibility or specific use
                dark: {
                    900: '#0f172a',
                    800: '#1e293b',
                    700: '#334155',
                },
                sakura: {
                    DEFAULT: '#f472b6',
                    dark: '#db2777',
                },
                neon: {
                    blue: '#00f3ff',
                    pink: '#ff00ff',
                    yellow: '#fcee0a',
                }
            },
            fontFamily: {
                sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
                display: ['Space Grotesk', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
                japanese: ['Noto Serif JP', 'serif'],
            },
        },
    },
    plugins: [],
}
