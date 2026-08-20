const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function buildWelcomeCard(member) {
  const width = 900, height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0d0000');
  bg.addColorStop(1, '#3a0000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#c41e1e';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, 115, 85, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, width / 2 - 85, 30, 170, 170);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(width / 2, 115, 85, 0, Math.PI * 2);
    ctx.stroke();
  } catch { /* fall back to no avatar */ }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0f0f0';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('WELCOME', width / 2, 245);

  ctx.fillStyle = '#c41e1e';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(member.user.username, width / 2, 285);

  ctx.fillStyle = '#bbbbbb';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Member #${member.guild.memberCount} · ${member.guild.name}`, width / 2, 312);

  return canvas.toBuffer('image/png');
}

module.exports = { buildWelcomeCard };
