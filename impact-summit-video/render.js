// Renders video.html frame by frame with headless Chromium and encodes with ffmpeg.
// usage: node render.js out.mp4 [seconds] [fps] [audio.wav]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const out = process.argv[2] || 'out.mp4', dur = +process.argv[3] || 40, fps = +process.argv[4] || 30, audio = process.argv[5];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'video.html'));
  await page.waitForFunction('window.READY', { timeout: 120000 });
  const args = ['-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-', ...(audio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', ...(audio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart', out];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let f = 0; f < dur * fps; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    if (!ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 95 }))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
