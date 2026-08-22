const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;

const layout = (title, body, opts = {}) => {
  const { showNav = false, username = null, sidebar = null } = opts;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Nexoria</title>
${FONT_LINK}
<style>
  :root {
    --bg: #08080b;
    --bg-elevated: #131318;
    --card: #15151b;
    --card-hover: #1a1a22;
    --border: #232329;
    --red: #ef4148;
    --red-dim: #a8262c;
    --red-glow: rgba(239, 65, 72, 0.16);
    --text: #f5f5f7;
    --text-dim: #9a9aa6;
    --text-faint: #5c5c66;
    --green: #34d474;
    --radius: 16px;
    --radius-sm: 10px;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    background:
      radial-gradient(ellipse 900px 500px at 15% 0%, rgba(239,65,72,0.10), transparent 60%),
      radial-gradient(ellipse 700px 500px at 100% 20%, rgba(239,65,72,0.06), transparent 60%),
      var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    margin: 0;
    min-height: 100vh;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--red-glow); color: #fff; }

  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 28px; border-bottom: 1px solid var(--border);
    background: rgba(8,8,11,0.75); backdrop-filter: blur(14px);
    position: sticky; top: 0; z-index: 20;
  }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 18px; letter-spacing: -0.2px; }
  .brand-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--red); box-shadow: 0 0 14px 2px var(--red); }
  .nav-right { display: flex; align-items: center; gap: 16px; font-size: 13.5px; color: var(--text-dim); }
  .nav a { color: var(--text-dim); text-decoration: none; transition: color .15s; }
  .nav a:hover { color: var(--text); }
  .nav-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--red), var(--red-dim)); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; vertical-align: middle; margin-right: 6px; }

  .shell { max-width: 1080px; margin: 0 auto; padding: 0 28px 80px; }
  .layout-grid { display: grid; grid-template-columns: 1fr; gap: 28px; }
  @media (min-width: 900px) {
    .layout-grid.has-sidebar { grid-template-columns: 200px 1fr; align-items: start; }
  }

  .sidebar { position: sticky; top: 90px; display: none; }
  @media (min-width: 900px) { .sidebar { display: block; } }
  .sidebar a {
    display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 9px;
    color: var(--text-dim); text-decoration: none; font-size: 13.5px; font-weight: 600; margin-bottom: 2px;
    transition: background .12s, color .12s;
  }
  .sidebar a:hover { background: var(--card); color: var(--text); }

  h1 { font-size: 28px; font-weight: 900; margin: 36px 0 4px; letter-spacing: -0.6px; }
  h1.gradient { background: linear-gradient(135deg, #fff, #cfcfd6); -webkit-background-clip: text; background-clip: text; color: transparent; }
  h2 { font-size: 14.5px; font-weight: 700; margin: 0 0 18px; display: flex; align-items: center; gap: 10px; letter-spacing: 0.2px; }
  .subtitle { color: var(--text-dim); margin: 0 0 30px; font-size: 14px; }
  .top-row { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .back-link { font-size: 13px; color: var(--text-dim); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: color .12s; }
  .back-link:hover { color: var(--text); }

  .badge {
    width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0; background: var(--red-glow); border: 1px solid rgba(239,65,72,0.25);
  }

  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 26px; margin-bottom: 20px; scroll-margin-top: 90px;
    animation: fadeUp .35s ease both;
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  label { display: block; margin-top: 17px; font-size: 12.5px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.4px; }
  label:first-of-type { margin-top: 0; }
  input[type=text], textarea, select {
    width: 100%; padding: 11px 13px; margin-top: 7px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text);
    font-size: 14px; font-family: inherit; transition: border-color .15s, box-shadow .15s;
  }
  input[type=text]:focus, textarea:focus, select:focus {
    outline: none; border-color: var(--red-dim); box-shadow: 0 0 0 3px var(--red-glow);
  }
  input::placeholder { color: var(--text-faint); }
  textarea { resize: vertical; }

  .toggle-row { display: flex; align-items: center; gap: 11px; margin-top: 17px; cursor: pointer; }
  .toggle-row input[type=checkbox] { appearance: none; width: 40px; height: 23px; border-radius: 20px; background: var(--bg-elevated); border: 1px solid var(--border); position: relative; cursor: pointer; flex-shrink: 0; transition: background .15s; }
  .toggle-row input[type=checkbox]::after { content: ''; position: absolute; width: 17px; height: 17px; border-radius: 50%; background: var(--text-faint); top: 2px; left: 2px; transition: all .15s; }
  .toggle-row input[type=checkbox]:checked { background: var(--red-dim); border-color: var(--red); }
  .toggle-row input[type=checkbox]:checked::after { background: #fff; left: 19px; }
  .toggle-row span { font-size: 14px; color: var(--text); font-weight: 500; text-transform: none; letter-spacing: 0; }

  button {
    margin-top: 24px; background: linear-gradient(135deg, var(--red), var(--red-dim));
    color: #fff; border: none; padding: 12px 24px; border-radius: var(--radius-sm); cursor: pointer;
    font-weight: 700; font-size: 14px; transition: filter .15s, transform .1s, box-shadow .15s;
    box-shadow: 0 4px 14px rgba(239,65,72,0.18);
  }
  button:hover { filter: brightness(1.12); box-shadow: 0 6px 18px rgba(239,65,72,0.28); }
  button:active { transform: scale(0.97); }
  button.btn-sm { margin: 0; padding: 7px 15px; font-size: 13px; box-shadow: none; }
  button.btn-outline {
    background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-dim); font-weight: 600; box-shadow: none;
  }
  button.btn-outline:hover { border-color: var(--red-dim); color: var(--text); filter: none; }

  .row-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 13px 0; border-bottom: 1px solid var(--border); gap: 12px; font-size: 14px;
  }
  .row-item:last-of-type { border-bottom: none; }
  .row-item code { background: var(--bg-elevated); padding: 2px 8px; border-radius: 6px; font-size: 12px; color: var(--text-dim); border: 1px solid var(--border); }
  .empty-note { color: var(--text-faint); font-size: 14px; margin: 4px 0; }
  .hint { color: var(--text-faint); font-size: 12.5px; margin-top: 14px; line-height: 1.6; }

  .banner {
    display: flex; align-items: center; gap: 10px; padding: 13px 18px; border-radius: var(--radius-sm);
    margin-bottom: 22px; font-size: 14px; font-weight: 600; animation: fadeUp .3s ease both;
  }
  .banner-success { background: rgba(52,212,116,0.10); border: 1px solid rgba(52,212,116,0.3); color: var(--green); }

  .guild-link {
    display: flex; align-items: center; gap: 14px;
    padding: 15px 18px; background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    margin-bottom: 10px; text-decoration: none; color: var(--text); font-weight: 600; transition: border-color .15s, transform .12s, background .15s;
  }
  .guild-link:hover { border-color: var(--red-dim); transform: translateX(3px); background: var(--card-hover); }
  .guild-link.disabled { opacity: 0.42; cursor: default; }
  .guild-link.disabled:hover { border-color: var(--border); transform: none; background: var(--card); }
  .guild-link .name { flex: 1; }
  .guild-link .arrow { color: var(--text-faint); transition: transform .15s; }
  .guild-link:hover .arrow { transform: translateX(3px); color: var(--red); }
  .avatar-img { width: 38px; height: 38px; border-radius: 11px; object-fit: cover; flex-shrink: 0; }
  .avatar-fallback {
    width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, var(--red), var(--red-dim)); font-weight: 800; font-size: 15px; color: #fff;
  }

  .login-hero { text-align: center; padding: 110px 20px 40px; }
  .login-hero .logo-badge { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, var(--red), var(--red-dim)); margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; box-shadow: 0 8px 30px rgba(239,65,72,0.3); }
  .login-hero h1 { font-size: 34px; margin-bottom: 12px; }
  .login-hero p { color: var(--text-dim); max-width: 400px; margin: 0 auto 30px; font-size: 15px; }
  .login-hero button { padding: 14px 30px; font-size: 15px; }

  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat-tile { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; animation: fadeUp .35s ease both; }
  .stat-tile .stat-label { font-size: 12px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; margin-bottom: 6px; }
  .stat-tile .stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }

  form.inline-form { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-top: 18px; }
  form.inline-form > div { flex: 1; min-width: 140px; }
  form.inline-form label { margin-top: 0; }

  .rank-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .rank-row:last-of-type { border-bottom: none; }
  .rank-num { width: 26px; height: 26px; border-radius: 7px; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: var(--text-dim); flex-shrink: 0; }
  .rank-num.top { background: linear-gradient(135deg, var(--red), var(--red-dim)); color: #fff; }
</style>
</head>
<body>
  ${showNav ? `<div class="nav">
    <a href="/dashboard" style="text-decoration:none;"><div class="brand" style="color:var(--text);"><span class="brand-dot"></span> Nexoria</div></a>
    <div class="nav-right">${username ? `<span><span class="nav-avatar">${username[0].toUpperCase()}</span>${username}</span> · <a href="/logout">Log out</a>` : ''}</div>
  </div>` : ''}
  <div class="shell">
    ${sidebar ? `<div class="layout-grid has-sidebar"><div class="sidebar">${sidebar}</div><div>${body}</div></div>` : body}
  </div>
</body>
</html>`;
};

const loginPage = () => layout('Login', `
  <div class="login-hero">
    <div class="logo-badge">N</div>
    <h1>Nexoria Dashboard</h1>
    <p>Log in with Discord to configure Nexoria for any server where you have the Manage Server permission.</p>
    <a href="/login"><button>Log in with Discord</button></a>
  </div>
`);

const errorPage = (title, message, link) => layout('Error', `
  <div class="top-row"><h1>${title}</h1><a class="back-link" href="${link?.href || '/dashboard'}">${link?.text || '← Dashboard'}</a></div>
  <div class="card"><p style="color: var(--text-dim); margin: 0;">${message}</p></div>
`, { showNav: true });

function guildAvatar(guild) {
  const url = guild.iconURL ? (typeof guild.iconURL === 'function' ? guild.iconURL({ size: 64 }) : guild.iconURL) : null;
  if (url) return `<img class="avatar-img" src="${url}" alt="">`;
  return `<div class="avatar-fallback">${(guild.name || '?')[0].toUpperCase()}</div>`;
}

const guildListPage = (user, guilds, botGuildIds) => layout('Servers', `
  <h1 class="gradient">Your servers</h1>
  <p class="subtitle">Pick a server to configure Nexoria for.</p>
  ${guilds.map(g => {
    const hasBot = botGuildIds.has(g.id);
    return hasBot
      ? `<a class="guild-link" href="/dashboard/${g.id}">${guildAvatar(g)}<span class="name">${g.name}</span><span class="arrow">→</span></a>`
      : `<div class="guild-link disabled">${guildAvatar(g)}<span class="name">${g.name}</span><span style="font-size:12px; font-weight:500;">Not in this server</span></div>`;
  }).join('')}
`, { showNav: true, username: user.username });

const SIDEBAR = (guild) => `
  <a href="#welcome">👋 Welcome</a>
  <a href="#logging">📋 Logging</a>
  <a href="#automod">🛡️ Automod</a>
  <a href="#antiraid">⚠️ Anti-raid</a>
  <a href="#rewards">⭐ Level rewards</a>
  <a href="#reactionroles">😊 Reaction roles</a>
  <a href="#rolemenus">📑 Role menus</a>
  <a href="/dashboard/${guild.id}/stats" style="color:var(--red);">📊 Stats →</a>
`;

const settingsPage = (guild, settings, automod, antiraid, levelRewards = [], reactionRoles = [], roleMenus = [], saved = false) => layout('Settings', `
  <div class="top-row">
    <h1 class="gradient" style="display:flex; align-items:center; gap:12px;">${guildAvatar(guild)}${guild.name}</h1>
    <a class="back-link" href="/dashboard">← All servers</a>
  </div>
  <p class="subtitle">Server configuration</p>

  ${saved ? `<div class="banner banner-success">✓ Settings saved</div>` : ''}

  <form method="POST" action="/dashboard/${guild.id}">
    <div class="card" id="welcome">
      <h2><span class="badge">👋</span> Welcome</h2>
      <label>Welcome channel ID</label>
      <input type="text" name="welcome_channel" value="${settings?.welcome_channel || ''}" placeholder="e.g. 123456789012345678">
      <label>Welcome message</label>
      <textarea name="welcome_msg" rows="2" placeholder="Welcome {user} to {server}!">${settings?.welcome_msg || ''}</textarea>
      <div class="hint">Use <code>{user}</code> and <code>{server}</code> as placeholders.</div>
    </div>

    <div class="card" id="logging">
      <h2><span class="badge">📋</span> Logging &amp; Leveling</h2>
      <label>Mod-log channel ID</label>
      <input type="text" name="log_channel" value="${settings?.log_channel || ''}">
      <label>Level-up announcement channel ID</label>
      <input type="text" name="level_channel" value="${settings?.level_channel || ''}">
      <label>Suggestions channel ID</label>
      <input type="text" name="suggestions_channel" value="${settings?.suggestions_channel || ''}">
    </div>

    <div class="card" id="automod">
      <h2><span class="badge">🛡️</span> Automod</h2>
      <label>Banned words</label>
      <input type="text" name="banned_words" value="${(automod?.banned_words || []).join(', ')}" placeholder="comma, separated, words">
      <label class="toggle-row"><input type="checkbox" name="block_invites" ${automod?.block_invites ? 'checked' : ''}><span>Block Discord invite links</span></label>
      <label>Mass mention limit <span style="text-transform:none; font-weight:400;">(0 = off)</span></label>
      <input type="text" name="mass_mention_limit" value="${automod?.mass_mention_limit ?? 0}">
      <label>Spam limit — messages per 5s <span style="text-transform:none; font-weight:400;">(0 = off)</span></label>
      <input type="text" name="spam_limit" value="${automod?.spam_limit ?? 0}">
      <label class="toggle-row"><input type="checkbox" name="ai_moderation" ${automod?.ai_moderation ? 'checked' : ''}><span>AI-assisted moderation (auto-flag toxic messages)</span></label>
      <label>AI provider</label>
      <select name="ai_provider">
        <option value="groq" ${(!automod?.ai_provider || automod.ai_provider === 'groq') ? 'selected' : ''}>Groq</option>
        <option value="gemini" ${automod?.ai_provider === 'gemini' ? 'selected' : ''}>Gemini</option>
      </select>
      <div class="hint">Requires <code>GROQ_API_KEY</code> or <code>GEMINI_API_KEY</code> set in Render's environment — this calls an external AI API per message, so only enable it if that's acceptable for your traffic/cost.</div>
    </div>

    <div class="card" id="antiraid">
      <h2><span class="badge">⚠️</span> Anti-raid</h2>
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

  <div class="card" id="rewards">
    <h2><span class="badge">⭐</span> Level rewards</h2>
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

  <div class="card" id="reactionroles">
    <h2><span class="badge">😊</span> Reaction roles</h2>
    ${reactionRoles.length ? reactionRoles.map(r => `
      <div class="row-item">
        <span>${r.emoji} → Role <code>${r.role_id}</code>${r.group_name ? ` <span style="color:var(--text-faint);">(${r.group_name})</span>` : ''}</span>
        <form method="POST" action="/dashboard/${guild.id}/reaction-roles/delete" style="margin:0;">
          <input type="hidden" name="message_id" value="${r.message_id}">
          <input type="hidden" name="emoji" value="${r.emoji}">
          <button type="submit" class="btn-sm btn-outline">Remove</button>
        </form>
      </div>`).join('') : '<p class="empty-note">None configured.</p>'}

    <h2 style="margin-top:24px; font-size:12.5px; color:var(--text-faint);">Create a new panel</h2>
    <form method="POST" action="/dashboard/${guild.id}/reaction-roles/panel">
      <label>Channel ID</label>
      <input type="text" name="channel_id" placeholder="Right-click channel → Copy ID" required>
      <label>Title</label>
      <input type="text" name="title" placeholder="Pick your roles">
      <label>Description</label>
      <textarea name="description" rows="2" placeholder="React to get a role!"></textarea>
      ${[1, 2, 3].map(i => `
      <div style="display:flex; gap:10px; margin-top:14px;">
        <div style="flex:1;"><label>Emoji ${i}</label><input type="text" name="emoji${i}" placeholder="🎮"></div>
        <div style="flex:2;"><label>Role ${i} ID</label><input type="text" name="role${i}" placeholder="Role ID"></div>
      </div>`).join('')}
      <label class="toggle-row"><input type="checkbox" name="exclusive"><span>Exclusive (pick only one)</span></label>
      <button type="submit" class="btn-sm" style="margin-top:18px;">Create panel</button>
    </form>

    <h2 style="margin-top:28px; font-size:12.5px; color:var(--text-faint);">Attach to an existing message</h2>
    <form method="POST" action="/dashboard/${guild.id}/reaction-roles/attach" class="inline-form">
      <div><label>Channel ID</label><input type="text" name="channel_id" required></div>
      <div><label>Message ID</label><input type="text" name="message_id" required></div>
      <div><label>Emoji</label><input type="text" name="emoji" required></div>
      <div><label>Role ID</label><input type="text" name="role_id" required></div>
      <button type="submit" class="btn-sm">Attach</button>
    </form>
  </div>

  <div class="card" id="rolemenus">
    <h2><span class="badge">📑</span> Role menus</h2>
    ${roleMenus.length ? roleMenus.map(r => `
      <div class="row-item">
        <span>Message <code>${r.message_id}</code> in <code>${r.channel_id}</code>${r.exclusive ? ' <span style="color:var(--text-faint);">(exclusive)</span>' : ''}</span>
        <form method="POST" action="/dashboard/${guild.id}/role-menus/delete" style="margin:0;">
          <input type="hidden" name="message_id" value="${r.message_id}">
          <button type="submit" class="btn-sm btn-outline">Remove</button>
        </form>
      </div>`).join('') : '<p class="empty-note">None configured.</p>'}

    <h2 style="margin-top:24px; font-size:12.5px; color:var(--text-faint);">Create a new role menu</h2>
    <form method="POST" action="/dashboard/${guild.id}/role-menus">
      <label>Channel ID</label>
      <input type="text" name="channel_id" placeholder="Right-click channel → Copy ID" required>
      <label>Title</label>
      <input type="text" name="title" placeholder="Choose your role(s)">
      <label>Description</label>
      <textarea name="description" rows="2"></textarea>
      ${[1, 2, 3].map(i => `
      <div style="display:flex; gap:10px; margin-top:14px;">
        <div style="flex:1;"><label>Role ${i} ID</label><input type="text" name="role${i}" placeholder="Role ID"></div>
        <div style="flex:1;"><label>Label ${i}</label><input type="text" name="label${i}" placeholder="Display name"></div>
      </div>`).join('')}
      <label class="toggle-row"><input type="checkbox" name="exclusive"><span>Exclusive (pick only one)</span></label>
      <button type="submit" class="btn-sm" style="margin-top:18px;">Create menu</button>
    </form>
    <p class="hint">Need more than 3 options? Use <code>/reactionrole-panel</code> or <code>/rolemenu</code> in Discord for up to 5.</p>
  </div>
`, { showNav: true, sidebar: SIDEBAR(guild) });

function areaChart(data, opts) {
  const width = (opts && opts.width) || 640;
  const height = (opts && opts.height) || 160;
  if (!data.length) return '';
  const max = Math.max(1, ...data.map(d => d.member_count));
  const min = Math.min(...data.map(d => d.member_count));
  const range = Math.max(1, max - min);
  const padY = 12;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = padY + (height - padY * 2) * (1 - (d.member_count - min) / range);
    return [x, y];
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${height} L0,${height} Z`;

  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const labels = data.map((d, i) => {
    if (i % labelEvery !== 0 && i !== data.length - 1) return '';
    const day = d.day.toISOString ? d.day.toISOString().slice(5, 10) : String(d.day).slice(5, 10);
    return `<text x="${points[i][0].toFixed(1)}" y="${height + 16}" font-size="9" fill="#5c5c66" text-anchor="middle">${day}</text>`;
  }).join('');

  const dots = points.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="#ef4148" />`).join('');

  return `<svg viewBox="0 0 ${width} ${height + 24}" style="width:100%; height:auto; overflow:visible;">
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4148" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#ef4148" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#areaFill)" />
    <path d="${linePath}" fill="none" stroke="#ef4148" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    ${dots}
    ${labels}
  </svg>`;
}

const statsPage = (guild, dailyStats, leaderboard, totalMessages) => {
  const currentMembers = dailyStats.length ? dailyStats[dailyStats.length - 1].member_count : guild.memberCount;
  const firstMembers = dailyStats.length ? dailyStats[0].member_count : currentMembers;
  const delta = currentMembers - firstMembers;
  const deltaText = delta === 0 ? '±0' : delta > 0 ? `+${delta}` : `${delta}`;

  return layout('Stats', `
    <div class="top-row">
      <h1 class="gradient" style="display:flex; align-items:center; gap:12px;">${guildAvatar(guild)}${guild.name}</h1>
      <a class="back-link" href="/dashboard/${guild.id}">← Settings</a>
    </div>
    <p class="subtitle">Server stats</p>

    <div class="stat-grid">
      <div class="stat-tile"><div class="stat-label">Members</div><div class="stat-value">${guild.memberCount}</div></div>
      <div class="stat-tile"><div class="stat-label">30-day change</div><div class="stat-value">${deltaText}</div></div>
      <div class="stat-tile"><div class="stat-label">Messages tracked</div><div class="stat-value">${totalMessages}</div></div>
    </div>

    <div class="card">
      <h2><span class="badge">📈</span> Member growth — last 30 days</h2>
      ${dailyStats.length ? areaChart(dailyStats) : '<p class="empty-note">No data yet — check back tomorrow.</p>'}
    </div>

    <div class="card">
      <h2><span class="badge">🏆</span> Top levels</h2>
      ${leaderboard.length ? leaderboard.map((r, i) => `
        <div class="rank-row">
          <div class="rank-num${i === 0 ? ' top' : ''}">${i + 1}</div>
          <span style="flex:1;">User <code>${r.user_id}</code></span>
          <b>Lvl ${r.level} · ${r.xp} XP</b>
        </div>`).join('') : '<p class="empty-note">No leveling data yet.</p>'}
    </div>
  `, { showNav: true });
};

module.exports = { loginPage, guildListPage, settingsPage, statsPage, errorPage };
