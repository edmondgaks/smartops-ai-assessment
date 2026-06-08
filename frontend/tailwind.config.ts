import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",   // toggled by adding/removing 'dark' on <html>
  theme: {
    extend: {
      fontFamily: {
        mono: ["IBM Plex Mono", "Courier New", "monospace"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      colors: {
        // Accent palette used across both themes
        accent: {
          DEFAULT: "#7c6af7",
          bright: "#9b8cff",
          dim: "#3d3580",
          muted: "rgba(124,106,247,0.15)",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease both",
        "spin-slow": "spin 0.7s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
