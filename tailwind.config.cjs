/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: '1rem',
                sm: '2rem',
                lg: '4rem',
                xl: '5rem',
                '2xl': '6rem',
            },
        },
        extend: {
            fontFamily: {
                'display': ['Playfair Display', 'Georgia', 'serif'],
                'sans': ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                marinho: {
                    DEFAULT: '#1e1b4b',
                    light: '#312e81',
                    dark: '#0f172a',
                },
                sage: {
                    DEFAULT: '#7a9a8a',
                    50: '#f4f7f5',
                    100: '#e6ece9',
                    200: '#cddad3',
                    300: '#a8c0b3',
                    400: '#7a9a8a',
                    500: '#5c7a6a',
                    600: '#486255',
                    700: '#3b5046',
                    800: '#32423a',
                    900: '#2b3831',
                },
                cream: {
                    DEFAULT: '#f5f2eb',
                    50: '#faf9f6',
                    100: '#f5f2eb',
                    200: '#e8e4db',
                    300: '#d8d2c5',
                    400: '#c4bbaa',
                    500: '#b0a593',
                    600: '#9a8d7a',
                    700: '#807465',
                    800: '#6a6055',
                    900: '#585049',
                },
                charcoal: {
                    DEFAULT: '#2a3a35',
                    50: '#f5f6f6',
                    100: '#e5e8e7',
                    200: '#cdd2d0',
                    300: '#aab3af',
                    400: '#7f8c87',
                    500: '#64716c',
                    600: '#505b57',
                    700: '#434c48',
                    800: '#393f3c',
                    900: '#2a3a35',
                },
                gold: {
                    DEFAULT: '#c9a962',
                    light: '#dfc88a',
                    dark: '#a88c4a',
                },
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(30, 27, 75, 0.04)',
                'glass-lg': '0 16px 48px 0 rgba(30, 27, 75, 0.08)',
                'glass-xl': '0 24px 64px 0 rgba(30, 27, 75, 0.12)',
                'premium': '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
                'premium-hover': '0 30px 60px -12px rgba(0, 0, 0, 0.25)',
                'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                '3d': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 20s linear infinite',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeIn: {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
