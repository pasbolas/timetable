import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        palette: {
          gold: "#C8B273",
          plum: "#834655",
          mauve: "#9F5069",
          blush: "#F6CAC9",
          charcoal: "#424242",
        },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        lecture: {
          light: "#E5EDF4",
          dark: "#1e293b",
          accent: "#2563eb",
          pill: "rgba(37, 99, 235, 0.12)",
          border: "rgba(37, 99, 235, 0.25)"
        },
        lab: {
          light: "#F0E8F5",
          dark: "#2e1065",
          accent: "#9333ea",
          pill: "rgba(147, 51, 234, 0.12)",
          border: "rgba(147, 51, 234, 0.25)"
        },
        tutorial: {
          light: "#E8F2E6",
          dark: "#064e3b",
          accent: "#16a34a",
          pill: "rgba(22, 163, 74, 0.12)",
          border: "rgba(22, 163, 74, 0.25)"
        },
        studio: {
          light: "#FEF3C7",
          dark: "#451a03",
          accent: "#d97706",
          pill: "rgba(217, 119, 6, 0.12)",
          border: "rgba(217, 119, 6, 0.25)"
        },
        clinical: {
          light: "#FFE4E6",
          dark: "#4c0519",
          accent: "#e11d48",
          pill: "rgba(225, 29, 72, 0.12)",
          border: "rgba(225, 29, 72, 0.25)"
        }
      },
      fontFamily: {
        sans: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ],
      }
    },
  },
  plugins: [heroui()],
}
