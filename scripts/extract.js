const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

console.log('FFmpeg path:', ffmpegPath);

// Look for mp4 file in public/images
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const files = fs.readdirSync(imagesDir);
const mp4Files = files.filter(f => f.endsWith('.mp4'));

console.log('Found MP4 files:', mp4Files);

if (mp4Files.length === 0) {
  console.error('No MP4 file found in public/images');
  process.exit(1);
}

// Select the video file (e.g. hero-venue-cinematic.mp4 or Creating_cinematic_venue_reveal...)
const videoFile = path.join(imagesDir, mp4Files[0]);
console.log('Using video file:', videoFile);

// Target output folder for 400 frames
const outputDir = path.join(imagesDir, 'hero-frames');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Clear existing files in outputDir if any
fs.readdirSync(outputDir).forEach(f => fs.unlinkSync(path.join(outputDir, f)));

// We want exactly 400 frames from the first 8.2 seconds
// Rate = 400 / 8.2 = 48.7804878 fps
// Let's use -t 8.2 -vf "fps=400/8.2,scale=1920:-1:flags=lanczos" -q:v 2 for ultra-sharp 1080p/4k quality frames
// Or scale=2560:-1 or original resolution with qscale 2 / q:v 2
console.log('Extracting 400 frames from first 8.2s of video...');

// 1920x1080 high quality JPEGs with q:v 2 for crystal clarity while loading fast in browser
const ffmpegArgs = [
  '-y',
  '-ss', '0',
  '-t', '8.2',
  '-i', videoFile,
  '-vf', 'fps=400/8.2,scale=1920:-2:flags=lanczos',
  '-q:v', '2',
  '-vframes', '400',
  path.join(outputDir, 'frame-%03d.jpg')
];

const proc = spawn(ffmpegPath, ffmpegArgs);

proc.stderr.on('data', (data) => {
  const str = data.toString();
  if (str.includes('frame=') || str.includes('fps=') || str.includes('Stream #0:0')) {
    process.stdout.write(str);
  }
});

proc.on('close', (code) => {
  console.log('\nFFmpeg process finished with code:', code);
  const extractedFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg'));
  console.log(`Successfully extracted ${extractedFiles.length} frames into ${outputDir}`);
});
