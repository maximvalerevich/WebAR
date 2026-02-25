"use client";

import { useState, useCallback } from "react";
import type { CalibrationState } from "@/types";

export interface UseScaleCalculatorReturn {
    calibration: CalibrationState;
    /** Call after the user confirms the ruler line and enters real-world cm */
    calibrate: (linePixelLength: number, realWorldCm: number) => void;
    /** Convert centimetres to canvas pixels using current calibration */
    cmToPixels: (cm: number) => number;
    /** Check print quality: returns true if source image has enough DPI for the chosen size */
    checkPrintQuality: (imageWidthPx: number, widthCm: number, minDpi?: number) => boolean;
    /** Set the temporary ruler drawing state */
    setRulerLine: (
        lineStart: CalibrationState["lineStart"],
        lineEnd: CalibrationState["lineEnd"]
    ) => void;
    setIsDrawing: (drawing: boolean) => void;
    resetCalibration: () => void;
}

const DEFAULT_STATE: CalibrationState = {
    pixelsPerCm: null,
    lineStart: null,
    lineEnd: null,
    realWorldCm: 0,
    isDrawing: false,
};

/**
 * useScaleCalculator
 *
 * Manages the pixel-to-centimetre calibration ratio for the canvas.
 *
 * Workflow:
 * 1. User activates the Ruler Tool → draws a line on a known physical feature.
 * 2. User types the real-world length of that feature in centimetres.
 * 3. `calibrate(pixelLength, cm)` stores `pixelsPerCm = pixelLength / cm`.
 * 4. All artwork dimensions are then computed via `cmToPixels(width_cm)`.
 */
export function useScaleCalculator(): UseScaleCalculatorReturn {
    const [calibration, setCalibration] = useState<CalibrationState>(DEFAULT_STATE);

    const calibrate = useCallback((linePixelLength: number, realWorldCm: number) => {
        if (linePixelLength <= 0 || realWorldCm <= 0) return;
        const pixelsPerCm = linePixelLength / realWorldCm;
        setCalibration((prev) => ({
            ...prev,
            pixelsPerCm,
            realWorldCm,
            isDrawing: false,
        }));
    }, []);

    const cmToPixels = useCallback(
        (cm: number): number => {
            if (!calibration.pixelsPerCm) return 0;
            return cm * calibration.pixelsPerCm;
        },
        [calibration.pixelsPerCm]
    );

    /**
     * Checks whether the source image has sufficient resolution for the selected print size.
     * Formula: requiredPx = (widthCm / 2.54) * minDpi
     */
    const checkPrintQuality = useCallback(
        (imageWidthPx: number, widthCm: number, minDpi = 150): boolean => {
            const requiredPx = (widthCm / 2.54) * minDpi;
            return imageWidthPx >= requiredPx;
        },
        []
    );

    const setRulerLine = useCallback(
        (
            lineStart: CalibrationState["lineStart"],
            lineEnd: CalibrationState["lineEnd"]
        ) => {
            setCalibration((prev) => ({ ...prev, lineStart, lineEnd }));
        },
        []
    );

    const setIsDrawing = useCallback((drawing: boolean) => {
        setCalibration((prev) => ({ ...prev, isDrawing: drawing }));
    }, []);

    const resetCalibration = useCallback(() => {
        setCalibration(DEFAULT_STATE);
    }, []);

    return {
        calibration,
        calibrate,
        cmToPixels,
        checkPrintQuality,
        setRulerLine,
        setIsDrawing,
        resetCalibration,
    };
}
