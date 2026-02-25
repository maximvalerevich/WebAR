/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Prevent konva from pulling in the native `canvas` module on the server.
            // All Konva rendering happens client-side via dynamic() with ssr:false.
            config.externals = [...(config.externals ?? []), "canvas"];
        }
        return config;
    },

    images: {
        remotePatterns: [
            { protocol: "https", hostname: "images.unsplash.com" },
            { protocol: "https", hostname: "upload.wikimedia.org" },
        ],
    },
};

module.exports = nextConfig;
