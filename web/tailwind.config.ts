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
        pulse: {
          bg: "#050508",
          panel: "#0a0a12",
          border: "#1a1a2e",
        },
        neon: {
          cyan: "#00f0ff",
          pink: "#ff00aa",
          purple: "#b400ff",
          green: "#00ff9d",
          orange: "#ff6b00",
          yellow: "#ffee00",
          blue: "#3b82f6",
          red: "#ff3355",
        },
      },
      boxShadow: {
        "neon-cyan": "0 0 8px #00f0ff, 0 0 20px #00f0ff40",
        "neon-pink": "0 0 8px #ff00aa, 0 0 20px #ff00aa40",
        "neon-purple": "0 0 8px #b400ff, 0 0 20px #b400ff40",
        "neon-green": "0 0 8px #00ff9d, 0 0 20px #00ff9d40",
        "neon-orange": "0 0 8px #ff6b00, 0 0 20px #ff6b0040",
        "neon-yellow": "0 0 8px #ffee00, 0 0 20px #ffee0040",
        "neon-blue": "0 0 8px #3b82f6, 0 0 20px #3b82f640",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "flow": "flow 3s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        flow: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
