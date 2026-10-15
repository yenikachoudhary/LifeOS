/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./context/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        peri: "#8BA2FF",
        lime: "#E3FC87",
        deep: "#253A82",
        blush: "#FFB2F7",
        sky: "#C0E0FF",
        lav: "#AB9DFF",
      },
      fontFamily: {
        sans: ["var(--font-dm)", "system-ui", "sans-serif"],
        display: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      borderRadius: { bubble: "1.75rem" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: { float: "float 4s ease-in-out infinite" },
    },
  },
  plugins: [],
};
