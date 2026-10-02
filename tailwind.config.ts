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
        // Teal "hospitalité" — accent principal du simulateur
        brand: {
          50:  "#e4f4f8",
          100: "#c3e6ee",
          200: "#93d4e1",
          300: "#5bbdd1",
          400: "#2a9fbb",
          500: "#0e7490",
          600: "#0b5e74",
          700: "#0a4d60",
          800: "#083c4b",
          900: "#052630",
        },
        gold: {
          400: "#f5c842",
          500: "#e8b800",
          600: "#c9a000",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Sora", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,32,40,.06), 0 6px 20px rgba(16,32,40,.06)",
      },
    },
  },
  plugins: [],
};

export default config;
