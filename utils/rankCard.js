const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { drawProgressRing, drawSparkle, drawDiagonalAccents, clipCircleAvatar } = require('./canvasHelpers');
const { xpForLevel } = require('./leveling');

async function buildRankCard(user, row) {
  const width = 900, height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0a0000');
  bg.addColorStop(1, '#2b0507');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(140, 130, 10, 140, 130, 180);
  glow.addColorStop(0, 'rgba(239,65,72,0.35)');
  glow.addColorStop(1, 'rgba(239,65,72,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(239,65,72,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  drawDiagonalAccents(ctx, width, height);

  const need = xpForLevel(row.level);
  const pct = need > 0 ? row.xp / need : 0;
  const cx = 140, cy = 130, radius = 78;

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

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px sans-serif';
  let displayName = user.username;
  if (ctx.measureText(displayName).width > 480) {
    while (ctx.measureText(displayName + '…').width > 480 && displayName.length > 1) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '…';
  }
  ctx.fillText(displayName, 270, 90);

  const levelGrad = ctx.createLinearGradient(270, 0, 470, 0);
  levelGrad.addColorStop(0, '#ff8a8f');
  levelGrad.addColorStop(1, '#ef4148');
  ctx.fillStyle = levelGrad;
  ctx.font = '900 28px sans-serif';
  const levelText = `LEVEL ${row.level}`;
  ctx.fillText(levelText, 270, 132);
  drawSparkle(ctx, 270 + ctx.measureText(levelText).width + 20, 122, 6, '#ff8a8f');

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 18px sans-serif';
  ctx.fillText(`${row.xp} / ${need} XP`, 270, 165);

  const barX = 270, barY = 190, barW = 580, barH = 22;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 11); else ctx.rect(barX, barY, barW, barH);
  ctx.fill();

  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#ef4148');
  fillGrad.addColorStop(1, '#ff8a8f');
  ctx.fillStyle = fillGrad;
  const fillW = Math.max(barH, barW * Math.min(pct, 1));
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, fillW, barH, 11); else ctx.rect(barX, barY, fillW, barH);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

module.exports = { buildRankCard };
