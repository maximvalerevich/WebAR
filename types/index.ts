import { z } from "zod";

// ─── Frame Option ────────────────────────────────────────────────────────────

export const FrameOptionSchema = z.object({
    id: z.string(),
    /** Display name, e.g. "Black Wood", "Walnut", "No Frame" */
    style: z.string(),
    /** Frame border width in millimetres */
    width_mm: z.number().min(0),
    /** CSS-compatible color string */
    color: z.string(),
});

export type FrameOption = z.infer<typeof FrameOptionSchema>;

// ─── Artwork ─────────────────────────────────────────────────────────────────

export const ArtworkSchema = z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    /** Absolute or relative URL to the artwork image */
    imageUrl: z.string().url(),
    /** Physical width in centimetres (print / canvas size) */
    width_cm: z.number().positive(),
    /** Physical height in centimetres */
    height_cm: z.number().positive(),
    /**
     * Dots per inch of the source image.
     * Used to verify print quality: (width_cm / 2.54) * dpi = required pixel width.
     */
    dpi: z.number().positive(),
    /** Available frame configurations */
    frame_options: z.array(FrameOptionSchema),
    /** Optional AR model file (GLB/GLTF) */
    modelUrl: z.string().url().optional(),
    price: z.number().positive().optional(),
    category: z.string().optional(),
});

export type Artwork = z.infer<typeof ArtworkSchema>;

// ─── Calibration ─────────────────────────────────────────────────────────────

export interface CalibrationState {
    /** Resolved pixels-per-centimetre ratio, null until calibrated */
    pixelsPerCm: number | null;
    /** Canvas-space start point of the reference ruler line */
    lineStart: { x: number; y: number } | null;
    /** Canvas-space end point of the reference ruler line */
    lineEnd: { x: number; y: number } | null;
    /** Real-world length the drawn line represents */
    realWorldCm: number;
    /** Whether the ruler tool is currently active */
    isDrawing: boolean;
}

// ─── Corner Pin ──────────────────────────────────────────────────────────────

export interface CornerPoints {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
}

// ─── Shadow Settings ─────────────────────────────────────────────────────────

export interface ShadowSettings {
    enabled: boolean;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
    color: string;
}

// ─── App State ───────────────────────────────────────────────────────────────

export type ActiveTool = "select" | "ruler" | "cornerpin" | "shadow" | "none";

// ─── View Mode ───────────────────────────────────────────────────────────────

/** "canvas" = static wall photo with Konva canvas; "live" = real-time camera feed */
export type ViewMode = "canvas" | "live";
