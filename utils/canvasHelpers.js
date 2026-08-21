// Shared helpers for card generation. Icons are drawn as vector shapes
// rather than emoji characters — headless Linux (Render) has no color
// emoji font installed, so emoji glyphs render as blank boxes.

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Small four-point sparkle/diamond, used as a decorative bullet.
function drawSparkle(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx + size * 0.15, cy - size * 0.15, cx + size, cy);
  ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.15, cx, cy + size);
  ctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.15, cx - size, cy);
  ctx.quadraticCurveTo(cx - size * 0.15, cy - size * 0.15, cx, cy - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Circular progress ring (used behind avatars). pct is 0..1.
function drawProgressRing(ctx, cx, cy, radius, pct, { trackColor = 'rgba(255,255,255,0.08)', lineWidth = 7, gradientFrom = '#ef4148', gradientTo = '#ff8a8f' } = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = lineWidth;

  ctx.strokeStyle = trackColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (pct > 0) {
    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, gradientFrom);
    grad.addColorStop(1, gradientTo);
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(pct, 1));
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiagonalAccents(ctx, width, height, color = 'rgba(239,65,72,0.35)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  // top-right corner mark
  ctx.beginPath();
  ctx.moveTo(width - 70, 22);
  ctx.lineTo(width - 22, 22);
  ctx.lineTo(width - 22, 70);
  ctx.stroke();
  // bottom-left corner mark
  ctx.beginPath();
  ctx.moveTo(22, height - 70);
  ctx.lineTo(22, height - 22);
  ctx.lineTo(70, height - 22);
  ctx.stroke();
  ctx.restore();
}

function clipCircleAvatar(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

module.exports = { roundedRect, drawSparkle, drawProgressRing, drawDiagonalAccents, clipCircleAvatar };
