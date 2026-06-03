import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        pine: "#2f5d50",
        moss: "#6f8c4f",
        primer: "#f4efe6",
        clay: "#b86f52",
        steel: "#5b6874"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
