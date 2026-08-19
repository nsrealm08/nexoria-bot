const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { xpForLevel } = require('./leveling');

async function buildRankCard(user, row) {
  const width = 900, height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#1a0000');
  bg.addColorStop(1, '#3a0000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#c41e1e';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // avatar
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(140, 130, 90, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 40, 180, 180);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(140, 130, 90, 0, Math.PI * 2);
    ctx.stroke();
  } catch { /* fall back to no avatar */ }

  // text
  ctx.fillStyle = '#f0f0f0';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(user.username, 270, 100);

  ctx.fillStyle = '#c41e1e';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`LEVEL ${row.level}`, 270, 145);

  const need = xpForLevel(row.level);
  ctx.fillStyle = '#bbbbbb';
  ctx.font = '22px sans-serif';
  ctx.fillText(`${row.xp} / ${need} XP`, 270, 180);

  // xp bar
  const barX = 270, barY = 200, barW = 580, barH = 26;
  ctx.fillStyle = '#3a0000';
  ctx.fillRect(barX, barY, barW, barH);
  const pct = Math.min(row.xp / need, 1);
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#c41e1e');
  fillGrad.addColorStop(1, '#ff4d4d');
  ctx.fillStyle = fillGrad;
  ctx.fillRect(barX, barY, barW * pct, barH);
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);

  return canvas.toBuffer('image/png');
}

module.exports = { buildRankCard };
