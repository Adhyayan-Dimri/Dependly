/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          dark: "#0A0E14",
          surface: "#141B26",
          card: "#1C2333",
          border: "#2A364F",
          hover: "#222D42"
        },
        signal: {
          green: "#3DDC97",
          greenDim: "rgba(61, 220, 151, 0.15)",
          red: "#FF5D5D",
          redDim: "rgba(255, 93, 93, 0.15)",
          amber: "#F5A623",
          amberDim: "rgba(245, 166, 35, 0.15)",
          blue: "#4D96FF",
          blueDim: "rgba(77, 150, 255, 0.15)"
        },
        text: {
          primary: "#E6EDF3",
          secondary: "#8B949E",
          muted: "#5B6878"
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 25px rgba(61, 220, 151, 0.25)',
        'glow-red': '0 0 25px rgba(255, 93, 93, 0.35)',
        'glow-amber': '0 0 25px rgba(245, 166, 35, 0.25)',
        'glow-blue': '0 0 25px rgba(77, 150, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
