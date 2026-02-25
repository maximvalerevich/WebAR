"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type Konva from "konva";
import type { Artwork, ActiveTool, ShadowSettings } from "@/types";
import { useScaleCalculator } from "@/hooks/useScaleCalculator";
import { ShadowSettingsPanel } from "@/components/Canvas/ShadowSettings";
import { exportCanvas } from "@/lib/exportCanvas";

// Dynamic imports with ssr:false — konva requires browser canvas API
const WallCanvas = dynamic(
    () => import("@/components/Canvas/WallCanvas").then((m) => m.WallCanvas),
    { ssr: false, loading: () => <div className="w-full h-full bg-canvas-bg rounded-xl animate-pulse" /> }
);
const ARViewer = dynamic(
    () => import("@/components/AR/ARViewer").then((m) => m.ARViewer),
    { ssr: false }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: { id: ActiveTool; label: string; icon: string; tip: string }[] = [
    { id: "select", label: "Select", icon: "cursor", tip: "Move artwork" },
    { id: "ruler", label: "Ruler", icon: "ruler", tip: "Calibrate scale" },
    { id: "cornerpin", label: "Corner Pin", icon: "pin", tip: "Perspective distortion" },
    { id: "shadow", label: "Shadow", icon: "shadow", tip: "Configure shadow" },
];

// ─── SVG icon map ─────────────────────────────────────────────────────────────

function ToolIcon({ name }: { name: string }) {
    const icons: Record<string, React.ReactNode> = {
        cursor: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 15l-5.5 5.5M3.5 3.5l17 7-7 3.5-3.5 7-6.5-17.5z" />
        ),
        ruler: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 6h18M3 10h3m3 0h3m3 0h3M3 14h18M3 18h3m3 0h3m3 0h3" />
        ),
        pin: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M5 5l14 14M5 19l14-14M5 5h4m10 0v4M5 19h4m10 0v-4" />
        ),
        shadow: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M2.5 2.5l19 19M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1v-4M15 4h4a1 1 0 011 1v4" />
        ),
    };
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
            {icons[name]}
        </svg>
    );
}

// ─── Artwork Thumbnail Card ────────────────────────────────────────────────────

