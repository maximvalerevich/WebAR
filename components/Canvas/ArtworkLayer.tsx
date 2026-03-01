"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Layer, Group, Image as KonvaImage, Circle, Line, Rect, Shape } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Artwork, ShadowSettings, CornerPoints, FrameOption } from "@/types";
import type { UseScaleCalculatorReturn } from "@/hooks/useScaleCalculator";

interface ArtworkLayerProps {
    artwork: Artwork;
    selectedFrameId: string;
    scaleCalc: UseScaleCalculatorReturn;
    shadow: ShadowSettings;
    cornerPinActive: boolean;
    stageWidth: number;
    stageHeight: number;
    onSelect: () => void;
    resetTrigger?: number;
}

/**
 * Computes the 6-parameter affine transform for a triangle ABC -> abc.
 * Returns [a, b, c, d, e, f] for canvas 2D ctx.setTransform().
 */
/**
 * Computes the 6-parameter affine transform for a triangle ABC -> abc.
 * Returns [a, b, c, d, e, f] for canvas 2D ctx.transform().
 */
function getAffineTransform(
    x0: number, y0: number, x1: number, y1: number, x2: number, y2: number,
    u0: number, v0: number, u1: number, v1: number, u2: number, v2: number
): [number, number, number, number, number, number] {
    const det = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);
    if (Math.abs(det) < 0.0001) return [1, 0, 0, 1, 0, 0];

    const a = ((u0 - u2) * (y1 - y2) - (u1 - u2) * (y0 - y2)) / det;
    const b = ((v0 - v2) * (y1 - y2) - (v1 - v2) * (y0 - y2)) / det;
    const c = ((x0 - x2) * (u1 - u2) - (x1 - x2) * (u0 - u2)) / det;
    const d = ((x0 - x2) * (v1 - v2) - (x1 - x2) * (v0 - v2)) / det;
    const e = u0 - a * x0 - c * y0;
    const f = v0 - b * x0 - d * y0;

    return [a, b, c, d, e, f];
}

/**
 * ArtworkLayer
 *
 * Renders the selected artwork with auto-scaling, drag&drop, and shadow.
 * Supports Corner Pin mode using triangle-split affine transforms for
 * high-performance 2D canvas perspective distortion.
 */
