/**
 * Ambient type declarations for the Google model-viewer custom element.
 * Extends React's JSX IntrinsicElements without replacing the default namespace.
 */

import type React from "react";

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "model-viewer": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    src?: string;
                    poster?: string;
                    alt?: string;
                    ar?: boolean;
                    "ar-modes"?: string;
                    "camera-controls"?: boolean;
                    "auto-rotate"?: boolean;
                    scale?: string;
                    "shadow-intensity"?: string;
                    "shadow-softness"?: string;
                    exposure?: string;
                    "environment-image"?: string;
                    slot?: string;
                },
                HTMLElement
            >;
        }
    }
}
