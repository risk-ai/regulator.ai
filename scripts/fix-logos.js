const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../apps/marketing/public');
const brandDir = path.join(publicDir, 'brand');

async function main() {
  // The shield icon SVG - extract just the shield element
  // First, let's create a clean shield icon SVG with transparent background
  const shieldSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a5b4fc;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  <!-- Shield shape -->
  <path d="M256 32 L448 96 L448 240 C448 368 360 448 256 480 C152 448 64 368 64 240 L64 96 Z" 
        fill="url(#shieldGrad)" stroke="none"/>
  <!-- Inner shield highlight -->
  <path d="M256 56 L428 112 L428 236 C428 352 348 428 256 456 C164 428 84 352 84 236 L84 112 Z" 
        fill="url(#innerGrad)" stroke="none"/>
  <!-- V letter -->
  <text x="256" y="320" font-family="Inter, system-ui, sans-serif" font-size="220" font-weight="700" 
        fill="white" text-anchor="middle" dominant-baseline="central">V</text>
</svg>`;

  // Create output directory
  const outputDir = path.join(publicDir, 'brand', 'clean');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 1. Square icon - transparent background (for LinkedIn profile, favicon, etc.)
  const iconBuffer = Buffer.from(shieldSvg);
  
  // 800x800 square icon (LinkedIn profile pic)
  await sharp(iconBuffer)
    .resize(800, 800, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'vienna-os-icon-800.png'));
  console.log('✅ vienna-os-icon-800.png (800x800, transparent)');

  // 400x400 square icon
  await sharp(iconBuffer)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'vienna-os-icon-400.png'));
  console.log('✅ vienna-os-icon-400.png (400x400, transparent)');

  // 192x192 for web manifest
  await sharp(iconBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'vienna-os-icon-192.png'));
  console.log('✅ vienna-os-icon-192.png (192x192, transparent)');

  // 32x32 favicon
  await sharp(iconBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'favicon-32.png'));
  console.log('✅ favicon-32.png (32x32, transparent)');

  // 2. Horizontal lockup with text - transparent background
  const lockupSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
  <defs>
    <linearGradient id="shieldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="innerGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a5b4fc;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  <!-- Shield icon -->
  <g transform="translate(80, 50) scale(0.59)">
    <path d="M256 32 L448 96 L448 240 C448 368 360 448 256 480 C152 448 64 368 64 240 L64 96 Z" 
          fill="url(#shieldGrad2)" stroke="none"/>
    <path d="M256 56 L428 112 L428 236 C428 352 348 428 256 456 C164 428 84 352 84 236 L84 112 Z" 
          fill="url(#innerGrad2)" stroke="none"/>
    <text x="256" y="320" font-family="Inter, system-ui, sans-serif" font-size="220" font-weight="700" 
          fill="white" text-anchor="middle" dominant-baseline="central">V</text>
  </g>
  <!-- Text -->
  <text x="420" y="185" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="700" fill="white">Vienna OS</text>
  <text x="420" y="245" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="400" fill="#a5b4fc" letter-spacing="4">AI GOVERNANCE PLATFORM</text>
</svg>`;

  // Transparent lockup
  await sharp(Buffer.from(lockupSvg))
    .resize(1200, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'vienna-os-lockup-transparent.png'));
  console.log('✅ vienna-os-lockup-transparent.png (1200x400, transparent)');

  // Dark background lockup (for light surfaces)
  await sharp(Buffer.from(lockupSvg))
    .resize(1200, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: { r: 15, g: 23, b: 42 } }) // slate-900
    .png()
    .toFile(path.join(outputDir, 'vienna-os-lockup-dark.png'));
  console.log('✅ vienna-os-lockup-dark.png (1200x400, dark bg)');

  // 3. LinkedIn banner (1128x191)
  const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1128" height="191" viewBox="0 0 1128 191">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a" />
      <stop offset="100%" style="stop-color:#1e1b4b" />
    </linearGradient>
    <linearGradient id="shieldGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8" />
      <stop offset="100%" style="stop-color:#4f46e5" />
    </linearGradient>
  </defs>
  <rect width="1128" height="191" fill="url(#bannerBg)"/>
  <!-- Shield -->
  <g transform="translate(90, 15) scale(0.31)">
    <path d="M256 32 L448 96 L448 240 C448 368 360 448 256 480 C152 448 64 368 64 240 L64 96 Z" 
          fill="url(#shieldGrad3)" stroke="none"/>
    <text x="256" y="320" font-family="Inter, system-ui, sans-serif" font-size="220" font-weight="700" 
          fill="white" text-anchor="middle" dominant-baseline="central">V</text>
  </g>
  <text x="260" y="85" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="700" fill="white">Vienna OS</text>
  <text x="260" y="120" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="400" fill="#a5b4fc" letter-spacing="3">AI GOVERNANCE PLATFORM</text>
  <text x="260" y="155" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="400" fill="#94a3b8">Warrants · Policies · Audit Trails · Human Oversight</text>
</svg>`;

  await sharp(Buffer.from(bannerSvg))
    .png()
    .toFile(path.join(outputDir, 'vienna-os-linkedin-banner.png'));
  console.log('✅ vienna-os-linkedin-banner.png (1128x191)');

  // 4. OG image (1200x630) - clean version
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a" />
      <stop offset="50%" style="stop-color:#1e1b4b" />
      <stop offset="100%" style="stop-color:#0f172a" />
    </linearGradient>
    <linearGradient id="shieldGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8" />
      <stop offset="100%" style="stop-color:#4f46e5" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <!-- Shield centered -->
  <g transform="translate(430, 60) scale(0.55)">
    <path d="M256 32 L448 96 L448 240 C448 368 360 448 256 480 C152 448 64 368 64 240 L64 96 Z" 
          fill="url(#shieldGrad4)" stroke="none"/>
    <text x="256" y="320" font-family="Inter, system-ui, sans-serif" font-size="220" font-weight="700" 
          fill="white" text-anchor="middle" dominant-baseline="central">V</text>
  </g>
  <text x="600" y="400" font-family="Inter, system-ui, sans-serif" font-size="64" font-weight="700" fill="white" text-anchor="middle">Vienna OS</text>
  <text x="600" y="455" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="400" fill="#a5b4fc" text-anchor="middle" letter-spacing="4">AI GOVERNANCE PLATFORM</text>
  <text x="600" y="510" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="400" fill="#94a3b8" text-anchor="middle">Warrants · Policies · Audit Trails · Human-in-the-Loop</text>
  <text x="600" y="570" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">regulator.ai</text>
</svg>`;

  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(path.join(outputDir, 'vienna-os-og-image.png'));
  console.log('✅ vienna-os-og-image.png (1200x630)');

  console.log('\n📁 All files in:', outputDir);
  console.log('\nPlatform mapping:');
  console.log('  LinkedIn profile pic → vienna-os-icon-800.png');
  console.log('  LinkedIn banner → vienna-os-linkedin-banner.png');
  console.log('  Twitter/X profile → vienna-os-icon-400.png');
  console.log('  Website favicon → favicon-32.png');
  console.log('  Web manifest → vienna-os-icon-192.png');
  console.log('  OG/social share → vienna-os-og-image.png');
  console.log('  Website header → vienna-os-lockup-transparent.png');
}

main().catch(console.error);
