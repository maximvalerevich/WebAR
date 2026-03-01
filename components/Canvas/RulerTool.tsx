"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Layer, Line, Circle, Text, Group, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { UseScaleCalculatorReturn } from "@/hooks/useScaleCalculator";

interface RulerToolProps {
    scaleCalc: UseScaleCalculatorReturn;
    stageWidth: number;
    stageHeight: number;
    active: boolean;
    onSelectionComplete: (pixels: number) => void;
}

/**
 * RulerTool
 *
 * PURE KONVA COMPONENT.
 * Handles drawing the reference line. When drawing completes,
 * it calls onSelectionComplete with the pixel length.
 */
export function RulerTool({
    scaleCalc,
    stageWidth,
    stageHeight,
    active,
    onSelectionComplete
}: RulerToolProps) {
    const [drawing, setDrawing] = useState(false);
    const [start, setStart] = useState<{ x: number; y: number } | null>(null);
    const [end, setEnd] = useState<{ x: number; y: number } | null>(null);

    // Stable callback refs
    const setRulerLineRef = useRef(scaleCalc.setRulerLine);
    const setIsDrawingRef = useRef(scaleCalc.setIsDrawing);
    useEffect(() => { setRulerLineRef.current = scaleCalc.setRulerLine; });
    useEffect(() => { setIsDrawingRef.current = scaleCalc.setIsDrawing; });

    const pixelLength =
        start && end
            ? Math.hypot(end.x - start.x, end.y - start.y)
            : 0;

    useEffect(() => {
        setRulerLineRef.current(start, end);
    }, [start, end]);

    const handleMouseDown = useCallback(
        (e: KonvaEventObject<MouseEvent>) => {
            if (!active) return;
            const pos = e.target.getStage()?.getPointerPosition();
            if (!pos) return;
            setStart(pos);
            setEnd(pos);
            setDrawing(true);
            setIsDrawingRef.current(true);
        },
        [active]
    );

    const handleMouseMove = useCallback(
        (e: KonvaEventObject<MouseEvent>) => {
            if (!drawing || !active) return;
            const pos = e.target.getStage()?.getPointerPosition();
            if (!pos) return;
            setEnd(pos);
        },
        [drawing, active]
    );

    const handleMouseUp = useCallback(() => {
        if (!drawing || !active) return;
        setDrawing(false);
        setIsDrawingRef.current(false);
        if (pixelLength > 10) {
            onSelectionComplete(pixelLength);
        }
    }, [drawing, active, pixelLength, onSelectionComplete]);

    if (!active && !start) return null;

    return (
        <Group
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {active && (
                <Rect
                    x={0}
                    y={0}
                    width={stageWidth}
                    height={stageHeight}
                    fill="transparent"
                    listening={active}
                />
            )}

            {start && end && (
                <Group>
                    <Line
                        points={[start.x, start.y, end.x, end.y]}
                        stroke="#ef4444"
                        strokeWidth={2}
                        dash={[8, 4]}
                        lineCap="round"
                    />
                    <Circle x={start.x} y={start.y} radius={5} fill="#ef4444" />
                    <Circle x={end.x} y={end.y} radius={5} fill="#ef4444" />
                    {pixelLength > 20 && (
                        <Text
                            x={(start.x + end.x) / 2 + 8}
                            y={(start.y + end.y) / 2 - 16}
                            text={
                                scaleCalc.calibration.pixelsPerCm
                                    ? `${(pixelLength / scaleCalc.calibration.pixelsPerCm).toFixed(1)} cm`
                                    : `${Math.round(pixelLength)} px`
                            }
                            fill="#ef4444"
                            fontSize={13}
                            fontFamily="Inter, sans-serif"
                            fontStyle="bold"
                            shadowColor="black"
                            shadowBlur={4}
                            shadowOpacity={0.8}
                        />
                    )}
                </Group>
            )}
        </Group>
    );
}
