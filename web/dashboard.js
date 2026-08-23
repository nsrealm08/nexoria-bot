const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const crypto = require('crypto');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');
const { getAuthUrl, exchangeCode, fetchUser, fetchManageableGuilds } = require('./oauth');
const { getLockUntil, setLock, formatWait } = require('./oauthLock');
const { loginPage, guildListPage, settingsPage, statsPage, errorPage } = require('./views');

// Defends Discord's OAuth token-endpoint quota from being burned by bots/
// scanners probing the public /callback URL. Keyed per-IP, in-memory (fine
// for a single Render instance). Not a general API rate limiter — just a
// tripwire around the two routes that talk to Discord's OAuth endpoints.
const oauthAttempts = new Map(); // ip -> timestamps[]
function tooManyOauthAttempts(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const timestamps = (oauthAttempts.get(ip) || []).filter(t => now - t < windowMs);
  timestamps.push(now);
  oauthAttempts.set(ip, timestamps);
  return timestamps.length > 8;
}

function buildDashboard(client) {
  const router = express.Router();

  // Express 4 does NOT catch rejected promises thrown inside async route
  // handlers. An unhandled rejection here (e.g. a slow/failed Discord API
  // call) used to leave the request open forever with no response — that's
  // what caused "infinite loading" on save. This wrapper guarantees a
  // response every time by forwarding failures to the error handler below.
  const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

  router.use(session({
    store: new pgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'nexoria-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
  }));
  router.use(express.urlencoded({ extended: true }));

  function requireAuth(req, res, next) {
    if (!req.session.accessToken) return res.redirect('/');
    next();
  }

  // Discord rate-limits GET /users/@me/guilds aggressively. verifyAccess()
  // used to call it on every single request (settings load, stats load,
  // every save) — clicking around the dashboard for a few seconds was
  // enough to trigger a 429. Cache it in the session for 2 minutes instead.
  async function getCachedGuilds(req) {
    const cache = req.session.guildsCache;
    const fresh = cache && Date.now() - cache.fetchedAt < 120000;
    if (fresh) return cache.guilds;
    const guilds = await fetchManageableGuilds(req.session.accessToken);
    req.session.guildsCache = { guilds, fetchedAt: Date.now() };
    return guilds;
  }

  async function verifyAccess(req, guildId) {
    const guilds = await getCachedGuilds(req);
    const match = guilds.find(g => g.id === guildId);
    const botGuild = client.guilds.cache.get(guildId);
    return match && botGuild ? botGuild : null;
  }

  router.get('/', wrap(async (req, res) => {
    if (req.session.accessToken) return res.redirect('/dashboard');
    const lockedUntil = await getLockUntil();
    if (lockedUntil) {
      const w = formatWait(lockedUntil);
      return res.status(429).send(errorPage('Login temporarily unavailable',
        `Discord's OAuth login is cooling down — try again after ~${w.clockTime} UTC (about ${w.minutes}m ${w.remSeconds}s). Refreshing or retrying before then won't help and may extend it further.`));
    }
    res.send(loginPage());
  }));

  router.get('/login', wrap(async (req, res) => {
    const lockedUntil = await getLockUntil();
    if (lockedUntil) {
      const w = formatWait(lockedUntil);
      return res.status(429).send(errorPage('Still rate-limited',
        `Discord's OAuth login is still cooling down from an earlier rate limit — try again after ~${w.clockTime} UTC (about ${w.minutes}m ${w.remSeconds}s). This persists across redeploys, so retrying now would only extend it.`));
    }
    if (tooManyOauthAttempts(req.ip)) {
      return res.status(429).send(errorPage('Slow down', 'Too many login attempts from this connection recently — wait a few minutes and try again.'));
    }
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    res.redirect(getAuthUrl(state));
  }));

  router.get('/callback', wrap(async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.redirect('/');

    const expectedState = req.session.oauthState;
    req.session.oauthState = null; // single-use
    if (!state || !expectedState || state !== expectedState) {
      return res.redirect(`/login-error?message=${encodeURIComponent('This login link is invalid or expired. Start over from the login page.')}`);
    }

    const lockedUntil = await getLockUntil();
    if (lockedUntil) {
      const w = formatWait(lockedUntil);
      return res.status(429).send(errorPage('Still rate-limited',
        `Discord's OAuth login is still cooling down — try again after ~${w.clockTime} UTC (about ${w.minutes}m ${w.remSeconds}s).`));
    }
    if (tooManyOauthAttempts(req.ip)) {
      return res.status(429).send(errorPage('Slow down', 'Too many login attempts from this connection recently — wait a few minutes and try again.'));
    }

    try {
      const token = await exchangeCode(code);
      req.session.accessToken = token.access_token;
      res.redirect('/dashboard');
    } catch (err) {
      console.error('OAuth callback error:', err);
      // Persist to the DB (not just in-memory) so this survives a redeploy —
      // that gap was exactly what let a request slip through Discord's
      // still-active rate limit and extend it further.
      const retryMatch = err.message.match(/wait (\d+) seconds/);
      if (retryMatch) await setLock(retryMatch[1]).catch(() => {});
      // Redirect (don't render here) so the URL no longer carries the spent
      // ?code= — otherwise hitting refresh resends the same dead code and
      // immediately fails again, compounding Discord's rate limit.
      res.redirect(`/login-error?message=${encodeURIComponent(err.message || 'Login failed.')}`);
    }
  }));

  router.get('/login-error', (req, res) => {
    res.status(400).send(errorPage(
      'Login failed',
      req.query.message || 'Something went wrong logging in.',
      { href: '/login', text: '← Try logging in again' }
    ));
  });

  router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  });

  router.get('/dashboard', requireAuth, wrap(async (req, res) => {
    const user = await fetchUser(req.session.accessToken);
    const guilds = await getCachedGuilds(req);
    const botGuildIds = new Set(client.guilds.cache.map(g => g.id));
    res.send(guildListPage(user, guilds, botGuildIds));
  }));

  router.get('/dashboard/:guildId', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server, or Nexoria isn't in it."));

    const [{ rows: s }, { rows: a }, { rows: r }, { rows: lr }, { rows: rr }, { rows: rm }] = await Promise.all([
      pool.query('SELECT * FROM settings WHERE guild_id=$1', [guild.id]),
      pool.query('SELECT * FROM automod_settings WHERE guild_id=$1', [guild.id]),
      pool.query('SELECT * FROM antiraid_settings WHERE guild_id=$1', [guild.id]),
      pool.query('SELECT * FROM level_rewards WHERE guild_id=$1 ORDER BY level ASC', [guild.id]),
      pool.query('SELECT * FROM reaction_roles WHERE guild_id=$1', [guild.id]),
      pool.query('SELECT * FROM role_menus WHERE guild_id=$1', [guild.id])
    ]);
    res.send(settingsPage(guild, s[0], a[0], r[0], lr, rr, rm, req.query.saved === '1'));
  }));

  router.get('/dashboard/:guildId/stats', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server, or Nexoria isn't in it."));

    const [{ rows: daily }, { rows: leaderboard }, { rows: totals }] = await Promise.all([
      pool.query('SELECT * FROM guild_daily_stats WHERE guild_id=$1 ORDER BY day ASC LIMIT 30', [guild.id]),
      pool.query('SELECT * FROM levels WHERE guild_id=$1 ORDER BY level DESC, xp DESC LIMIT 5', [guild.id]),
      pool.query('SELECT COALESCE(SUM(message_count),0) AS total FROM guild_daily_stats WHERE guild_id=$1', [guild.id])
    ]);
    res.send(statsPage(guild, daily, leaderboard, totals[0].total));
  }));

  router.post('/dashboard/:guildId/level-rewards', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));
    const { level, role_id } = req.body;
    if (level && role_id) {
      await pool.query(
        `INSERT INTO level_rewards (guild_id, level, role_id) VALUES ($1,$2,$3)
         ON CONFLICT (guild_id, level) DO UPDATE SET role_id=excluded.role_id`,
        [guild.id, Number(level), role_id.trim()]);
    }
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  router.post('/dashboard/:guildId/level-rewards/delete', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));
    await pool.query('DELETE FROM level_rewards WHERE guild_id=$1 AND level=$2', [guild.id, Number(req.body.level)]);
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  router.post('/dashboard/:guildId/reaction-roles/delete', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));
    await pool.query('DELETE FROM reaction_roles WHERE guild_id=$1 AND message_id=$2 AND emoji=$3',
      [guild.id, req.body.message_id, req.body.emoji]);
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  // Creates a brand-new reaction-role panel message (embed + reactions),
  // same as /reactionrole-panel, but triggered from the dashboard form.
  router.post('/dashboard/:guildId/reaction-roles/panel', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));

    const b = req.body;
    const channel = guild.channels.cache.get((b.channel_id || '').trim());
    if (!channel) return res.status(400).send(errorPage('Channel not found', 'Double-check the channel ID and that Nexoria can see that channel.'));

    const me = guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
      return res.status(400).send(errorPage('Missing permission', 'Nexoria can\'t send messages in that channel — check its permissions there.'));
    }

    const pairs = [1, 2, 3]
      .map(i => ({ emoji: (b[`emoji${i}`] || '').trim(), role: (b[`role${i}`] || '').trim() }))
      .filter(p => p.emoji && p.role);
    if (!pairs.length) return res.status(400).send(errorPage('Nothing to create', 'Provide at least one emoji + role ID pair.'));

    const groupName = `panel-${Date.now()}`;
    const exclusive = !!b.exclusive;
    const lines = pairs.map(p => `${p.emoji} — <@&${p.role}>`).join('\n');
    const embed = new EmbedBuilder().setColor('Red').setTitle(b.title || 'Choose a role').setDescription(`${b.description || ''}\n\n${lines}`);

    let message;
    try {
      message = await channel.send({ embeds: [embed] });
      for (const p of pairs) await message.react(p.emoji);
    } catch (err) {
      return res.status(400).send(errorPage('Couldn\'t post panel', err.message || 'Discord rejected the request — check the emoji format and role IDs.'));
    }

    for (const p of pairs) {
      await pool.query(
        `INSERT INTO reaction_roles (message_id, emoji, role_id, guild_id, group_name, exclusive)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (message_id, emoji) DO NOTHING`,
        [message.id, p.emoji, p.role, guild.id, groupName, exclusive]);
    }
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  // Attaches a single reaction role to a message that already exists.
  router.post('/dashboard/:guildId/reaction-roles/attach', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));

    const b = req.body;
    const channel = guild.channels.cache.get((b.channel_id || '').trim());
    if (!channel) return res.status(400).send(errorPage('Channel not found', 'Double-check the channel ID.'));

    let message;
    try {
      message = await channel.messages.fetch((b.message_id || '').trim());
      await message.react((b.emoji || '').trim());
    } catch (err) {
      return res.status(400).send(errorPage('Couldn\'t attach', 'Message not found in that channel, or Nexoria can\'t react there.'));
    }

    await pool.query(
      `INSERT INTO reaction_roles (message_id, emoji, role_id, guild_id, group_name, exclusive)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (message_id, emoji) DO UPDATE SET role_id=excluded.role_id, group_name=excluded.group_name, exclusive=excluded.exclusive`,
      [message.id, b.emoji.trim(), b.role_id.trim(), guild.id, b.group || null, !!b.exclusive]);
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  // Creates a dropdown role-menu message, same as /rolemenu.
  router.post('/dashboard/:guildId/role-menus', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));

    const b = req.body;
    const channel = guild.channels.cache.get((b.channel_id || '').trim());
    if (!channel) return res.status(400).send(errorPage('Channel not found', 'Double-check the channel ID.'));

    const me = guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
      return res.status(400).send(errorPage('Missing permission', 'Nexoria can\'t send messages in that channel.'));
    }

    const options = [1, 2, 3]
      .map(i => ({ role: (b[`role${i}`] || '').trim(), label: (b[`label${i}`] || '').trim() }))
      .filter(o => o.role && o.label);
    if (!options.length) return res.status(400).send(errorPage('Nothing to create', 'Provide at least one role ID + label pair.'));

    const exclusive = !!b.exclusive;
    const embed = new EmbedBuilder().setColor('Red').setTitle(b.title || 'Choose your role(s)').setDescription(b.description || '');
    const menu = new StringSelectMenuBuilder()
      .setCustomId('nexoria-rolemenu')
      .setPlaceholder('Choose your role(s)')
      .setMinValues(0)
      .setMaxValues(exclusive ? 1 : options.length)
      .addOptions(options.map(o => ({ label: o.label, value: o.role })));

    let message;
    try {
      message = await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    } catch (err) {
      return res.status(400).send(errorPage('Couldn\'t post role menu', err.message || 'Discord rejected the request — check the role IDs.'));
    }

    await pool.query(
      `INSERT INTO role_menus (message_id, guild_id, channel_id, exclusive) VALUES ($1,$2,$3,$4)
       ON CONFLICT (message_id) DO UPDATE SET exclusive=excluded.exclusive`,
      [message.id, guild.id, channel.id, exclusive]);
    for (const o of options) {
      await pool.query(
        `INSERT INTO role_menu_options (message_id, role_id, label) VALUES ($1,$2,$3)
         ON CONFLICT (message_id, role_id) DO UPDATE SET label=excluded.label`,
        [message.id, o.role, o.label]);
    }
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  router.post('/dashboard/:guildId/role-menus/delete', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));
    await pool.query('DELETE FROM role_menu_options WHERE message_id=$1', [req.body.message_id]);
    await pool.query('DELETE FROM role_menus WHERE guild_id=$1 AND message_id=$2', [guild.id, req.body.message_id]);
    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  router.post('/dashboard/:guildId', requireAuth, wrap(async (req, res) => {
    const guild = await verifyAccess(req, req.params.guildId);
    if (!guild) return res.status(403).send(errorPage('No access', "You don't have Manage Server permission on that server."));

    const b = req.body;
    await pool.query(
      `INSERT INTO settings (guild_id, welcome_channel, welcome_msg, log_channel, level_channel, suggestions_channel)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, welcome_msg=excluded.welcome_msg,
         log_channel=excluded.log_channel, level_channel=excluded.level_channel, suggestions_channel=excluded.suggestions_channel`,
      [guild.id, b.welcome_channel || null, b.welcome_msg || null, b.log_channel || null, b.level_channel || null, b.suggestions_channel || null]);

    const bannedWords = (b.banned_words || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    await pool.query(
      `INSERT INTO automod_settings (guild_id, banned_words, block_invites, mass_mention_limit, spam_limit, ai_moderation, ai_provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (guild_id) DO UPDATE SET banned_words=excluded.banned_words, block_invites=excluded.block_invites,
         mass_mention_limit=excluded.mass_mention_limit, spam_limit=excluded.spam_limit,
         ai_moderation=excluded.ai_moderation, ai_provider=excluded.ai_provider`,
      [guild.id, bannedWords, !!b.block_invites, Number(b.mass_mention_limit) || 0, Number(b.spam_limit) || 0,
        !!b.ai_moderation, b.ai_provider || 'groq']);

    await pool.query(
      `INSERT INTO antiraid_settings (guild_id, enabled, join_threshold, window_seconds, action)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (guild_id) DO UPDATE SET enabled=excluded.enabled, join_threshold=excluded.join_threshold,
         window_seconds=excluded.window_seconds, action=excluded.action`,
      [guild.id, !!b.antiraid_enabled, Number(b.join_threshold) || 5, Number(b.window_seconds) || 10, b.antiraid_action || 'lockdown']);

    res.redirect(`/dashboard/${guild.id}?saved=1`);
  }));

  // Final safety net — any error forwarded by wrap() lands here instead of
  // hanging the request. Always sends a response.
  router.use((err, req, res, next) => {
    console.error('Dashboard error:', err);
    res.status(500).send(errorPage('Something went wrong', err.message || 'Unexpected error. Check the Render logs for details.'));
  });

  return router;
}

module.exports = { buildDashboard };
