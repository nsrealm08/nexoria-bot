const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { drawProgressRing, drawSparkle, clipCircleAvatar } = require('./canvasHelpers');
const { xpForLevel } = require('./leveling');

async function buildLevelUpCard(user, oldLevel, newLevel, xp) {
  const width = 900, height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0a0000');
  bg.addColorStop(1, '#2b0507');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(150, 150, 10, 150, 150, 200);
  glow.addColorStop(0, 'rgba(239,65,72,0.4)');
  glow.addColorStop(1, 'rgba(239,65,72,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(239,65,72,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  const cx = 150, cy = 150, radius = 82;
  const need = xpForLevel(newLevel);
  const pct = need > 0 ? xp / need : 0;
  drawProgressRing(ctx, cx, cy, radius + 12, pct, { lineWidth: 6 });

  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    clipCircleAvatar(ctx, avatar, cx, cy, radius);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
  } catch { /* fall back to no avatar */ }

  const titleGrad = ctx.createLinearGradient(320, 0, 780, 0);
  titleGrad.addColorStop(0, '#ff8a8f');
  titleGrad.addColorStop(1, '#ef4148');
  ctx.textAlign = 'left';
  ctx.fillStyle = titleGrad;
  ctx.font = '900 46px sans-serif';
  ctx.fillText('LEVEL UP!', 300, 110);
  drawSparkle(ctx, 300, 60, 9, '#ff8a8f');
  drawSparkle(ctx, 620, 75, 6, '#ef4148');

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 22px sans-serif';
  let displayName = user.username;
  if (ctx.measureText(displayName).width > 480) {
    while (ctx.measureText(displayName + '…').width > 480 && displayName.length > 1) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '…';
  }
  ctx.fillText(displayName, 300, 145);

  ctx.font = '700 30px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(String(oldLevel), 300, 200);
  const oldWidth = ctx.measureText(String(oldLevel)).width;

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('→', 300 + oldWidth + 14, 198);
  const arrowWidth = ctx.measureText('→').width;

  ctx.font = '800 34px sans-serif';
  const newLevelGrad = ctx.createLinearGradient(0, 0, 100, 0);
  newLevelGrad.addColorStop(0, '#ff8a8f');
  newLevelGrad.addColorStop(1, '#ef4148');
  ctx.fillStyle = newLevelGrad;
  ctx.fillText(String(newLevel), 300 + oldWidth + arrowWidth + 30, 202);

  const barX = 300, barY = 230, barW = 550, barH = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 10); else ctx.rect(barX, barY, barW, barH);
  ctx.fill();

  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#ef4148');
  fillGrad.addColorStop(1, '#ff8a8f');
  ctx.fillStyle = fillGrad;
  const fillW = Math.max(barH, barW * Math.min(pct, 1));
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, fillW, barH, 10); else ctx.rect(barX, barY, fillW, barH);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 13px sans-serif';
  ctx.fillText(`${xp} / ${need} XP`, barX, barY + 36);

  return canvas.toBuffer('image/png');
}

module.exports = { buildLevelUpCard };
