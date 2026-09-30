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
        brand: {
          50:  "#eef1f8",
          100: "#d5dced",
          200: "#abbad9",
          300: "#8197c5",
          400: "#5775b0",
          500: "#1a2744",
          600: "#16203a",
          700: "#12192d",
          800: "#0e1221",
          900: "#0a0c15",
        },
        gold: {
          400: "#f5c842",
          500: "#e8b800",
          600: "#c9a000",
        },
      },
    },
  },
  plugins: [],
};

export default config;
