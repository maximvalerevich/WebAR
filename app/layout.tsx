import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Virtual Art Try-On | See Art on Your Wall",
    description:
        "Upload a photo of your wall and virtually place fine art prints with real-world scale accuracy, perspective correction, and AR preview.",
    keywords: ["art try-on", "virtual wall art", "augmented reality art", "room visualizer"],
    openGraph: {
        title: "Virtual Art Try-On",
        description: "See how art looks on your wall before you buy.",
        type: "website",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <head>
                {/* Google model-viewer CDN */}
                <script
                    type="module"
                    src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
                    async
                />
            </head>
            <body className={`${inter.variable} font-sans bg-canvas-bg text-canvas-text antialiased`}>
                {children}
            </body>
        </html>
    );
}
