import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A192F", // Primary dark background
          900: "#0D1F3C", // Secondary dark
          800: "#112240", // Card backgrounds
        },
        cyan: {
          400: "#64FFDA", // Primary accent - cyber green-teal
          500: "#4CD8B4",
        },
        slate: {
          100: "#CCD6F6", // Primary text on dark
          400: "#8892B0", // Secondary text on dark
        },
        coral: {
          500: "#FF6B6B", // Warning accent
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
