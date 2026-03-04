"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface UseCameraStreamReturn {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isStreaming: boolean;
    error: string | null;
    startStream: () => Promise<void>;
    stopStream: () => void;
}

/**
 * useCameraStream
 *
 * Manages a rear-camera MediaStream attached to a <video> element.
 * Automatically stops the stream on unmount.
 */
export function useCameraStream(): UseCameraStreamReturn {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
    }, []);

    const startStream = useCallback(async () => {
        setError(null);

        // Check for MediaDevices API support
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Camera is not supported in this browser. Use HTTPS.");
            return;
        }

        try {
            // Request rear camera (environment) — falls back to front on desktop
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (playErr) {
                    // AbortError is common on mobile when play() is interrupted – not a real failure
                    if (playErr instanceof DOMException && playErr.name === "AbortError") {
                        console.warn("[useCameraStream] play() interrupted, retrying...");
                        // Small delay then retry once
                        await new Promise((r) => setTimeout(r, 300));
                        try {
                            await videoRef.current?.play();
                        } catch {
                            // Silently ignore – stream is still attached
                        }
                    } else {
                        console.error("[useCameraStream] play() error", playErr);
                    }
                }
            }

            setIsStreaming(true);
        } catch (err) {
            const msg =
                err instanceof DOMException && err.name === "NotAllowedError"
                    ? "Camera access denied. Allow access in browser settings."
                    : err instanceof DOMException && err.name === "NotFoundError"
                        ? "No camera found on this device."
                        : "Failed to start camera. Try reloading the page.";
            setError(msg);
            console.error("[useCameraStream]", err);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    return { videoRef, isStreaming, error, startStream, stopStream };
}
