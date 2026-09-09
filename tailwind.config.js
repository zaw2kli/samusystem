/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#070B10",
          900: "#0B1118",
          800: "#101820",
          700: "#151E28",
          600: "#1D2833",
          border: "#212C38",
        },
        accent: {
          DEFAULT: "#3FD6E0",
          dim: "#1F5C63",
          bright: "#7CF0F7",
        },
        status: {
          ok: "#3ECF8E",
          warn: "#E7B93E",
          bad: "#E75A5A",
          info: "#4C9AFF",
        },
        ink: {
          DEFAULT: "#E7EDF3",
          muted: "#9AA9B8",
          faint: "#5D6B79",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        none: "none",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse-dot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
