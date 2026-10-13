/**
 * Renders the authentic retro 6-BIT graphics background image:
 * - 64-color palette with deep emerald void (#01160d)
 * - 1-Bit monochrome pixel horizon & seed coordinate points
 * - 2-Bit 4-shade stepped perspective floor & twinkling pixel stars
 * - 3-Bit pixel constellation nodes & stepped connectors
 * - 4-Bit chunky stepped pixel mountains & parallax dust motes
 * - 5-Bit checkerboard dithered pixel nebula & rising motes
 * - 6-Bit dual pixel perspective grid (ceiling raster bars) & 8-Bit Pixel Sunrise Disk at horizon center
 * - Subtle retro CRT scanlines and screen vignette
 */
export function draw6BitBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  // 1. Base 6-bit void background fill
  ctx.fillStyle = '#01160d';
  ctx.fillRect(0, 0, w, h);

  const horizonY = Math.floor(h * 0.627); // Standard horizon line (276px on 440h)

  // -------------------------------------------------------------
  // BIT 1: 1-BIT MONOCHROME PIXEL HORIZON & SEED COORDINATES
  // -------------------------------------------------------------
  ctx.fillStyle = 'rgba(24, 89, 38, 0.45)';
  for (let x = 0; x < w; x += 12) {
    ctx.fillRect(x, horizonY, 8, 2);
  }

  // Monochrome seed coordinate points in upper sky
  ctx.fillStyle = 'rgba(51, 255, 102, 0.7)';
  const seedPoints = [
    { x: Math.floor((w * 0.16) / 4) * 4, y: Math.floor(h * 0.11) },
    { x: Math.floor((w * 0.36) / 4) * 4, y: Math.floor(h * 0.16) },
    { x: Math.floor((w * 0.68) / 4) * 4, y: Math.floor(h * 0.09) },
    { x: Math.floor((w * 0.86) / 4) * 4, y: Math.floor(h * 0.15) },
  ];
  seedPoints.forEach(pt => ctx.fillRect(pt.x, pt.y, 3, 3));

  // -------------------------------------------------------------
  // BIT 2: 2-BIT 4-SHADE STEPPED PERSPECTIVE FLOOR & PIXEL STARS
  // -------------------------------------------------------------
  ctx.fillStyle = 'rgba(28, 85, 40, 0.26)';
  for (let fy = horizonY + 8; fy < h; fy += 12) {
    const stepH = fy > horizonY + 60 ? 3 : 2;
    ctx.fillRect(0, fy, w, stepH);
  }

  // Twinkling pixel stars in upper sky
  for (let s = 0; s < 12; s++) {
    const sx = Math.floor(((s * 116 + 24) % w) / 4) * 4;
    const sy = Math.floor(((s * 41 + 16) % Math.max(70, horizonY - 45)) / 4) * 4;
    const blink = (Math.sin(time * 0.003 + s * 1.5) + 1) * 0.5;
    if (blink > 0.35) {
      ctx.fillStyle = 'rgba(85, 255, 153, 0.55)';
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // -------------------------------------------------------------
  // BIT 3: 3-BIT PIXEL CONSTELLATION NODES (8 COLORS)
  // -------------------------------------------------------------
  const cNodes = [
    { x: Math.floor((w * 0.14) / 4) * 4, y: Math.floor(h * 0.13) },
    { x: Math.floor((w * 0.28) / 4) * 4, y: Math.floor(h * 0.08) },
    { x: Math.floor((w * 0.44) / 4) * 4, y: Math.floor(h * 0.15) },
    { x: Math.floor((w * 0.60) / 4) * 4, y: Math.floor(h * 0.10) },
    { x: Math.floor((w * 0.76) / 4) * 4, y: Math.floor(h * 0.18) },
    { x: Math.floor((w * 0.90) / 4) * 4, y: Math.floor(h * 0.11) },
  ];

  ctx.fillStyle = 'rgba(51, 204, 153, 0.22)';
  for (let n = 0; n < cNodes.length - 1; n++) {
    const n1 = cNodes[n];
    const n2 = cNodes[n + 1];
    const steps = Math.max(Math.abs(n2.x - n1.x), Math.abs(n2.y - n1.y)) / 4;
    for (let st = 0; st <= steps; st++) {
      const px = Math.floor((n1.x + (n2.x - n1.x) * (st / steps)) / 4) * 4;
      const py = Math.floor((n1.y + (n2.y - n1.y) * (st / steps)) / 4) * 4;
      ctx.fillRect(px, py, 2, 2);
    }
  }

  ctx.fillStyle = 'rgba(85, 255, 170, 0.7)';
  cNodes.forEach(node => {
    ctx.fillRect(node.x - 2, node.y - 4, 4, 8);
    ctx.fillRect(node.x - 4, node.y - 2, 8, 4);
  });

  // -------------------------------------------------------------
  // BIT 4: 4-BIT CHUNKY STEPPED PIXEL MOUNTAINS (16 COLORS)
  // -------------------------------------------------------------
  ctx.fillStyle = 'rgba(25, 95, 45, 0.32)';
  const mountainBaseY = horizonY - 28;
  for (let mx = 0; mx < w; mx += 8) {
    const peakHeight = Math.floor((Math.sin(mx * 0.015) * 18 + Math.cos(mx * 0.03) * 11) / 4) * 4;
    const colHeight = Math.max(6, 26 + peakHeight);
    ctx.fillRect(mx, mountainBaseY - colHeight, 8, colHeight);
  }

  // Parallax drifting pixel dust motes
  ctx.fillStyle = 'rgba(102, 255, 178, 0.45)';
  for (let p = 0; p < 18; p++) {
    const px = Math.floor(((p * 88 + time * 0.02) % w) / 4) * 4;
    const py = Math.floor(((p * 37 + 12) % Math.max(60, horizonY - 40)) / 4) * 4;
    ctx.fillRect(px, py, 2, 2);
  }

  // -------------------------------------------------------------
  // BIT 5: 5-BIT DITHERED PIXEL NEBULA & RISING MOTES (32 COLORS)
  // -------------------------------------------------------------
  ctx.fillStyle = 'rgba(15, 65, 40, 0.26)';
  const nebWidth = Math.floor((w * 0.6) / 16) * 16;
  const nebStart = Math.floor((w * 0.2) / 16) * 16;
  const nebTop = Math.floor(h * 0.05);
  const nebBottom = Math.floor(h * 0.28);
  for (let nx = nebStart; nx < nebStart + nebWidth; nx += 16) {
    for (let ny = nebTop; ny < nebBottom; ny += 16) {
      if ((Math.floor(nx / 16) + Math.floor(ny / 16)) % 2 === 0) {
        ctx.fillRect(nx, ny, 8, 8);
      }
    }
  }

  // Floating pixel data packets drifting upward
  ctx.fillStyle = 'rgba(102, 230, 180, 0.45)';
  for (let m = 0; m < 14; m++) {
    const mx = Math.floor(((m * 68 + Math.sin(time * 0.001 + m) * 16) % w) / 4) * 4;
    const my = Math.floor((h - ((time * 0.03 + m * 32) % h)) / 4) * 4;
    // Keep horizon line visible
    if (my < horizonY - 60 || my > horizonY + 30) {
      ctx.fillRect(mx, my, 3, 3);
    }
  }

  // -------------------------------------------------------------
  // BIT 6: 6-BIT DUAL PIXEL PERSPECTIVE GRID & PIXEL SUNRISE DISK
  // -------------------------------------------------------------
  // Pixelated ceiling raster bars
  ctx.fillStyle = 'rgba(25, 90, 50, 0.18)';
  for (let cy = 8; cy < Math.min(110, horizonY * 0.4); cy += 16) {
    ctx.fillRect(0, cy, w, 2);
  }

  // 8-Bit Pixel Sunrise Disk at horizon center
  const cx = Math.floor((w / 2) / 4) * 4;
  const cy = horizonY - 42;
  const sunR = 26;
  ctx.fillStyle = 'rgba(45, 170, 85, 0.26)';
  for (let dy = -sunR; dy <= sunR; dy += 6) {
    const span = Math.floor(Math.sqrt(Math.max(0, sunR * sunR - dy * dy)) / 4) * 4;
    if (span > 0 && Math.abs(dy) % 6 !== 0) {
      ctx.fillRect(cx - span, cy + dy, span * 2, 3);
    }
  }

  // -------------------------------------------------------------
  // CRT Scanline Overlay & Vignette (Batched single path for 60 FPS)
  // -------------------------------------------------------------
  ctx.fillStyle = 'rgba(0, 20, 5, 0.04)';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 0; y < h; y += 4) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Screen Vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 8, 2, 0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
