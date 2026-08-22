const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { drawProgressRing, drawSparkle, clipCircleAvatar } = require('./canvasHelpers');
const { xpForLevel } = require('./leveling');

const WIDTH = 900, HEIGHT = 300;
const REVEAL_FRAMES = 8;
const IDLE_FRAMES = 10;
const TOTAL_FRAMES = REVEAL_FRAMES + IDLE_FRAMES;

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function drawFrame(ctx, user, avatarImg, oldLevel, newLevel, xp, need, t) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#0a0000');
  bg.addColorStop(1, '#2b0507');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(150, 150, 10, 150, 150, 200);
  glow.addColorStop(0, `rgba(239,65,72,${0.4 * t.glowAlpha})`);
  glow.addColorStop(1, 'rgba(239,65,72,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(239,65,72,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);

  const cx = 150, cy = 150, radius = 82;
  const pct = need > 0 ? xp / need : 0;
  drawProgressRing(ctx, cx, cy, radius + 12, pct * t.ringReveal, { lineWidth: 6 });

  if (avatarImg) {
    clipCircleAvatar(ctx, avatarImg, cx, cy, radius);
  } else {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();

  const titleGrad = ctx.createLinearGradient(320, 0, 780, 0);
  titleGrad.addColorStop(0, `rgba(255,138,143,${t.textAlpha})`);
  titleGrad.addColorStop(1, `rgba(239,65,72,${t.textAlpha})`);
  ctx.textAlign = 'left';
  ctx.fillStyle = titleGrad;
  ctx.font = '900 46px sans-serif';
  ctx.fillText('LEVEL UP!', 300, 110);
  drawSparkle(ctx, 300, 60, 9, `rgba(255,138,143,${t.sparkleAlpha1})`);
  drawSparkle(ctx, 620, 75, 6, `rgba(239,65,72,${t.sparkleAlpha2})`);

  ctx.fillStyle = `rgba(255,255,255,${0.85 * t.textAlpha})`;
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
  ctx.fillStyle = `rgba(255,255,255,${0.4 * t.textAlpha})`;
  ctx.fillText(String(oldLevel), 300, 200);
  const oldWidth = ctx.measureText(String(oldLevel)).width;

  ctx.fillStyle = `rgba(255,255,255,${0.35 * t.textAlpha})`;
  ctx.font = '700 26px sans-serif';
  ctx.fillText('→', 300 + oldWidth + 14, 198);
  const arrowWidth = ctx.measureText('→').width;

  ctx.font = '800 34px sans-serif';
  const newLevelGrad = ctx.createLinearGradient(0, 0, 100, 0);
  newLevelGrad.addColorStop(0, `rgba(255,138,143,${t.textAlpha})`);
  newLevelGrad.addColorStop(1, `rgba(239,65,72,${t.textAlpha})`);
  ctx.fillStyle = newLevelGrad;
  ctx.fillText(String(newLevel), 300 + oldWidth + arrowWidth + 30, 202);

  const barX = 300, barY = 230, barW = 550, barH = 20;
  ctx.fillStyle = `rgba(255,255,255,${0.08 * t.textAlpha})`;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 10); else ctx.rect(barX, barY, barW, barH);
  ctx.fill();

  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, `rgba(239,65,72,${t.textAlpha})`);
  fillGrad.addColorStop(1, `rgba(255,138,143,${t.textAlpha})`);
  ctx.fillStyle = fillGrad;
  const fillW = Math.max(barH, barW * Math.min(pct, 1) * t.ringReveal);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, fillW, barH, 10); else ctx.rect(barX, barY, fillW, barH);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${0.5 * t.textAlpha})`;
  ctx.font = '600 13px sans-serif';
  ctx.fillText(`${xp} / ${need} XP`, barX, barY + 36);
}

async function buildLevelUpCard(user, oldLevel, newLevel, xp) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const need = xpForLevel(newLevel);

  let avatarImg = null;
  try {
    avatarImg = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
  } catch { /* frames will draw a placeholder circle instead */ }

  const gif = GIFEncoder();

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    let t;
    if (i < REVEAL_FRAMES) {
      const revealT = easeOutCubic(i / (REVEAL_FRAMES - 1));
      t = {
        ringReveal: revealT,
        glowAlpha: revealT,
        textAlpha: Math.min(1, revealT * 1.4),
        sparkleAlpha1: revealT,
        sparkleAlpha2: revealT
      };
    } else {
      const idleT = (i - REVEAL_FRAMES) / IDLE_FRAMES;
      t = {
        ringReveal: 1,
        glowAlpha: 0.85 + 0.15 * Math.sin(idleT * Math.PI * 2),
        textAlpha: 1,
        sparkleAlpha1: 0.5 + 0.5 * Math.sin(idleT * Math.PI * 4),
        sparkleAlpha2: 0.5 + 0.5 * Math.sin(idleT * Math.PI * 4 + Math.PI)
      };
    }

    drawFrame(ctx, user, avatarImg, oldLevel, newLevel, xp, need, t);

    const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    const isLastFrame = i === TOTAL_FRAMES - 1;
    gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: isLastFrame ? 35 : i < REVEAL_FRAMES ? 4 : 8 });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

module.exports = { buildLevelUpCard };
