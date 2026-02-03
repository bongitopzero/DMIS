/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F5F2",
        card: "#FFFFFF",
        primary: "#9C6B3F",
        text: "#2E2E2E",
        muted: "#6B6B6B",
        critical: "#B94A48",
        moderate: "#C9A227",
        low: "#4E8A64",
      },
    },
  },
  plugins: [],
};