export function ArtworkLayer({
    artwork,
    selectedFrameId,
    scaleCalc,
    shadow,
    cornerPinActive,
    stageWidth,
    stageHeight,
    onSelect,
    resetTrigger = 0,
}: ArtworkLayerProps) {
    const frame = artwork.frame_options.find((f: FrameOption) => f.id === selectedFrameId);
    const pxPerCm = scaleCalc.calibration.pixelsPerCm ?? 4;
    const framePx = frame && frame.width_mm > 0 ? (frame.width_mm / 10) * pxPerCm : 0;

    const baseW = scaleCalc.calibration.pixelsPerCm
        ? scaleCalc.cmToPixels(artwork.width_cm)
        : Math.min(280, stageWidth * 0.38);
    const baseH = scaleCalc.calibration.pixelsPerCm
        ? scaleCalc.cmToPixels(artwork.height_cm)
        : baseW * (artwork.height_cm / artwork.width_cm);

    const artW = baseW + framePx * 2;
    const artH = baseH + framePx * 2;

    const [pos, setPos] = useState({
        x: stageWidth / 2,
        y: stageHeight / 2,
    });

    // Corner pin handles in local group coordinates
    const [corners, setCorners] = useState<CornerPoints>({
        topLeft: { x: -artW / 2, y: -artH / 2 },
        topRight: { x: artW / 2, y: -artH / 2 },
        bottomRight: { x: artW / 2, y: artH / 2 },
        bottomLeft: { x: -artW / 2, y: artH / 2 },
    });

    const isPinned = useRef(false);
    const prevScaleW = useRef(artW);
    const prevScaleH = useRef(artH);

    // Reset corners when artwork, scale or resetTrigger changes
    useEffect(() => {
        if (resetTrigger > 0) {
            isPinned.current = false;
        }
        if (!isPinned.current) {
            setCorners({
                topLeft: { x: -artW / 2, y: -artH / 2 },
                topRight: { x: artW / 2, y: -artH / 2 },
                bottomRight: { x: artW / 2, y: artH / 2 },
                bottomLeft: { x: -artW / 2, y: artH / 2 },
            });
        }
    }, [artwork.id, artW, artH, resetTrigger]);

    // Handle Ruler scaling / Frame size changes when pinned
    useEffect(() => {
        if (isPinned.current && prevScaleW.current && prevScaleH.current) {
            const scaleX = artW / prevScaleW.current;
            const scaleY = artH / prevScaleH.current;
            if (scaleX !== 1 || scaleY !== 1) {
                setCorners(c => ({
                    topLeft: { x: c.topLeft.x * scaleX, y: c.topLeft.y * scaleY },
                    topRight: { x: c.topRight.x * scaleX, y: c.topRight.y * scaleY },
                    bottomRight: { x: c.bottomRight.x * scaleX, y: c.bottomRight.y * scaleY },
                    bottomLeft: { x: c.bottomLeft.x * scaleX, y: c.bottomLeft.y * scaleY },
                }));
            }
        }
        prevScaleW.current = artW;
        prevScaleH.current = artH;
    }, [artW, artH]);

    const [image] = useImage(artwork.imageUrl, "anonymous");

    const drawPerspective = useCallback(
        (context: any) => {
            const ctx = context._context as CanvasRenderingContext2D;
            if (!image && !frame) return;

            const drawTri = (p0: any, p1: any, p2: any, u0: number, v0: number, u1: number, v1: number, u2: number, v2: number) => {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.closePath();
                ctx.clip();

                // Get transform from (u,v) [source space] to (p.x, p.y) [dest/distorted space]
                const [a, b, c, d, e, f] = getAffineTransform(u0, v0, u1, v1, u2, v2, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
                ctx.transform(a, b, c, d, e, f);

                // Draw frame
                if (frame && frame.width_mm > 0) {
                    ctx.fillStyle = frame.color;
                    ctx.fillRect(0, 0, artW, artH);
                }
                // Draw image
                if (image) {
                    ctx.drawImage(image, framePx, framePx, baseW, baseH);
                }
                ctx.restore();
            };

            // Use 4 triangles meeting at the center to avoid diagonal stretching issues
            // This ensures every corner pull affects its quadrant properly.
            const center = {
                x: (corners.topLeft.x + corners.topRight.x + corners.bottomRight.x + corners.bottomLeft.x) / 4,
                y: (corners.topLeft.y + corners.topRight.y + corners.bottomRight.y + corners.bottomLeft.y) / 4,
            };
            const srcCenter = { x: artW / 2, y: artH / 2 };

            // Triangle 1: TL, TR, Center
            drawTri(corners.topLeft, corners.topRight, center, 0, 0, artW, 0, srcCenter.x, srcCenter.y);
            // Triangle 2: TR, BR, Center
            drawTri(corners.topRight, corners.bottomRight, center, artW, 0, artW, artH, srcCenter.x, srcCenter.y);
            // Triangle 3: BR, BL, Center
            drawTri(corners.bottomRight, corners.bottomLeft, center, artW, artH, 0, artH, srcCenter.x, srcCenter.y);
            // Triangle 4: BL, TL, Center
            drawTri(corners.bottomLeft, corners.topLeft, center, 0, artH, 0, 0, srcCenter.x, srcCenter.y);
        },
        [image, corners, artW, artH, frame, framePx, baseW, baseH]
    );

    const hitPerspective = useCallback(
        (context: any, shape: Konva.Shape) => {
            context.beginPath();
            context.moveTo(corners.topLeft.x, corners.topLeft.y);
            context.lineTo(corners.topRight.x, corners.topRight.y);
            context.lineTo(corners.bottomRight.x, corners.bottomRight.y);
            context.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
            context.closePath();
            context.fillStrokeShape(shape);
        },
        [corners]
    );

    const cornerKeys = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;

    const shadowProps = shadow.enabled
        ? {
            shadowEnabled: true,
            shadowBlur: shadow.blur,
            shadowOffsetX: shadow.offsetX,
            shadowOffsetY: shadow.offsetY,
            shadowOpacity: shadow.opacity,
            shadowColor: shadow.color,
        }
        : { shadowEnabled: false as const };

    return (
        <Layer>
            <Group
                x={pos.x}
                y={pos.y}
                draggable={!cornerPinActive}
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e: KonvaEventObject<DragEvent>) => {
                    if (e.target === e.currentTarget) {
                        setPos({ x: e.target.x(), y: e.target.y() });
                    }
                }}
            >
                {/* Shadow Backing - A solid polygon behind the image to cast the shadow perfectly, hidden by the image itself */}
                <Line
                    points={[
                        corners.topLeft.x, corners.topLeft.y,
                        corners.topRight.x, corners.topRight.y,
                        corners.bottomRight.x, corners.bottomRight.y,
                        corners.bottomLeft.x, corners.bottomLeft.y,
                    ]}
                    closed
                    fill="white"
                    {...shadowProps}
                    listening={false}
                />

                <Shape
                    sceneFunc={drawPerspective}
                    hitFunc={hitPerspective}
                    width={artW}
                    height={artH}
                    listening={!cornerPinActive}
                />

                {cornerPinActive && (
                    <>
                        <Line
                            points={[
                                corners.topLeft.x, corners.topLeft.y,
                                corners.topRight.x, corners.topRight.y,
                                corners.bottomRight.x, corners.bottomRight.y,
                                corners.bottomLeft.x, corners.bottomLeft.y,
                            ]}
                            closed
                            stroke="#7c6af7"
                            strokeWidth={1.5}
                            dash={[6, 3]}
                        />
                        {cornerKeys.map((key) => (
                            <Circle
                                key={key}
                                x={corners[key].x}
                                y={corners[key].y}
                                radius={9}
                                fill="#7c6af7"
                                stroke="white"
                                strokeWidth={2}
                                draggable
                                listening
                                onDragMove={(e: KonvaEventObject<DragEvent>) => {
                                    isPinned.current = true;
                                    setCorners((prev) => ({
                                        ...prev,
                                        [key]: { x: e.target.x(), y: e.target.y() },
                                    }));
                                }}
                            />
                        ))}
                    </>
                )}
            </Group>
        </Layer>
    );
}

