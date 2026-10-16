import "server-only";
import { fail } from "./http";

export function imageType(bytes: Buffer): "image/png" | "image/jpeg" | "image/webp" {
  if (bytes.length < 24 || bytes.length > 2097152) fail(400, "Upload an image up to 2 MB.");
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString("ascii",12,16) === "IHDR") {
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (!width || !height || width * height > 25000000) fail(400, "This image is too large. Resize it before uploading.");
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[bytes.length-2] === 0xff && bytes[bytes.length-1] === 0xd9) return "image/jpeg";
  if (bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP" && bytes.readUInt32LE(4) + 8 === bytes.length && ["VP8 ","VP8L","VP8X"].includes(bytes.toString("ascii",12,16))) return "image/webp";
  fail(400, "Please upload a valid JPEG, PNG, or WebP image.");
}
