import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "sans-serif"],
            },
            colors: {
                canvas: {
                    bg: "#0f0f13",
                    surface: "#18181f",
                    border: "#2a2a35",
                    accent: "#7c6af7",
                    "accent-hover": "#9b8df9",
                    muted: "#6b6b7b",
                    text: "#e2e2f0",
                    "text-secondary": "#8888a0",
                },
            },
            boxShadow: {
                glow: "0 0 20px rgba(124, 106, 247, 0.35)",
            },
        },
    },
    plugins: [],
};

export default config;
