/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // EU institutional palette
        eu: {
          blue: "#003399",
          gold: "#FFCC00",
          ink: "#0E1A2B",
          slate: {
            50: "#F6F8FB",
            100: "#EAF0F7",
            200: "#D1DAE6",
            300: "#9FB1C7",
            500: "#5A6E89",
            700: "#2D3E55",
            900: "#101B2C",
          },
        },
        sev: {
          low: "#5A8A5C",
          medium: "#D38B1F",
          high: "#C4582C",
          critical: "#A02323",
          info: "#4570A6",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Source Serif Pro", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,26,44,.06), 0 4px 14px rgba(15,26,44,.06)",
      },
    },
  },
  plugins: [],
};
