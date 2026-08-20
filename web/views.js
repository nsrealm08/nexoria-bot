const layout = (title, body, opts = {}) => {
  const { showNav = false, username = null } = opts;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Nexoria</title>
<style>
  :root {
    --bg: #0b0b0f;
    --bg-elevated: #15151c;
    --card: #17171f;
    --border: #26262f;
    --border-accent: #3d1518;
    --red: #e8383f;
    --red-dim: #b12a30;
    --red-glow: rgba(232, 56, 63, 0.15);
    --text: #f2f2f5;
    --text-dim: #9a9aa5;
    --text-faint: #6b6b76;
    --green: #3ecf6a;
    --radius: 14px;
  }
  * { box-sizing: border-box; }
  body {
    background: radial-gradient(ellipse 1200px 600px at 50% -10%, var(--red-glow), transparent), var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    margin: 0;
    min-height: 100vh;
    line-height: 1.5;
  }
  .wrap { max-width: 860px; margin: 0 auto; padding: 0 24px 60px; }
  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid var(--border);
    background: rgba(11,11,15,0.85); backdrop-filter: blur(8px);
    position: sticky; top: 0; z-index: 10;
  }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; letter-spacing: 0.3px; }
  .brand-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--red); box-shadow: 0 0 12px var(--red); }
  .nav-right { display: flex; align-items: center; gap: 14px; font-size: 14px; color: var(--text-dim); }
  .nav a { color: var(--text-dim); text-decoration: none; }
  .nav a:hover { color: var(--text); }

  h1 { font-size: 26px; font-weight: 800; margin: 32px 0 4px; letter-spacing: -0.3px; }
  h2 { font-size: 15px; font-weight: 700; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-dim); }
  .subtitle { color: var(--text-dim); margin: 0 0 28px; font-size: 14px; }
  .top-row { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .back-link { font-size: 13px; color: var(--text-dim); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
  .back-link:hover { color: var(--text); }

  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 24px; margin-bottom: 18px;
  }

  label { display: block; margin-top: 16px; font-size: 13px; font-weight: 600; color: var(--text-dim); }
  label:first-child { margin-top: 0; }
  input[type=text], textarea, select {
    width: 100%; padding: 11px 13px; margin-top: 6px; border-radius: 9px;
    border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text);
    font-size: 14px; font-family: inherit; transition: border-color .15s;
  }
  input[type=text]:focus, textarea:focus, select:focus {
    outline: none; border-color: var(--red-dim); box-shadow: 0 0 0 3px var(--red-glow);
  }
  input::placeholder { color: var(--text-faint); }
  textarea { resize: vertical; }

  .toggle-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; cursor: pointer; }
  .toggle-row input[type=checkbox] { appearance: none; width: 40px; height: 22px; border-radius: 20px; background: var(--bg-elevated); border: 1px solid var(--border); position: relative; cursor: pointer; flex-shrink: 0; transition: background .15s; }
  .toggle-row input[type=checkbox]::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: var(--text-faint); top: 2px; left: 2px; transition: all .15s; }
  .toggle-row input[type=checkbox]:checked { background: var(--red-dim); border-color: var(--red); }
  .toggle-row input[type=checkbox]:checked::after { background: #fff; left: 20px; }
  .toggle-row span { font-size: 14px; color: var(--text); font-weight: 500; }

  button {
    margin-top: 22px; background: linear-gradient(135deg, var(--red), var(--red-dim));
    color: #fff; border: none; padding: 11px 22px; border-radius: 9px; cursor: pointer;
    font-weight: 700; font-size: 14px; transition: filter .15s, transform .1s;
  }
  button:hover { filter: brightness(1.1); }
  button:active { transform: scale(0.98); }
  button.btn-sm { margin: 0; padding: 6px 14px; font-size: 13px; }
  button.btn-outline {
    background: transparent; border: 1px solid var(--border); color: var(--text-dim); font-weight: 600;
  }
  button.btn-outline:hover { border-color: var(--red-dim); color: var(--text); filter: none; }

  .row-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 0; border-bottom: 1px solid var(--border); gap: 12px;
  }
  .row-item:last-of-type { border-bottom: none; }
  .row-item code { background: var(--bg-elevated); padding: 2px 7px; border-radius: 5px; font-size: 12px; color: var(--text-dim); }
  .empty-note { color: var(--text-faint); font-size: 14px; margin: 4px 0; }
  .hint { color: var(--text-faint); font-size: 13px; margin-top: 12px; }

  .banner {
    display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 10px;
    margin-bottom: 20px; font-size: 14px; font-weight: 600;
  }
  .banner-success { background: rgba(62,207,106,0.12); border: 1px solid rgba(62,207,106,0.35); color: var(--green); }

  .guild-link {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    margin-bottom: 10px; text-decoration: none; color: var(--text); font-weight: 600; transition: border-color .15s, transform .1s;
  }
  .guild-link:hover { border-color: var(--red-dim); transform: translateX(2px); }
  .guild-link.disabled { opacity: 0.4; cursor: default; }
  .guild-link.disabled:hover { border-color: var(--border); transform: none; }
  .arrow { color: var(--text-faint); }

  .login-hero { text-align: center; padding: 80px 20px 40px; }
  .login-hero h1 { font-size: 32px; margin-bottom: 10px; }
  .login-hero p { color: var(--text-dim); max-width: 420px; margin: 0 auto 28px; }
  .login-hero button { padding: 13px 28px; font-size: 15px; }

  .bars { height: 140px; display: flex; align-items: flex-end; gap: 4px; }
  .bar-col { text-align: center; flex: 1; }
  .bar { background: linear-gradient(180deg, var(--red), var(--red-dim)); border-radius: 3px 3px 0 0; min-height: 4px; }
  .bar-label { font-size: 9px; color: var(--text-faint); margin-top: 4px; }

  form.inline-form { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-top: 16px; }
  form.inline-form > div { flex: 1; min-width: 140px; }
  form.inline-form label { margin-top: 0; }