function ArtworkCard({
    artwork,
    selected,
    onClick,
}: {
    artwork: Artwork;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`group relative flex flex-col gap-1.5 p-2 rounded-xl border transition-all text-left ${selected
                ? "border-canvas-accent bg-canvas-accent/10 shadow-glow"
                : "border-canvas-border bg-canvas-surface hover:border-canvas-accent/50"
                }`}
        >
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-canvas-bg">
                <Image
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </div>
            <div>
                <p className="text-xs font-medium text-canvas-text leading-tight truncate">{artwork.title}</p>
                <p className="text-xs text-canvas-muted truncate">{artwork.artist}</p>
                <p className="text-xs font-mono text-canvas-text-secondary mt-0.5">
                    {artwork.width_cm}×{artwork.height_cm} cm
                </p>
            </div>
            {selected && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-canvas-accent rounded-full animate-pulse-glow" />
            )}
        </button>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArtTryOnPage() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
    const [selectedFrameId, setSelectedFrameId] = useState<string>("none");
    const [activeTool, setActiveTool] = useState<ActiveTool>("select");
    const [showAR, setShowAR] = useState(false);
    const [exportFormat, setExportFormat] = useState<"jpeg" | "png">("jpeg");
    const [isExporting, setIsExporting] = useState(false);
    const [resetCornersTrigger, setResetCornersTrigger] = useState(0);

    const [shadow, setShadow] = useState<ShadowSettings>({
        enabled: true,
        blur: 24,
        offsetX: 8,
        offsetY: 12,
        opacity: 0.45,
        color: "#000000",
    });

    const scaleCalc = useScaleCalculator();
    const stageRef = useRef<Konva.Stage | null>(null);

    // Fetch artwork catalogue
    useEffect(() => {
        fetch("/api/artworks")
            .then((r) => r.json())
            .then((data: Artwork[]) => {
                setArtworks(data);
                setSelectedArtwork(data[0] ?? null);
            })
            .catch(console.error);
    }, []);

    // Reset frame when artwork changes
    const handleSelectArtwork = useCallback((art: Artwork) => {
        setSelectedArtwork(art);
        setSelectedFrameId(art.frame_options[0]?.id ?? "none");
    }, []);

    const handleExport = useCallback(async () => {
        if (!stageRef.current) return;
        setIsExporting(true);
        try {
            await exportCanvas(stageRef.current, exportFormat);
        } finally {
            setIsExporting(false);
        }
    }, [exportFormat]);

    const handleToolClick = useCallback((toolId: ActiveTool) => {
        setActiveTool((prev) => (prev === toolId ? "select" : toolId));
        if (toolId === "shadow") {
            // Shadow panel is shown in right sidebar — just switch view
        }
    }, []);

    return (
        <main className="h-screen flex flex-col bg-canvas-bg overflow-hidden">
            {/* ── Top Bar ── */}
            <header className="flex-none h-14 flex items-center justify-between px-5 border-b border-canvas-border bg-canvas-surface/80 backdrop-blur-sm z-20">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-canvas-accent flex items-center justify-center shadow-glow">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-canvas-text tracking-tight">ArtVision</span>
                    <span className="text-canvas-border">|</span>
                    <span className="text-xs text-canvas-text-secondary hidden sm:block">Virtual Art Try-On</span>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 bg-canvas-bg/60 border border-canvas-border rounded-xl p-1">
                    {TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            title={tool.tip}
                            onClick={() => handleToolClick(tool.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTool === tool.id
                                ? "bg-canvas-accent text-white shadow-glow"
                                : "text-canvas-text-secondary hover:text-canvas-text hover:bg-canvas-surface"
                                }`}
                        >
                            <ToolIcon name={tool.icon} />
                            <span className="hidden md:inline">{tool.label}</span>
                        </button>
                    ))}
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAR((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showAR
                            ? "bg-canvas-accent/20 border-canvas-accent text-canvas-accent"
                            : "border-canvas-border text-canvas-text-secondary hover:text-canvas-text hover:border-canvas-accent/50"
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                        <span className="hidden sm:inline">AR</span>
                    </button>

                    <div className="flex items-center rounded-lg border border-canvas-border overflow-hidden">
                        <select
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value as "jpeg" | "png")}
                            className="bg-canvas-surface text-canvas-text-secondary text-xs px-2 py-1.5 border-r border-canvas-border outline-none cursor-pointer"
                        >
                            <option value="jpeg">JPG</option>
                            <option value="png">PNG</option>
                        </select>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas-surface text-canvas-text-secondary hover:text-canvas-accent hover:bg-canvas-accent/10 text-xs font-medium transition-all disabled:opacity-50"
                        >
                            {isExporting ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                            Export
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar: Artwork selector */}
                <aside className="flex-none w-52 border-r border-canvas-border bg-canvas-surface/50 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-canvas-border">
                        <h2 className="text-xs font-semibold text-canvas-text-secondary uppercase tracking-wider">
                            Artworks
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                        {artworks.map((art) => (
                            <ArtworkCard
                                key={art.id}
                                artwork={art}
                                selected={selectedArtwork?.id === art.id}
                                onClick={() => handleSelectArtwork(art)}
                            />
                        ))}
                    </div>
                </aside>

                {/* Main canvas area */}
                <div className="flex-1 relative overflow-hidden p-3">
                    <WallCanvas
                        selectedArtwork={selectedArtwork}
                        selectedFrameId={selectedFrameId}
                        activeTool={activeTool}
                        shadow={shadow}
                        scaleCalc={scaleCalc}
                        stageRef={stageRef}
                        resetCornersTrigger={resetCornersTrigger}
                    />
                </div>

                {/* Right sidebar: Frame selector + Shadow settings + AR */}
                <aside className="flex-none w-64 border-l border-canvas-border bg-canvas-surface/50 flex flex-col overflow-hidden">
                    {/* Calibration status */}
                    <div className="p-3 border-b border-canvas-border">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-canvas-text-secondary uppercase tracking-wider">
                                Calibration
                            </span>
                            {scaleCalc.calibration.pixelsPerCm && (
                                <button
                                    onClick={scaleCalc.resetCalibration}
                                    className="text-xs text-canvas-muted hover:text-canvas-accent transition-colors"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        {scaleCalc.calibration.pixelsPerCm ? (
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs font-mono text-green-400">
                                    {scaleCalc.calibration.pixelsPerCm.toFixed(2)} px/cm
                                </span>
                            </div>
                        ) : (
                            <p className="text-xs text-canvas-muted">
                                Use the{" "}
                                <button
                                    onClick={() => setActiveTool("ruler")}
                                    className="text-canvas-accent hover:underline"
                                >
                                    Ruler tool
                                </button>{" "}
                                to calibrate
                            </p>
                        )}
                    </div>

                    {/* Frame selector */}
                    {selectedArtwork && (
                        <div className="p-3 border-b border-canvas-border">
                            <h3 className="text-xs font-semibold text-canvas-text-secondary uppercase tracking-wider mb-2">
                                Frame
                            </h3>
                            <div className="flex flex-col gap-1.5">
                                {selectedArtwork.frame_options.map((fo) => (
                                    <button
                                        key={fo.id}
                                        onClick={() => setSelectedFrameId(fo.id)}
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${selectedFrameId === fo.id
                                            ? "border-canvas-accent bg-canvas-accent/10 text-canvas-accent"
                                            : "border-canvas-border text-canvas-text-secondary hover:border-canvas-accent/40"
                                            }`}
                                    >
                                        <span
                                            className="w-4 h-4 rounded border border-white/10 flex-none"
                                            style={{
                                                background: fo.color === "transparent" ? "transparent" : fo.color,
                                                border: fo.color === "transparent" ? "1px dashed #444" : undefined
                                            }}
                                        />
                                        {fo.style}
                                        {fo.width_mm > 0 && (
                                            <span className="ml-auto font-mono text-canvas-muted">{fo.width_mm}mm</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shadow settings */}
                    <div className="border-b border-canvas-border">
                        <div className="px-3 pt-3 pb-1">
                            <h3 className="text-xs font-semibold text-canvas-text-secondary uppercase tracking-wider">
                                Shadow
                            </h3>
                        </div>
                        <ShadowSettingsPanel shadow={shadow} onChange={setShadow} />
                    </div>

                    {/* Corner Pin Reset (visible only when tool active) */}
                    {activeTool === "cornerpin" && (
                        <div className="p-3 border-b border-canvas-border bg-canvas-accent/5 animate-fade-in">
                            <h3 className="text-xs font-semibold text-canvas-accent uppercase tracking-wider mb-2">
                                Corner Pin
                            </h3>
                            <button
                                onClick={() => setResetCornersTrigger(v => v + 1)}
                                className="w-full flex items-center justify-center gap-2 bg-canvas-accent hover:bg-canvas-accent-hover text-white rounded-lg py-2 text-xs font-medium transition-all shadow-glow"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset Corners
                            </button>
                            <p className="text-[10px] text-canvas-muted mt-2 leading-tight">
                                Reverts the perspective distortion to original rectangular shape.
                            </p>
                        </div>
                    )}

                    {/* AR Viewer */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-3 pt-3 pb-1 border-b border-canvas-border">
                            <h3 className="text-xs font-semibold text-canvas-text-secondary uppercase tracking-wider">
                                AR Preview
                            </h3>
                        </div>
                        <div className="flex-1 relative">
                            <ARViewer artwork={selectedArtwork} />
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}
