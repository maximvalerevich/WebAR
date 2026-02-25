import { NextResponse } from "next/server";
import { ArtworkSchema } from "@/types";
import { z } from "zod";

/** Mock artwork catalogue — replace with DB/CMS query in production */
const ARTWORKS_DATA = [
    {
        id: "artwork-1",
        title: "Starry Night",
        artist: "Vincent van Gogh",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        width_cm: 92.1,
        height_cm: 73.7,
        dpi: 150,
        frame_options: [
            { id: "none", style: "No Frame", width_mm: 0, color: "transparent" },
            { id: "black-wood", style: "Black Wood", width_mm: 30, color: "#1a1a1a" },
            { id: "walnut", style: "Walnut", width_mm: 25, color: "#5C3D1E" },
            { id: "white-gallery", style: "White Gallery", width_mm: 20, color: "#f5f5f0" },
        ],
    },
    {
        id: "artwork-2",
        title: "The Great Wave",
        artist: "Katsushika Hokusai",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",
        width_cm: 100,
        height_cm: 69,
        dpi: 150,
        frame_options: [
            { id: "none", style: "No Frame", width_mm: 0, color: "transparent" },
            { id: "black-wood", style: "Black Wood", width_mm: 30, color: "#1a1a1a" },
            { id: "bamboo", style: "Bamboo", width_mm: 20, color: "#8B7355" },
        ],
    },
    {
        id: "artwork-3",
        title: "Girl with a Pearl Earring",
        artist: "Johannes Vermeer",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg",
        width_cm: 45,
        height_cm: 40,
        dpi: 300,
        frame_options: [
            { id: "none", style: "No Frame", width_mm: 0, color: "transparent" },
            { id: "gold-ornate", style: "Gold Ornate", width_mm: 50, color: "#B8860B" },
            { id: "dark-mahogany", style: "Dark Mahogany", width_mm: 35, color: "#3D1C02" },
        ],
    },
    {
        id: "artwork-4",
        title: "The Persistence of Memory",
        artist: "Salvador Dalí",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg",
        width_cm: 76,
        height_cm: 52,
        dpi: 150,
        frame_options: [
            { id: "none", style: "No Frame", width_mm: 0, color: "transparent" },
            { id: "silver-metal", style: "Silver Metal", width_mm: 15, color: "#C0C0C0" },
            { id: "black-wood", style: "Black Wood", width_mm: 30, color: "#1a1a1a" },
        ],
    },
    {
        id: "artwork-5",
        title: "Water Lilies",
        artist: "Claude Monet",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg",
        width_cm: 120,
        height_cm: 80,
        dpi: 150,
        frame_options: [
            { id: "none", style: "No Frame", width_mm: 0, color: "transparent" },
            { id: "white-gallery", style: "White Gallery", width_mm: 20, color: "#f5f5f0" },
            { id: "teal-accent", style: "Teal Accent", width_mm: 15, color: "#2a6b6b" },
        ],
    },
];

const ArtworksResponseSchema = z.array(ArtworkSchema);

export async function GET() {
    try {
        const validated = ArtworksResponseSchema.parse(ARTWORKS_DATA);
        return NextResponse.json(validated, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
        });
    } catch (error) {
        console.error("[API/artworks] Validation error:", error);
        return NextResponse.json({ error: "Internal schema validation error" }, { status: 500 });
    }
}