</style>
</head>
<body>
  ${showNav ? `<div class="nav">
    <div class="brand"><span class="brand-dot"></span> Nexoria</div>
    <div class="nav-right">${username ? `<span>${username}</span> · <a href="/logout">Log out</a>` : ''}</div>
  </div>` : ''}
  <div class="wrap">${body}</div>
</body>
</html>`;
};

const loginPage = () => layout('Login', `
  <div class="login-hero">
    <div class="brand" style="justify-content:center; margin-bottom:24px; font-size:22px;"><span class="brand-dot"></span> Nexoria</div>
    <h1>Dashboard</h1>
    <p>Log in with Discord to configure Nexoria for any server where you have the Manage Server permission.</p>
    <a href="/login"><button>Log in with Discord</button></a>
  </div>
`);

const errorPage = (title, message) => layout('Error', `
  <div class="top-row"><h1>${title}</h1><a class="back-link" href="/dashboard">← Dashboard</a></div>
  <div class="card"><p style="color: var(--text-dim); margin: 0;">${message}</p></div>
`, { showNav: true });

const guildListPage = (user, guilds, botGuildIds) => layout('Servers', `
  <h1>Your servers</h1>
  <p class="subtitle">Pick a server to configure Nexoria for.</p>
  ${guilds.map(g => {
    const hasBot = botGuildIds.has(g.id);
    return hasBot
      ? `<a class="guild-link" href="/dashboard/${g.id}"><span>${g.name}</span><span class="arrow">→</span></a>`
      : `<div class="guild-link disabled"><span>${g.name}</span><span style="font-size:12px; font-weight:500;">Nexoria not in this server</span></div>`;
  }).join('')}
