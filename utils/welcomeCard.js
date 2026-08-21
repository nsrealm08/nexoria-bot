const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { drawSparkle, drawDiagonalAccents, clipCircleAvatar } = require('./canvasHelpers');

const WIDTH = 1000, HEIGHT = 340;
const REVEAL_FRAMES = 8;
const IDLE_FRAMES = 10;
const TOTAL_FRAMES = REVEAL_FRAMES + IDLE_FRAMES;

function drawFrame(ctx, member, avatarImg, t) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#0a0000');
  bg.addColorStop(0.55, '#1c0303');
  bg.addColorStop(1, '#3d0a0c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, 118, 10, WIDTH / 2, 118, 220);
  glow.addColorStop(0, `rgba(239,65,72,${0.35 * t.glowAlpha})`);
  glow.addColorStop(1, 'rgba(239,65,72,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(239,65,72,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);
  drawDiagonalAccents(ctx, WIDTH, HEIGHT);

  const cx = WIDTH / 2, cy = 118, radius = 78;

  ctx.save();
  ctx.shadowColor = `rgba(239,65,72,${0.6 * t.glowAlpha})`;
  ctx.shadowBlur = 30 * t.glowAlpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, -Math.PI / 2, -Math.PI / 2 + t.ringAngle);
  ctx.strokeStyle = `rgba(239,65,72,${0.9 * t.glowAlpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  if (avatarImg) {
    clipCircleAvatar(ctx, avatarImg, cx, cy, radius);
  } else {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + t.ringAngle);
  ctx.strokeStyle = `rgba(255,255,255,${0.9 * Math.min(1, t.ringAngle / (Math.PI * 2) + 0.05)})`;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255,255,255,${0.55 * t.textAlpha})`;
  ctx.font = '700 18px sans-serif';
  const eyebrow = 'W E L C O M E';
  ctx.fillText(eyebrow, WIDTH / 2, 232);
  const eyebrowWidth = ctx.measureText(eyebrow).width;
  drawSparkle(ctx, WIDTH / 2 - eyebrowWidth / 2 - 22, 227, 7, `rgba(239,65,72,${t.sparkleAlpha1})`);
  drawSparkle(ctx, WIDTH / 2 + eyebrowWidth / 2 + 22, 227, 7, `rgba(239,65,72,${t.sparkleAlpha2})`);

  ctx.fillStyle = `rgba(255,255,255,${t.textAlpha})`;
  ctx.font = '800 40px sans-serif';
  let displayName = member.user.username;
  if (ctx.measureText(displayName).width > WIDTH - 120) {
    while (ctx.measureText(displayName + '…').width > WIDTH - 120 && displayName.length > 1) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '…';
  }
  ctx.fillText(displayName, WIDTH / 2, 275);

  ctx.fillStyle = `rgba(255,255,255,${0.6 * t.textAlpha})`;
  ctx.font = '600 16px sans-serif';
  const left = `Member #${member.guild.memberCount}`;
  const right = member.guild.name;
  const gap = 22;
  const leftWidth = ctx.measureText(left).width;
  const rightWidth = ctx.measureText(right).width;
  const totalWidth = leftWidth + gap + rightWidth;
  const startX = WIDTH / 2 - totalWidth / 2;
  ctx.textAlign = 'left';
  ctx.fillText(left, startX, 306);
  ctx.fillText(right, startX + leftWidth + gap, 306);
  drawSparkle(ctx, startX + leftWidth + gap / 2, 301, 4, `rgba(239,65,72,${t.textAlpha})`);
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

async function buildWelcomeCard(member) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  let avatarImg = null;
  try {
    avatarImg = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
  } catch { /* frames will draw a placeholder circle instead */ }

  const gif = GIFEncoder();

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    let t;
    if (i < REVEAL_FRAMES) {
      const revealT = easeOutCubic(i / (REVEAL_FRAMES - 1));
      t = {
        ringAngle: revealT * Math.PI * 2,
        glowAlpha: revealT,
        textAlpha: Math.min(1, revealT * 1.4),
        sparkleAlpha1: revealT,
        sparkleAlpha2: revealT
      };
    } else {
      const idleT = (i - REVEAL_FRAMES) / IDLE_FRAMES;
      t = {
        ringAngle: Math.PI * 2,
        glowAlpha: 0.85 + 0.15 * Math.sin(idleT * Math.PI * 2),
        textAlpha: 1,
        sparkleAlpha1: 0.5 + 0.5 * Math.sin(idleT * Math.PI * 4),
        sparkleAlpha2: 0.5 + 0.5 * Math.sin(idleT * Math.PI * 4 + Math.PI)
      };
    }

    drawFrame(ctx, member, avatarImg, t);

    const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    const isLastFrame = i === TOTAL_FRAMES - 1;
    gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: isLastFrame ? 35 : i < REVEAL_FRAMES ? 4 : 8 });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

module.exports = { buildWelcomeCard };
