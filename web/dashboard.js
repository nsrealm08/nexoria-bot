const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('../database');
const { getAuthUrl, exchangeCode, fetchUser, fetchManageableGuilds } = require('./oauth');
const { loginPage, guildListPage, settingsPage, statsPage, errorPage } = require('./views');

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

  async function verifyAccess(req, guildId) {
    const guilds = await fetchManageableGuilds(req.session.accessToken);
    const match = guilds.find(g => g.id === guildId);
    const botGuild = client.guilds.cache.get(guildId);
    return match && botGuild ? botGuild : null;
  }

  router.get('/', (req, res) => {
    if (req.session.accessToken) return res.redirect('/dashboard');
    res.send(loginPage());
  });

  router.get('/login', (req, res) => res.redirect(getAuthUrl()));

  router.get('/callback', wrap(async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/');
    const token = await exchangeCode(code);
    req.session.accessToken = token.access_token;
    res.redirect('/dashboard');
  }));

  router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  });

  router.get('/dashboard', requireAuth, wrap(async (req, res) => {
    const user = await fetchUser(req.session.accessToken);
    const guilds = await fetchManageableGuilds(req.session.accessToken);
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
      `INSERT INTO automod_settings (guild_id, banned_words, block_invites, mass_mention_limit, spam_limit)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (guild_id) DO UPDATE SET banned_words=excluded.banned_words, block_invites=excluded.block_invites,
         mass_mention_limit=excluded.mass_mention_limit, spam_limit=excluded.spam_limit`,
      [guild.id, bannedWords, !!b.block_invites, Number(b.mass_mention_limit) || 0, Number(b.spam_limit) || 0]);

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
