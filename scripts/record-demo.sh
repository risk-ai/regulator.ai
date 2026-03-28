#!/bin/bash
# Record Vienna OS demo and convert to MP4
# Run on a machine with Chrome/Chromium + ffmpeg (e.g., the NUC)
# Usage: ./scripts/record-demo.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="/tmp/vienna-demo-recording"
FRAMES_DIR="$WORK_DIR/frames"
OUTPUT="$SCRIPT_DIR/../vienna-os-demo.mp4"

echo "📹 Vienna OS Demo Recorder"
echo "=========================="

# Check deps
command -v ffmpeg >/dev/null || { echo "❌ ffmpeg not found. Install: sudo apt install ffmpeg"; exit 1; }
command -v npx >/dev/null || { echo "❌ npx not found. Install Node.js 18+"; exit 1; }

# Setup
rm -rf "$WORK_DIR"
mkdir -p "$FRAMES_DIR"
cd "$WORK_DIR"

npm init -y --silent
npm install puppeteer --silent

# Record script
cat > record.js << 'SCRIPT'
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = process.env.FRAMES_DIR || './frames';
const WIDTH = 1920;
const HEIGHT = 1080;

async function record() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  console.log('Loading demo page...');
  await page.goto('https://regulator.ai/demo', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Click play
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Play')) { await btn.click(); console.log('▶ Playing...'); break; }
  }

  // Screencast
  const frames = [];
  const client = await page.createCDPSession();
  client.on('Page.screencastFrame', async (event) => {
    frames.push(Buffer.from(event.data, 'base64'));
    try { await client.send('Page.screencastFrameAck', { sessionId: event.sessionId }); } catch {}
  });

  await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: WIDTH, maxHeight: HEIGHT });

  // Record 3+ minutes
  for (let i = 0; i <= 185; i++) {
    if (i % 30 === 0) console.log(`  ⏺ ${i}s / 185s (${frames.length} frames)`);
    await new Promise(r => setTimeout(r, 1000));
  }

  await client.send('Page.stopScreencast');
  console.log(`✅ ${frames.length} frames captured`);

  // Save every 15th frame (smooth enough for 2fps playback → 30fps output)
  const sampled = frames.filter((_, i) => i % 15 === 0);
  for (let i = 0; i < sampled.length; i++) {
    fs.writeFileSync(path.join(FRAMES_DIR, `frame-${String(i).padStart(5, '0')}.jpg`), sampled[i]);
  }
  console.log(`✅ ${sampled.length} key frames saved`);

  await browser.close();
}

record().catch(e => { console.error(e); process.exit(1); });
SCRIPT

echo "⏺ Recording demo (3 minutes)..."
FRAMES_DIR="$FRAMES_DIR" node record.js

FRAME_COUNT=$(ls "$FRAMES_DIR" | wc -l)
echo "🎞 Converting $FRAME_COUNT frames to MP4..."

ffmpeg -y -framerate 2 \
  -i "$FRAMES_DIR/frame-%05d.jpg" \
  -c:v libx264 -pix_fmt yuv420p \
  -vf "scale=1920:1080" \
  -r 30 \
  "$OUTPUT"

echo ""
echo "✅ Demo video saved to: $OUTPUT"
echo "📁 Size: $(du -h "$OUTPUT" | cut -f1)"

# Cleanup
rm -rf "$WORK_DIR"
