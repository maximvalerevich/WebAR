import type Konva from "konva";

/**
 * exportCanvas
 *
 * Composites the full Konva stage (wall + artwork) into a downloadable image.
 *
 * @param stage  - Konva.Stage reference
 * @param format - 'jpeg' or 'png'
 * @param quality - JPEG quality 0–1 (ignored for PNG)
 */
export async function exportCanvas(
    stage: Konva.Stage,
    format: "jpeg" | "png" = "jpeg",
    quality = 0.95
): Promise<void> {
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";

    const dataURL = stage.toDataURL({
        mimeType,
        quality,
        pixelRatio: 2, // 2× for high-DPI export
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `art-try-on-${timestamp}.${format}`;

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * stageToBlob
 *
 * Returns the stage canvas as a Blob (useful for upload / server processing).
 */
export async function stageToBlob(
    stage: Konva.Stage,
    format: "jpeg" | "png" = "png"
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = stage.toCanvas({ pixelRatio: 2 });
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to convert stage to Blob"));
            },
            format === "jpeg" ? "image/jpeg" : "image/png",
            0.95
        );
    });
}
