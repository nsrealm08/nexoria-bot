const { pool } = require('../database');

const cache = new Map(); // guildId -> Map<inviteCode, {uses, inviterId}>

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const invite of invites.values()) map.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id || null });
    cache.set(guild.id, map);
  } catch (err) {
    if (err?.code !== 50013) console.error(`Invite cache failed for ${guild.name}:`, err.message);
  }
}

async function cacheAllGuilds(client) {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
}

async function handleMemberJoin(member) {
  const before = cache.get(member.guild.id);
  if (!before) return null;

  let usedInvite = null;
  try {
    const after = await member.guild.invites.fetch();
    for (const invite of after.values()) {
      const prev = before.get(invite.code);
      if (prev && invite.uses > prev.uses) {
        usedInvite = { code: invite.code, inviterId: invite.inviter?.id || null };
        break;
      }
      if (!prev && invite.uses > 0) {
        usedInvite = { code: invite.code, inviterId: invite.inviter?.id || null };
        break;
      }
    }
    await cacheGuildInvites(member.guild);
  } catch {
    return null;
  }

  if (usedInvite?.inviterId) {
    await pool.query(
      'INSERT INTO invite_uses (guild_id, inviter_id, invited_user_id, invite_code, timestamp) VALUES ($1,$2,$3,$4,$5)',
      [member.guild.id, usedInvite.inviterId, member.id, usedInvite.code, Date.now()]);
  }
  return usedInvite;
}

module.exports = { cacheGuildInvites, cacheAllGuilds, handleMemberJoin };
