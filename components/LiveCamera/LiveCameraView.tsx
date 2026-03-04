"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import type { Artwork, ShadowSettings } from "@/types";
import { useCameraStream } from "@/hooks/useCameraStream";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveCameraViewProps {
    artworks: Artwork[];
    selectedArtwork: Artwork | null;
    selectedFrameId: string;
    shadow: ShadowSettings;
    onSelectArtwork: (art: Artwork) => void;
    onClose: () => void;
}

interface Transform {
    x: number;
    y: number;
    scale: number;
    rotation: number;
}

interface TouchState {
    startDist: number;
    startAngle: number;
    startScale: number;
    startRotation: number;
    startX: number;
    startY: number;
    artStartX: number;
    artStartY: number;
    fingers: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDistance(t1: React.Touch, t2: React.Touch): number {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getAngle(t1: React.Touch, t2: React.Touch): number {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
}

function getMidpoint(t1: React.Touch, t2: React.Touch) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
    };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveCameraView({
    artworks,
    selectedArtwork,
    selectedFrameId,
    shadow,
    onSelectArtwork,
    onClose,
}: LiveCameraViewProps) {
    const { videoRef, isStreaming, error, startStream, stopStream } = useCameraStream();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Artwork transform
    const [transform, setTransform] = useState<Transform>({
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
    });
    const touchState = useRef<TouchState | null>(null);

    // Auto-start camera on mount
    useEffect(() => {
        startStream();
        return () => stopStream();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Center artwork when it changes
    useEffect(() => {
        setTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    }, [selectedArtwork?.id]);

    // ─── Touch handlers ──────────────────────────────────────────────────────

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            const touches = e.touches;

            if (touches.length === 1) {
                touchState.current = {
                    startDist: 0,
                    startAngle: 0,
                    startScale: transform.scale,
                    startRotation: transform.rotation,
                    startX: touches[0].clientX,
                    startY: touches[0].clientY,
                    artStartX: transform.x,
                    artStartY: transform.y,
                    fingers: 1,
                };
            } else if (touches.length === 2) {
                const dist = getDistance(touches[0], touches[1]);
                const angle = getAngle(touches[0], touches[1]);
                touchState.current = {
                    startDist: dist,
                    startAngle: angle,
                    startScale: transform.scale,
                    startRotation: transform.rotation,
                    startX: getMidpoint(touches[0], touches[1]).x,
                    startY: getMidpoint(touches[0], touches[1]).y,
                    artStartX: transform.x,
                    artStartY: transform.y,
                    fingers: 2,
                };
            }
        },
        [transform]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            const ts = touchState.current;
            if (!ts) return;
            const touches = e.touches;

            if (touches.length === 1 && ts.fingers === 1) {
                // Single finger → drag
                const dx = touches[0].clientX - ts.startX;
                const dy = touches[0].clientY - ts.startY;
                setTransform((prev) => ({
                    ...prev,
                    x: ts.artStartX + dx,
                    y: ts.artStartY + dy,
                }));
            } else if (touches.length === 2) {
                // Two fingers → pinch zoom + rotate + pan
                const dist = getDistance(touches[0], touches[1]);
                const angle = getAngle(touches[0], touches[1]);
                const mid = getMidpoint(touches[0], touches[1]);

                const scaleDelta = dist / ts.startDist;
                const newScale = Math.max(0.2, Math.min(5, ts.startScale * scaleDelta));
                const rotDelta = angle - ts.startAngle;
                const newRotation = ts.startRotation + rotDelta;

                const dx = mid.x - ts.startX;
                const dy = mid.y - ts.startY;

                setTransform({
                    x: ts.artStartX + dx,
                    y: ts.artStartY + dy,
                    scale: newScale,
                    rotation: newRotation,
                });
            }
        },
        []
    );

    const handleTouchEnd = useCallback(() => {
        touchState.current = null;
    }, []);

    // ─── Mouse drag (desktop fallback) ───────────────────────────────────────

