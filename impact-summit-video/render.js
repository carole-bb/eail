// Renders video.html frame by frame with headless Chromium and encodes with ffmpeg.
// usage: node render.js out.mp4 [seconds] [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const out = process.argv[2] || 'out.mp4', dur = +process.argv[3] || 10, fps = +process.argv[4] || 30;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'video.html'));
  await page.waitForFunction('window.READY');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let f = 0; f < dur * fps; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 95 }));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
