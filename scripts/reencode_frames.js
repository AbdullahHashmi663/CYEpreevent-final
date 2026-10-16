const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

console.log('Using ffmpeg at:', ffmpegPath);

const imagesDir = path.join(__dirname, '..', 'public', 'images');
const outputDir = path.join(imagesDir, 'hero-frames');
const videoFile = path.join(imagesDir, 'hero-venue-cinematic.mp4');

if (!fs.existsSync(videoFile)) {
  console.error('Video file not found:', videoFile);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Extracting 260 frames at 50% WebP quality from video:', videoFile);

// Extract exactly 260 frames in webp format at 50% quality
// Video duration is around 8.2s, so 260 frames over 8.2s = 260 / 8.2 = 31.7073 fps
const ffmpegArgs = [
  '-y',
  '-ss', '0',
  '-t', '8.2',
  '-i', videoFile,
  '-vf', 'fps=260/8.2,scale=1280:-2',
  '-vcodec', 'libwebp',
  '-quality', '50',
  '-compression_level', '4',
  '-vframes', '260',
  path.join(outputDir, 'frame-%03d.webp')
];

console.log('Running FFmpeg with args:', ffmpegArgs.join(' '));
const result = spawnSync(ffmpegPath, ffmpegArgs, { stdio: 'inherit' });

if (result.error) {
  console.error('FFmpeg error:', result.error);
  process.exit(1);
}

const frames = fs.readdirSync(outputDir).filter(f => f.endsWith('.webp'));
console.log(`Successfully generated ${frames.length} frames at 50% quality in ${outputDir}`);

// Calculate total size
let totalSize = 0;
frames.forEach(f => {
  totalSize += fs.statSync(path.join(outputDir, f)).size;
});
console.log(`Total size of 260 frames: ${(totalSize / (1024 * 1024)).toFixed(2)} MB (avg ${(totalSize / frames.length / 1024).toFixed(1)} KB per frame)`);
