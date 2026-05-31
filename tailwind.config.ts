import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#18212f",
        maple: "#b4222a",
        lake: "#0f6b80",
        spruce: "#1f6f50",
        wheat: "#f2d388",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(24, 33, 47, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