    const mouseState = useRef<{ startX: number; startY: number; artX: number; artY: number } | null>(null);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            mouseState.current = {
                startX: e.clientX,
                startY: e.clientY,
                artX: transform.x,
                artY: transform.y,
            };
        },
        [transform.x, transform.y]
    );

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!mouseState.current) return;
        const dx = e.clientX - mouseState.current.startX;
        const dy = e.clientY - mouseState.current.startY;
        setTransform((prev) => ({
            ...prev,
            x: mouseState.current!.artX + dx,
            y: mouseState.current!.artY + dy,
        }));
    }, []);

    const handleMouseUp = useCallback(() => {
        mouseState.current = null;
    }, []);

    // Mouse wheel zoom (desktop)
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setTransform((prev) => ({
            ...prev,
            scale: Math.max(0.2, Math.min(5, prev.scale - e.deltaY * 0.002)),
        }));
    }, []);

    // ─── Snapshot ────────────────────────────────────────────────────────────

    const handleSnapshot = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !containerRef.current) return;

        const canvas = canvasRef.current ?? document.createElement("canvas");
        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;

        // Draw video frame
        ctx.drawImage(video, 0, 0, w, h);

        // Draw artwork overlay
        if (selectedArtwork) {
            const container = containerRef.current;
            const rect = container.getBoundingClientRect();
            const scaleX = w / rect.width;
            const scaleY = h / rect.height;

            const artImg = new window.Image();
            artImg.crossOrigin = "anonymous";
            await new Promise<void>((resolve) => {
                artImg.onload = () => resolve();
                artImg.onerror = () => resolve();
                artImg.src = selectedArtwork.imageUrl;
            });

            const artW = 200 * transform.scale;
            const artH = (200 * (selectedArtwork.height_cm / selectedArtwork.width_cm)) * transform.scale;

            const cx = (rect.width / 2 + transform.x) * scaleX;
            const cy = (rect.height / 2 + transform.y) * scaleY;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((transform.rotation * Math.PI) / 180);

            // Shadow
            if (shadow.enabled) {
                ctx.shadowColor = shadow.color + Math.round(shadow.opacity * 255).toString(16).padStart(2, "0");
                ctx.shadowBlur = shadow.blur * scaleX;
                ctx.shadowOffsetX = shadow.offsetX * scaleX;
                ctx.shadowOffsetY = shadow.offsetY * scaleY;
            }

            // Frame
            const frame = selectedArtwork.frame_options.find((f) => f.id === selectedFrameId);
            const framePx = frame && frame.width_mm > 0 ? frame.width_mm * 0.5 * scaleX : 0;
            if (frame && framePx > 0) {
                ctx.fillStyle = frame.color === "transparent" ? "transparent" : frame.color;
                ctx.fillRect(
                    -(artW * scaleX) / 2 - framePx,
                    -(artH * scaleY) / 2 - framePx,
                    artW * scaleX + framePx * 2,
                    artH * scaleY + framePx * 2
                );
            }

            ctx.drawImage(
                artImg,
                -(artW * scaleX) / 2,
                -(artH * scaleY) / 2,
                artW * scaleX,
                artH * scaleY
            );
            ctx.restore();
        }

        // Download
        const link = document.createElement("a");
        link.download = `artvision-live-${Date.now()}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.92);
        link.click();
    }, [selectedArtwork, selectedFrameId, shadow, transform, videoRef]);

    // ─── Derived values ──────────────────────────────────────────────────────

    const frame = selectedArtwork?.frame_options.find((f) => f.id === selectedFrameId);
    const frameBorder = frame && frame.width_mm > 0
        ? `${Math.max(2, frame.width_mm * 0.5)}px solid ${frame.color === "transparent" ? "transparent" : frame.color}`
        : "none";

    const artWidth = 200;
    const artHeight = selectedArtwork
        ? 200 * (selectedArtwork.height_cm / selectedArtwork.width_cm)
        : 200;

    const shadowStyle = shadow.enabled
        ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px rgba(0,0,0,${shadow.opacity})`
        : "none";

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black overflow-hidden select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ touchAction: "none" }}
        >
            {/* Camera video feed */}
            <video
                ref={videoRef as React.LegacyRef<HTMLVideoElement>}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Hidden canvas for snapshot */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 gap-4 p-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <p className="text-white text-sm text-center max-w-xs">{error}</p>
                    <button
                        onClick={() => {
                            startStream();
                        }}
                        className="bg-canvas-accent hover:bg-canvas-accent-hover text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Loading state */}
            {!isStreaming && !error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-3">
                    <div className="w-10 h-10 border-2 border-canvas-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-canvas-muted text-sm">Starting camera…</p>
                </div>
            )}

            {/* Artwork overlay */}
            {selectedArtwork && isStreaming && (
                <div
                    className="absolute z-10 pointer-events-none"
                    style={{
                        left: "50%",
                        top: "50%",
                        transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                        width: artWidth,
                        border: frameBorder,
                        boxShadow: shadowStyle,
                        borderRadius: 2,
                    }}
                >
                    <Image
                        src={selectedArtwork.imageUrl}
                        alt={selectedArtwork.title}
                        width={artWidth}
                        height={artHeight}
                        className="block w-full h-auto"
                        draggable={false}
                        priority
                    />
                </div>
            )}

            {/* Top bar: Close + info */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-3 bg-gradient-to-b from-black/60 to-transparent">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {selectedArtwork && (
                    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 text-white text-xs font-medium">
                        {selectedArtwork.title}
                        <span className="ml-1.5 opacity-60 font-mono">
                            {selectedArtwork.width_cm}×{selectedArtwork.height_cm}cm
                        </span>
                    </div>
                )}

                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Capture button */}
            {isStreaming && (
                <button
                    onClick={handleSnapshot}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-16 h-16 rounded-full bg-white/90 border-4 border-white shadow-lg flex items-center justify-center transition-transform active:scale-90 animate-scale-in"
                    title="Take snapshot"
                >
                    <div className="w-12 h-12 rounded-full border-2 border-black/10" />
                </button>
            )}

            {/* Gesture hint */}
            {isStreaming && transform.x === 0 && transform.y === 0 && transform.scale === 1 && (
                <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-30 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white/80 text-xs animate-pulse pointer-events-none">
                    Drag with one finger • Pinch to zoom & rotate
                </div>
            )}

            {/* Bottom artwork carousel */}
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-4 px-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {artworks.map((art) => (
                        <button
                            key={art.id}
                            onClick={() => onSelectArtwork(art)}
                            className={`flex-none w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedArtwork?.id === art.id
                                ? "border-canvas-accent shadow-glow scale-105"
                                : "border-white/20 opacity-70 hover:opacity-100"
                                }`}
                        >
                            <Image
                                src={art.imageUrl}
                                alt={art.title}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
