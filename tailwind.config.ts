import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0f2a36",
          900: "#0a1e27",
          800: "#0f2a36",
          700: "#183947",
        },
        teal: {
          50: "#e6f0f2",
          100: "#c6dde1",
          500: "#2d7280",
          600: "#1f5a66",
          700: "#174b55",
        },
        brand: {
          mint: "#d6e8e2",
          mintSoft: "#e9f2ee",
          pinkSoft: "#fbe9ea",
          cream: "#f1f3f2",
        },
        accent: {
          orange: "#ff4f17",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
