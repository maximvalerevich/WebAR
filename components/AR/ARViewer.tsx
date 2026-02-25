"use client";

import { useEffect, useRef } from "react";
import type { Artwork } from "@/types";

interface ARViewerProps {
    artwork: Artwork | null;
    planeSrc?: string;
}

/**
 * ARViewer
 *
 * Renders a Google <model-viewer> element for mobile AR preview.
 * Artwork dimensions (width_cm × height_cm) are converted to metres and
 * passed as model-viewer's `scale` attribute for real-world sizing.
 *
 * State sync: artwork prop is driven by the same selectedArtwork state
 * as the 2D canvas, so AR always reflects the current selection.
 */
export function ARViewer({ artwork, planeSrc = "/plane.glb" }: ARViewerProps) {
    const viewerRef = useRef<HTMLElement>(null);

    const widthM = artwork ? +(artwork.width_cm / 100).toFixed(3) : 0.5;
    const heightM = artwork ? +(artwork.height_cm / 100).toFixed(3) : 0.5;
    const scale = `${widthM} ${heightM} 0.01`;
    const poster = artwork?.imageUrl ?? "";

    useEffect(() => {
        const el = viewerRef.current;
        if (!el || !artwork) return;
        el.setAttribute("poster", artwork.imageUrl);
        el.setAttribute("scale", scale);
    }, [artwork, scale]);

    if (!artwork) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-canvas-text-secondary p-4">
                <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                <p className="text-xs text-center">Select a painting to<br />preview in AR</p>
            </div>
        );
    }

    // model-viewer is loaded globally via CDN script in layout.tsx
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ModelViewer = "model-viewer" as any;

    return (
        <div className="relative w-full h-full min-h-[240px]">
            <ModelViewer
                ref={viewerRef}
                src={planeSrc}
                poster={poster}
                alt={artwork.title}
                ar
                ar-modes="webxr scene-viewer quick-look"
                camera-controls
                auto-rotate
                scale={scale}
                shadow-intensity="1"
                shadow-softness="0.8"
                exposure="1"
                style={{ width: "100%", height: "100%", minHeight: "240px", background: "transparent" }}
            >
                <button
                    slot="ar-button"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-canvas-accent hover:bg-canvas-accent-hover text-white px-4 py-2 rounded-xl font-medium text-xs transition-all shadow-glow flex items-center gap-1.5"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                    </svg>
                    View in AR
                </button>
            </ModelViewer>

            <div className="absolute top-2 left-2 bg-canvas-surface/80 backdrop-blur border border-canvas-border rounded-lg px-2 py-1 text-xs font-mono text-canvas-text-secondary">
                {artwork.width_cm} × {artwork.height_cm} cm
            </div>
        </div>
    );
}
