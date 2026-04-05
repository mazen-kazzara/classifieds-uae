/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        danger: "var(--danger)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "app-bg": "var(--bg)",
        "app-text": "var(--text)",
        "app-muted": "var(--text-muted)",
        "app-border": "var(--border)",
      },
      fontFamily: {
        sans: ["Inter", "Cairo", "sans-serif"],
        cairo: ["Cairo", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      borderRadius: {
        md: "10px",
        lg: "14px",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
    },
  },
  plugins: [],
};
