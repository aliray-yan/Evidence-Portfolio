import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111318",
        mist: "#f4f6f8",
        forge: {
          blue: "#4ea0dc",
          pink: "#ef5b9b",
          yellow: "#ffd22e",
          orange: "#ff6a2d",
          green: "#75c943"
        }
      },
      boxShadow: {
        canvas: "0 24px 80px rgba(15, 23, 42, 0.16)",
        panel: "0 12px 40px rgba(15, 23, 42, 0.09)"
      }
    }
  },
  plugins: []
};

export default config;
