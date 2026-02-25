/**
 * generatePlaneGLB.mjs
 * Run once: node scripts/generatePlaneGLB.mjs
 *
 * Creates /public/plane.glb — a 1×1m flat quad mesh used by model-viewer for AR.
 * model-viewer's `scale` attribute then stretches it to artwork dimensions.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Minimal GLB (Binary glTF 2.0) ────────────────────────────────────────────
// A 1m × 1m plane centred at origin.

const floatToBytes = (f) => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeFloatLE(f, 0);
    return buf;
};

const uint16ToBytes = (n) => {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUInt16LE(n, 0);
    return buf;
};

// Vertices (3 floats each: x, y, z)  — flat quad at y=0
const positions = [
    -0.5, 0, -0.5,
    0.5, 0, -0.5,
    0.5, 0, 0.5,
    -0.5, 0, 0.5,
];

// UV coords
const uvs = [0, 0, 1, 0, 1, 1, 0, 1];

// Normals (all pointing up)
const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

// Triangle indices (2 tris = 1 quad)
const indices = [0, 1, 2, 0, 2, 3];

// Build binary buffer
const posBuffer = Buffer.concat(positions.map(floatToBytes));
const uvBuffer = Buffer.concat(uvs.map(floatToBytes));
const normBuffer = Buffer.concat(normals.map(floatToBytes));
const idxBuffer = Buffer.concat(indices.map(uint16ToBytes));

// Pad buffers to 4-byte alignment
const pad4 = (buf) => {
    const rem = buf.length % 4;
    return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - rem)]);
};

const binParts = [pad4(posBuffer), pad4(uvBuffer), pad4(normBuffer), pad4(idxBuffer)];
const binBuffer = Buffer.concat(binParts);

const posOffset = 0;
const uvOffset = pad4(posBuffer).length;
const normOffset = uvOffset + pad4(uvBuffer).length;
const idxOffset = normOffset + pad4(normBuffer).length;

// ── glTF JSON ─────────────────────────────────────────────────────────────────

const gltf = {
    asset: { version: "2.0", generator: "WebAR Plane Generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Plane" }],
    meshes: [{
        name: "Plane",
        primitives: [{
            attributes: { POSITION: 0, TEXCOORD_0: 1, NORMAL: 2 },
            indices: 3,
            material: 0,
            mode: 4,
        }],
    }],
    accessors: [
        {
            bufferView: 0, componentType: 5126, count: 4, type: "VEC3",
            min: [-0.5, 0, -0.5], max: [0.5, 0, 0.5]
        },
        { bufferView: 1, componentType: 5126, count: 4, type: "VEC2" },
        { bufferView: 2, componentType: 5126, count: 4, type: "VEC3" },
        { bufferView: 3, componentType: 5123, count: 6, type: "SCALAR" },
    ],
    bufferViews: [
        { buffer: 0, byteOffset: posOffset, byteLength: posBuffer.length, target: 34962 },
        { buffer: 0, byteOffset: uvOffset, byteLength: uvBuffer.length, target: 34962 },
        { buffer: 0, byteOffset: normOffset, byteLength: normBuffer.length, target: 34962 },
        { buffer: 0, byteOffset: idxOffset, byteLength: idxBuffer.length, target: 34963 },
    ],
    buffers: [{ byteLength: binBuffer.length }],
    materials: [{
        name: "ArtworkMaterial",
        pbrMetallicRoughness: {
            baseColorFactor: [1, 1, 1, 1],
            metallicFactor: 0,
            roughnessFactor: 0.8,
        },
        doubleSided: true,
    }],
};

const jsonStr = JSON.stringify(gltf);
const jsonBuf = Buffer.from(jsonStr, "utf8");
const jsonPadded = pad4(jsonBuf);

// ── GLB header ────────────────────────────────────────────────────────────────
// Header: magic(4) + version(4) + length(4) = 12 bytes
// JSON chunk: chunkLength(4) + chunkType(4) + chunkData(N)
// BIN chunk:  chunkLength(4) + chunkType(4) + chunkData(N)

const MAGIC = 0x46546C67; // 'glTF'
const VERSION = 2;
const JSON_CHUNK_TYPE = 0x4E4F534A; // 'JSON'
const BIN_CHUNK_TYPE = 0x004E4942; // 'BIN\0'

const totalLength = 12 + 8 + jsonPadded.length + 8 + binBuffer.length;

const header = Buffer.allocUnsafe(12);
header.writeUInt32LE(MAGIC, 0);
header.writeUInt32LE(VERSION, 4);
header.writeUInt32LE(totalLength, 8);

const jsonChunkHeader = Buffer.allocUnsafe(8);
jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
jsonChunkHeader.writeUInt32LE(JSON_CHUNK_TYPE, 4);

const binChunkHeader = Buffer.allocUnsafe(8);
binChunkHeader.writeUInt32LE(binBuffer.length, 0);
binChunkHeader.writeUInt32LE(BIN_CHUNK_TYPE, 4);

const glb = Buffer.concat([header, jsonChunkHeader, jsonPadded, binChunkHeader, binBuffer]);

const outDir = resolve(__dirname, "../public");
const outPath = resolve(outDir, "plane.glb");
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, glb);
console.log(`✓ plane.glb written to ${outPath} (${glb.length} bytes)`);
