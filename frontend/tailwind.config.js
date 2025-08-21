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
          500: "hsl(var(--brown-500))",
          600: "hsl(var(--brown-600))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
