/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#6366f1", light: "#8b5cf6" },
        surface: { DEFAULT: "#0a0a0f", raised: "#0f0f18" },
        q1: "#ef4444",
        q2: "#f59e0b",
        q3: "#3b82f6",
        q4: "#6b7280",
      },
    },
  },
  plugins: [],
};
