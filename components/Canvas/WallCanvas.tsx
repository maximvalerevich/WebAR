"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { Artwork, ActiveTool, ShadowSettings } from "@/types";
import { ArtworkLayer } from "./ArtworkLayer";
import { RulerTool } from "./RulerTool";
import type { UseScaleCalculatorReturn } from "@/hooks/useScaleCalculator";

interface WallCanvasProps {
    selectedArtwork: Artwork | null;
    selectedFrameId: string;
    activeTool: ActiveTool;
    shadow: ShadowSettings;
    scaleCalc: UseScaleCalculatorReturn;
    stageRef: React.RefObject<Konva.Stage | null>;
    resetCornersTrigger?: number;
}

const MAX_CANVAS_DIM = 2048; // 4K optimization: cap render resolution

/** Downsample an image to max dimension before loading into Konva (prevents lag with 4K uploads) */
async function resampleImage(file: File, maxDim: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * WallCanvas
 *
 * Main Konva Stage that renders:
 * - Background (uploaded wall photo, resampled to ≤2048px for performance)
 * - RulerTool overlay layer
 * - ArtworkLayer with the selected painting
 */
export function WallCanvas({
    selectedArtwork,
    selectedFrameId,
    activeTool,
    shadow,
    scaleCalc,
    stageRef,
    resetCornersTrigger = 0,
}: WallCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    const [wallImageSrc, setWallImageSrc] = useState<string | undefined>();
    const [wallImage] = useImage(wallImageSrc ?? "", "anonymous");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ruler modal state
    const [showRulerModal, setShowRulerModal] = useState(false);
    const [rulerPixels, setRulerPixels] = useState(0);
    const [cmInput, setCmInput] = useState("");

    // Observe container size → resize stage responsively
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setStageSize({ width: Math.floor(width), height: Math.floor(height) });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const resampled = await resampleImage(file, MAX_CANVAS_DIM);
        setWallImageSrc(resampled);
        scaleCalc.resetCalibration();
        setRulerPixels(0);
    }, [scaleCalc]);

    // Compute background image scale to cover the stage
    const bgScale =
        wallImage
            ? Math.max(
                stageSize.width / wallImage.width,
                stageSize.height / wallImage.height
            )
            : 1;

    const bgX = wallImage ? (stageSize.width - wallImage.width * bgScale) / 2 : 0;
    const bgY = wallImage ? (stageSize.height - wallImage.height * bgScale) / 2 : 0;

    return (
        <div ref={containerRef} className="relative w-full h-full bg-canvas-bg overflow-hidden rounded-xl">
            {/* Upload prompt overlay */}
            {!wallImageSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 pointer-events-none">
                    <div className="w-16 h-16 rounded-2xl bg-canvas-surface border border-canvas-border flex items-center justify-center">
                        <svg className="w-8 h-8 text-canvas-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-canvas-text-secondary text-sm">Upload a photo of your wall</p>
                        <p className="text-canvas-muted text-xs mt-1">Supports JPG, PNG, WebP — up to 4K</p>
                    </div>
                    <button
                        className="pointer-events-auto bg-canvas-accent hover:bg-canvas-accent-hover text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-glow"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Choose Wall Photo
                    </button>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* Konva Stage */}
            <Stage
                ref={stageRef as any}
                width={stageSize.width}
                height={stageSize.height}
                style={{ cursor: activeTool === "ruler" ? "crosshair" : "default" }}
            >
                {/* Background wall photo */}
                <Layer>
                    {wallImage && (
                        <KonvaImage
                            image={wallImage}
                            x={bgX}
                            y={bgY}
                            width={wallImage.width * bgScale}
                            height={wallImage.height * bgScale}
                        />
                    )}
                </Layer>

                {/* Artwork */}
                {selectedArtwork && (
                    <ArtworkLayer
                        artwork={selectedArtwork}
                        selectedFrameId={selectedFrameId}
                        scaleCalc={scaleCalc}
                        shadow={shadow}
                        cornerPinActive={activeTool === "cornerpin"}
                        stageWidth={stageSize.width}
                        stageHeight={stageSize.height}
                        onSelect={() => { }}
                        resetTrigger={resetCornersTrigger}
                    />
                )}

                {/* Ruler Tool overlay - Separate Layer to ensure interaction over everything */}
                <Layer listening={activeTool === "ruler"}>
                    <RulerTool
                        key={wallImageSrc || "ruler"}
                        scaleCalc={scaleCalc}
                        stageWidth={stageSize.width}
                        stageHeight={stageSize.height}
                        active={activeTool === "ruler"}
                        onSelectionComplete={(pixels) => {
                            setRulerPixels(pixels);
                            setShowRulerModal(true);
                        }}
                    />
                </Layer>
            </Stage>

            {/* Calibration modal - Standard DOM, OUTSIDE Stage */}
            {showRulerModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-fade-in">
                        <h3 className="text-canvas-text font-semibold text-lg mb-1">Set Reference Scale</h3>
                        <p className="text-canvas-text-secondary text-sm mb-4">
                            The ruler line you drew is{" "}
                            <span className="text-canvas-accent font-mono">{Math.round(rulerPixels)} px</span> long.
                            Enter its real-world length in centimetres.
                        </p>
                        <input
                            autoFocus
                            type="number"
                            min={1}
                            step={0.1}
                            value={cmInput}
                            onChange={(e) => setCmInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && cmInput) {
                                    scaleCalc.calibrate(rulerPixels, parseFloat(cmInput));
                                    setShowRulerModal(false);
                                    setCmInput("");
                                }
                            }}
                            placeholder="e.g. 100"
                            className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-canvas-text font-mono focus:outline-none focus:border-canvas-accent mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const cm = parseFloat(cmInput);
                                    if (!isNaN(cm) && cm > 0) {
                                        scaleCalc.calibrate(rulerPixels, cm);
                                        setShowRulerModal(false);
                                        setCmInput("");
                                    }
                                }}
                                className="flex-1 bg-canvas-accent hover:bg-canvas-accent-hover text-white rounded-lg py-2 font-medium transition-colors"
                            >
                                Calibrate
                            </button>
                            <button
                                onClick={() => {
                                    setShowRulerModal(false);
                                    setCmInput("");
                                }}
                                className="flex-1 border border-canvas-border text-canvas-text-secondary hover:text-canvas-text rounded-lg py-2 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Replace wall button (shown after upload) */}
            {wallImageSrc && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 z-10 bg-canvas-surface/80 backdrop-blur border border-canvas-border text-canvas-text-secondary hover:text-canvas-text px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                    Change Wall
                </button>
            )}

            {/* Calibration indicator */}
            {scaleCalc.calibration.pixelsPerCm && (
                <div className="absolute top-3 left-3 z-10 bg-canvas-surface/80 backdrop-blur border border-canvas-border rounded-lg px-2.5 py-1 text-xs font-mono text-canvas-accent">
                    {scaleCalc.calibration.pixelsPerCm.toFixed(2)} px/cm
                </div>
            )}
        </div>
    );
}
