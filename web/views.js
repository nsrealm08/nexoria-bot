const layout = (title, body) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Nexoria</title>
<style>
  body { background:#0d0000; color:#f0f0f0; font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
  a { color: #ff6b6b; }
  h1, h2 { color: #ff4d4d; }
  .card { background:#1a0000; border:1px solid #c41e1e; border-radius:10px; padding:20px; margin-bottom:16px; }
  label { display:block; margin-top:14px; font-weight:600; }
  input[type=text], textarea, select { width:100%; padding:8px; margin-top:4px; border-radius:6px; border:1px solid #c41e1e; background:#0d0000; color:#fff; box-sizing:border-box; }
  input[type=checkbox] { margin-top:6px; }
  button { margin-top:18px; background:#c41e1e; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:600; }
  button:hover { background:#e63946; }
  .guild-link { display:block; padding:12px; background:#1a0000; border:1px solid #c41e1e; border-radius:8px; margin-bottom:10px; text-decoration:none; color:#fff; }
  .guild-link:hover { background:#2a0000; }
  .top { display:flex; justify-content:space-between; align-items:center; }
</style>
</head>
<body>${body}</body>
</html>`;

const loginPage = () => layout('Login', `
  <div class="top"><h1>Nexoria Dashboard</h1></div>
  <div class="card">
    <p>Log in with Discord to configure Nexoria for servers where you have the Manage Server permission.</p>
    <a href="/login"><button>Log in with Discord</button></a>
  </div>
`);

const guildListPage = (user, guilds, botGuildIds) => layout('Servers', `
  <div class="top"><h1>Your servers</h1><a href="/logout">Log out (${user.username})</a></div>
  ${guilds.map(g => {
    const hasBot = botGuildIds.has(g.id);
    return hasBot
      ? `<a class="guild-link" href="/dashboard/${g.id}">${g.name}</a>`
      : `<div class="guild-link" style="opacity:.5">${g.name} — Nexoria not in this server</div>`;
  }).join('')}
`);

const settingsPage = (guild, settings, automod, antiraid, levelRewards = [], reactionRoles = [], roleMenus = []) => layout('Settings', `
  <div class="top"><h1>${guild.name}</h1><a href="/dashboard">← All servers</a></div>
  <p><a href="/dashboard/${guild.id}/stats">📊 View server stats →</a></p>

  <form method="POST" action="/dashboard/${guild.id}">
    <div class="card">
      <h2>Welcome</h2>
      <label>Welcome channel ID</label>
      <input type="text" name="welcome_channel" value="${settings?.welcome_channel || ''}" placeholder="e.g. 123456789012345678">
      <label>Welcome message (use {user} and {server})</label>
      <textarea name="welcome_msg" rows="2">${settings?.welcome_msg || ''}</textarea>
    </div>

    <div class="card">
      <h2>Logging & leveling</h2>
      <label>Mod-log channel ID</label>
      <input type="text" name="log_channel" value="${settings?.log_channel || ''}">
      <label>Level-up announcement channel ID</label>
      <input type="text" name="level_channel" value="${settings?.level_channel || ''}">
      <label>Suggestions channel ID</label>
      <input type="text" name="suggestions_channel" value="${settings?.suggestions_channel || ''}">
    </div>

    <div class="card">
      <h2>Automod</h2>
      <label>Banned words (comma-separated)</label>
      <input type="text" name="banned_words" value="${(automod?.banned_words || []).join(', ')}">
      <label><input type="checkbox" name="block_invites" ${automod?.block_invites ? 'checked' : ''}> Block Discord invite links</label>
      <label>Mass mention limit (0 = off)</label>
      <input type="text" name="mass_mention_limit" value="${automod?.mass_mention_limit ?? 0}">
      <label>Spam limit — messages per 5s (0 = off)</label>
      <input type="text" name="spam_limit" value="${automod?.spam_limit ?? 0}">
    </div>

    <div class="card">
      <h2>Anti-raid</h2>
      <label><input type="checkbox" name="antiraid_enabled" ${antiraid?.enabled ? 'checked' : ''}> Enabled</label>
      <label>Join threshold</label>
      <input type="text" name="join_threshold" value="${antiraid?.join_threshold ?? 5}">
      <label>Window (seconds)</label>
      <input type="text" name="window_seconds" value="${antiraid?.window_seconds ?? 10}">
      <label>Action</label>
      <select name="antiraid_action">
        <option value="lockdown" ${antiraid?.action === 'lockdown' ? 'selected' : ''}>Lock server</option>
        <option value="kick" ${antiraid?.action === 'kick' ? 'selected' : ''}>Kick new joiners</option>
      </select>
    </div>

    <button type="submit">Save settings</button>
  </form>

  <div class="card">
    <h2>Level rewards</h2>
    ${levelRewards.length ? levelRewards.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #3a0000;">
        <span>Level <b>${r.level}</b> → Role ID <code>${r.role_id}</code></span>
        <form method="POST" action="/dashboard/${guild.id}/level-rewards/delete" style="margin:0;">
          <input type="hidden" name="level" value="${r.level}">
          <button type="submit" style="margin:0; padding:4px 10px;">Remove</button>
        </form>
      </div>`).join('') : '<p>None configured.</p>'}
    <form method="POST" action="/dashboard/${guild.id}/level-rewards" style="margin-top:12px;">
      <label>Level</label>
      <input type="text" name="level" placeholder="5" required>
      <label>Role ID</label>
      <input type="text" name="role_id" placeholder="Right-click a role → Copy ID" required>
      <button type="submit">Add reward</button>
    </form>
  </div>

  <div class="card">
    <h2>Reaction roles</h2>
    ${reactionRoles.length ? reactionRoles.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #3a0000;">
        <span>${r.emoji} → Role ID <code>${r.role_id}</code> ${r.group_name ? `(group: ${r.group_name})` : ''}</span>
        <form method="POST" action="/dashboard/${guild.id}/reaction-roles/delete" style="margin:0;">
          <input type="hidden" name="message_id" value="${r.message_id}">
          <input type="hidden" name="emoji" value="${r.emoji}">
          <button type="submit" style="margin:0; padding:4px 10px;">Remove</button>
        </form>
      </div>`).join('') : '<p>None configured.</p>'}
    <p style="opacity:.7; margin-top:10px;">New reaction roles must be created with <code>/reactionrole</code> or <code>/reactionrole-panel</code> in Discord — they post live messages the dashboard can't compose.</p>
  </div>

  <div class="card">
    <h2>Role menus</h2>
    ${roleMenus.length ? roleMenus.map(r => `
      <div style="padding:6px 0; border-bottom:1px solid #3a0000;">Message ID <code>${r.message_id}</code> in <code>${r.channel_id}</code> ${r.exclusive ? '(exclusive)' : ''}</div>`).join('') : '<p>None configured.</p>'}
    <p style="opacity:.7; margin-top:10px;">Created with <code>/rolemenu</code> in Discord.</p>
  </div>
`);

const statsPage = (guild, dailyStats, leaderboard, totalMessages) => {
  const maxMembers = Math.max(1, ...dailyStats.map(d => d.member_count));
  const bars = dailyStats.map(d => `
    <div style="display:inline-block; width:22px; margin-right:3px; text-align:center; vertical-align:bottom;">
      <div style="background:#c41e1e; height:${Math.max(4, (d.member_count / maxMembers) * 120)}px; border-radius:3px 3px 0 0;"></div>
      <div style="font-size:9px; color:#999; margin-top:2px;">${d.day.toISOString ? d.day.toISOString().slice(5, 10) : String(d.day).slice(5, 10)}</div>
    </div>`).join('');

  return layout('Stats', `
    <div class="top"><h1>${guild.name} — Stats</h1><a href="/dashboard/${guild.id}">← Settings</a></div>

    <div class="card">
      <h2>Member count (last 30 days)</h2>
      <div style="height:140px; display:flex; align-items:flex-end;">${bars || '<p>No data yet — check back tomorrow.</p>'}</div>
    </div>

    <div class="card">
      <h2>Activity</h2>
      <p>Total messages tracked: <b>${totalMessages}</b></p>
      <p>Current member count: <b>${guild.memberCount}</b></p>
    </div>

    <div class="card">
      <h2>Top levels</h2>
      ${leaderboard.length ? leaderboard.map((r, i) => `<div>#${i + 1} — User ID <code>${r.user_id}</code> — Level ${r.level} (${r.xp} XP)</div>`).join('') : '<p>No leveling data yet.</p>'}
    </div>
  `);
};

module.exports = { loginPage, guildListPage, settingsPage, statsPage };
