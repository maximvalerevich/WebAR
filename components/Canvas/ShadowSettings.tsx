"use client";

import React, { useCallback } from "react";
import type { ShadowSettings } from "@/types";

interface ShadowSettingsPanelProps {
    shadow: ShadowSettings;
    onChange: (settings: ShadowSettings) => void;
}

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    unit?: string;
}

function Slider({ label, value, min, max, step = 1, onChange, unit = "" }: SliderProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
                <span className="text-xs text-canvas-text-secondary">{label}</span>
                <span className="text-xs font-mono text-canvas-accent">
                    {value}
                    {unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-canvas-border rounded-full appearance-none cursor-pointer accent-canvas-accent"
            />
        </div>
    );
}

/**
 * ShadowSettingsPanel
 *
 * Sidebar panel for configuring the drop-shadow applied to artwork.
 * Shadow parameters map directly to Konva node shadow props.
 */
export function ShadowSettingsPanel({ shadow, onChange }: ShadowSettingsPanelProps) {
    const update = useCallback(
        <K extends keyof ShadowSettings>(key: K, value: ShadowSettings[K]) => {
            onChange({ ...shadow, [key]: value });
        },
        [shadow, onChange]
    );

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-canvas-text">Drop Shadow</span>
                <button
                    onClick={() => update("enabled", !shadow.enabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${shadow.enabled ? "bg-canvas-accent" : "bg-canvas-border"
                        }`}
                >
                    <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${shadow.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                    />
                </button>
            </div>

            {shadow.enabled && (
                <>
                    <Slider
                        label="Blur"
                        value={shadow.blur}
                        min={0}
                        max={80}
                        step={1}
                        onChange={(v) => update("blur", v)}
                        unit="px"
                    />
                    <Slider
                        label="Offset X"
                        value={shadow.offsetX}
                        min={-40}
                        max={40}
                        step={1}
                        onChange={(v) => update("offsetX", v)}
                        unit="px"
                    />
                    <Slider
                        label="Offset Y"
                        value={shadow.offsetY}
                        min={-40}
                        max={40}
                        step={1}
                        onChange={(v) => update("offsetY", v)}
                        unit="px"
                    />
                    <Slider
                        label="Opacity"
                        value={Math.round(shadow.opacity * 100)}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => update("opacity", v / 100)}
                        unit="%"
                    />
                    {/* Color picker */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-canvas-text-secondary">Color</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={shadow.color}
                                onChange={(e) => update("color", e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <span className="text-xs font-mono text-canvas-text">{shadow.color}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
