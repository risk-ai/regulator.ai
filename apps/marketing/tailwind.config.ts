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
        // SuperDesign palette - zinc/violet/amber
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Terminal gold — desaturated, premium governance feel
        gold: {
          50: '#fdf8ed',
          100: '#f9edcf',
          200: '#f2d99e',
          300: '#e8c06a',
          400: '#D4A853',  // Primary — matches design-system.css --v-gold
          500: '#C09440',
          600: '#A07830',
          700: '#7D5D25',
          800: '#5C4420',
          900: '#3D2D16',
          950: '#1F170B',
        },
        // Keep existing Vienna palette for backwards compat
        navy: {
          950: '#08090C',
          900: '#0D0F14',
          800: '#141820',
          700: '#1C222E',
          600: '#2A3244',
        },
        // warm neutrals for body text and soft elements
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
