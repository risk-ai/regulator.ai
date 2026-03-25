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
        // Vienna OS — Institutional Governance Palette
        // Dark foundation with warm undertones (not cold tech blue/purple)
        navy: {
          950: '#08090C',   // deepest
          900: '#0D0F14',   // primary bg
          800: '#141820',   // card bg
          700: '#1C222E',   // borders
          600: '#2A3244',   // active borders
        },
        // Gold/amber for authority, warrants, seals
        gold: {
          50:  '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE080',
          300: '#FFD040',
          400: '#D4A520',   // classic gold — authority
          500: '#B8860B',   // dark gold
        },
        // Slate with warm undertones
        warm: {
          50:  '#F8F7F5',
          100: '#E8E6E1',
          200: '#D4D0C8',
          300: '#B0AAA0',
          400: '#8A8478',
          500: '#6B6560',
          600: '#4A4540',
          700: '#2D2A26',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
