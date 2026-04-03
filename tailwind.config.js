/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#e67e22",
          "orange-hover": "#d35400",
          "orange-light": "#fef5ef",
        },
      },
    },
  },
  plugins: [],
}

