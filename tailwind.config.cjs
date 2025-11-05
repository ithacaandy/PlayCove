
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./app/**/*.{js,jsx,ts,tsx}",
  "./app/components/**/*.{js,jsx,ts,tsx}"
],
  theme: {
    extend: {
      colors: {
        brand: "#E3B341",
        brandDark: "#C49A33",
        terra: "#D96C3B",
        sage: "#9BBF9B",
        denim: "#5A7D9A",
        cream: "#F7F3E8",
        card: "#FFFFFF",
        ink: "#2E2E2E",
        stone: "#58534B",
        border: "#E3DFD7",
        danger: "#C9574C",
        success: "#6EA77A",
      },
      boxShadow: {
        card: "0 6px 18px rgba(0,0,0,0.06)",
        soft: "0 10px 30px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
