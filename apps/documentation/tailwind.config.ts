import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        surface: "#141415",
        "surface-2": "#1a1a1c",
        border: "#1f1f23",
        "border-2": "#2a2a2f",
        "text-1": "#e5e5e7",
        "text-2": "#8b8b96",
        "text-3": "#55555e",
        accent: "#c8ff00",
        "accent-dim": "#8fb800",
        "accent-muted": "rgba(200,255,0,0.12)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
