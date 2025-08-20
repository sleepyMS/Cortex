// file: frontend/tailwind.config.js

import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        "basic-primary": "hsl(var(--basic-primary))",
        "basic-secondary": "hsl(var(--basic-secondary))",
        "trader-primary": "hsl(var(--trader-primary))",
        "trader-secondary": "hsl(var(--trader-secondary))",
        "pro-primary": "hsl(var(--pro-primary))",
        "pro-secondary": "hsl(var(--pro-secondary))",
        brown: {
          50: "#fdf8f6",
          100: "#f2e8e1",
          200: "#eaddd7",
          300: "#e0cec7",
          400: "#d1b9b0",
          500: "#a37e56", // 동색과 유사한 갈색
          600: "#926a4c",
          700: "#7d523a",
          800: "#683f2a",
          900: "#583625",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
