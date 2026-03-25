import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vienna OS institutional palette
        navy: {
          950: '#07090E',  // deepest — page bg
          900: '#0B0F19',  // primary surfaces
          800: '#111826',  // secondary surfaces
          700: '#1A2235',  // borders, dividers
          600: '#2A3448',  // interactive borders
        },
        // Accent: amber for warrants/authority
        warrant: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        // Steel for data/neutral
        steel: {
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
