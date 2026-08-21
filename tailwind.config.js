/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Teacher accent (blue)
        "teacher-50": "#eff6ff",
        "teacher-100": "#dbeafe",
        "teacher-200": "#bfdbfe",
        "teacher-500": "#3b82f6",
        "teacher-600": "#2563eb",
        "teacher-700": "#1d4ed8",
        // Student accent (green)
        "student-50": "#f0fdf4",
        "student-100": "#dcfce7",
        "student-200": "#bbf7d0",
        "student-500": "#22c55e",
        "student-600": "#16a34a",
        "student-700": "#15803d",
      },
    },
  },
  plugins: [],
};