`, { showNav: true, username: user.username });

const settingsPage = (guild, settings, automod, antiraid, levelRewards = [], reactionRoles = [], roleMenus = [], saved = false) => layout('Settings', `
  <div class="top-row">
    <h1>${guild.name}</h1>
    <a class="back-link" href="/dashboard">← All servers</a>
  </div>
  <p class="subtitle"><a class="back-link" href="/dashboard/${guild.id}/stats" style="color:var(--red);">📊 View server stats →</a></p>

  ${saved ? `<div class="banner banner-success">✓ Settings saved.</div>` : ''}

  <form method="POST" action="/dashboard/${guild.id}">
    <div class="card">
      <h2>Welcome</h2>
      <label>Welcome channel ID</label>
      <input type="text" name="welcome_channel" value="${settings?.welcome_channel || ''}" placeholder="e.g. 123456789012345678">
      <label>Welcome message</label>
      <textarea name="welcome_msg" rows="2" placeholder="Welcome {user} to {server}!">${settings?.welcome_msg || ''}</textarea>
      <div class="hint">Use <code>{user}</code> and <code>{server}</code> as placeholders.</div>
    </div>

    <div class="card">
      <h2>Logging &amp; Leveling</h2>
      <label>Mod-log channel ID</label>
      <input type="text" name="log_channel" value="${settings?.log_channel || ''}">
      <label>Level-up announcement channel ID</label>
      <input type="text" name="level_channel" value="${settings?.level_channel || ''}">
      <label>Suggestions channel ID</label>
      <input type="text" name="suggestions_channel" value="${settings?.suggestions_channel || ''}">
    </div>

    <div class="card">
      <h2>Automod</h2>
      <label>Banned words</label>
      <input type="text" name="banned_words" value="${(automod?.banned_words || []).join(', ')}" placeholder="comma, separated, words">
      <label class="toggle-row"><input type="checkbox" name="block_invites" ${automod?.block_invites ? 'checked' : ''}><span>Block Discord invite links</span></label>
      <label>Mass mention limit <span style="font-weight:400;">(0 = off)</span></label>
      <input type="text" name="mass_mention_limit" value="${automod?.mass_mention_limit ?? 0}">
      <label>Spam limit — messages per 5s <span style="font-weight:400;">(0 = off)</span></label>
      <input type="text" name="spam_limit" value="${automod?.spam_limit ?? 0}">
    </div>

    <div class="card">
      <h2>Anti-raid</h2>
      <label class="toggle-row"><input type="checkbox" name="antiraid_enabled" ${antiraid?.enabled ? 'checked' : ''}><span>Enabled</span></label>
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
      <div class="row-item">
        <span>Level <b>${r.level}</b> → Role <code>${r.role_id}</code></span>
        <form method="POST" action="/dashboard/${guild.id}/level-rewards/delete" style="margin:0;">
          <input type="hidden" name="level" value="${r.level}">
          <button type="submit" class="btn-sm btn-outline">Remove</button>
        </form>
      </div>`).join('') : '<p class="empty-note">None configured.</p>'}
    <form method="POST" action="/dashboard/${guild.id}/level-rewards" class="inline-form">
      <div><label>Level</label><input type="text" name="level" placeholder="5" required></div>
      <div><label>Role ID</label><input type="text" name="role_id" placeholder="Right-click role → Copy ID" required></div>
      <button type="submit" class="btn-sm">Add</button>
    </form>
  </div>

  <div class="card">
    <h2>Reaction roles</h2>
    ${reactionRoles.length ? reactionRoles.map(r => `
      <div class="row-item">
        <span>${r.emoji} → Role <code>${r.role_id}</code>${r.group_name ? ` <span style="color:var(--text-faint);">(${r.group_name})</span>` : ''}</span>
        <form method="POST" action="/dashboard/${guild.id}/reaction-roles/delete" style="margin:0;">
          <input type="hidden" name="message_id" value="${r.message_id}">
          <input type="hidden" name="emoji" value="${r.emoji}">
          <button type="submit" class="btn-sm btn-outline">Remove</button>
        </form>
      </div>`).join('') : '<p class="empty-note">None configured.</p>'}
    <p class="hint">New reaction roles need <code>/reactionrole</code> or <code>/reactionrole-panel</code> in Discord — they post live messages the dashboard can't compose.</p>
  </div>

  <div class="card">
    <h2>Role menus</h2>
    ${roleMenus.length ? roleMenus.map(r => `
      <div class="row-item"><span>Message <code>${r.message_id}</code> in <code>${r.channel_id}</code>${r.exclusive ? ' <span style="color:var(--text-faint);">(exclusive)</span>' : ''}</span></div>`).join('') : '<p class="empty-note">None configured.</p>'}
    <p class="hint">Created with <code>/rolemenu</code> in Discord.</p>
  </div>
`, { showNav: true });

const statsPage = (guild, dailyStats, leaderboard, totalMessages) => {
  const maxMembers = Math.max(1, ...dailyStats.map(d => d.member_count));
  const bars = dailyStats.map(d => {
    const dayLabel = d.day.toISOString ? d.day.toISOString().slice(5, 10) : String(d.day).slice(5, 10);
    return `<div class="bar-col">
      <div class="bar" style="height:${Math.max(4, (d.member_count / maxMembers) * 120)}px;"></div>
      <div class="bar-label">${dayLabel}</div>
    </div>`;
  }).join('');

  return layout('Stats', `
    <div class="top-row">
      <h1>${guild.name}</h1>
      <a class="back-link" href="/dashboard/${guild.id}">← Settings</a>
    </div>
    <p class="subtitle">Server stats</p>

    <div class="card">
      <h2>Member count — last 30 days</h2>
      ${dailyStats.length ? `<div class="bars">${bars}</div>` : '<p class="empty-note">No data yet — check back tomorrow.</p>'}
    </div>

    <div class="card">
      <h2>Activity</h2>
      <div class="row-item"><span>Total messages tracked</span><b>${totalMessages}</b></div>
      <div class="row-item"><span>Current member count</span><b>${guild.memberCount}</b></div>
    </div>

    <div class="card">
      <h2>Top levels</h2>
      ${leaderboard.length ? leaderboard.map((r, i) => `
        <div class="row-item"><span>#${i + 1} — User <code>${r.user_id}</code></span><b>Level ${r.level} · ${r.xp} XP</b></div>`).join('') : '<p class="empty-note">No leveling data yet.</p>'}
    </div>
  `, { showNav: true });
};

module.exports = { loginPage, guildListPage, settingsPage, statsPage, errorPage };
