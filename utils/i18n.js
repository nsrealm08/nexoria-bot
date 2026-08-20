const { pool } = require('../database');

const strings = {
  en: {
    pong: '🏓 Pong! Roundtrip **{ms}ms**, WS **{ws}ms**',
    kicked: '👢 Kicked **{user}** — {reason}',
    banned: '🔨 Banned **{user}** — {reason}',
    muted: '🔕 Muted **{user}** — {reason}',
    unmuted: '🔔 Unmuted **{user}**.',
    warned: '⚠️ Warned **{user}** — {reason}',
    levelUp: '🎉 {user} leveled up to **Level {level}**!',
    welcome: 'Welcome {user} to {server}!',
    rateLimited: '⏳ Slow down a little before your next command.'
  },
  es: {
    pong: '🏓 ¡Pong! Ida y vuelta **{ms}ms**, WS **{ws}ms**',
    kicked: '👢 Expulsado **{user}** — {reason}',
    banned: '🔨 Baneado **{user}** — {reason}',
    muted: '🔕 Silenciado **{user}** — {reason}',
    unmuted: '🔔 Silencio quitado a **{user}**.',
    warned: '⚠️ Advertido **{user}** — {reason}',
    levelUp: '🎉 ¡{user} subió al **Nivel {level}**!',
    welcome: '¡Bienvenido/a {user} a {server}!',
    rateLimited: '⏳ Espera un poco antes de tu próximo comando.'
  },
  fr: {
    pong: '🏓 Pong ! Aller-retour **{ms}ms**, WS **{ws}ms**',
    kicked: '👢 **{user}** expulsé — {reason}',
    banned: '🔨 **{user}** banni — {reason}',
    muted: '🔕 **{user}** rendu muet — {reason}',
    unmuted: '🔔 **{user}** n\'est plus muet.',
    warned: '⚠️ **{user}** averti — {reason}',
    levelUp: '🎉 {user} a atteint le **Niveau {level}** !',
    welcome: 'Bienvenue {user} sur {server} !',
    rateLimited: '⏳ Ralentis un peu avant ta prochaine commande.'
  },
  de: {
    pong: '🏓 Pong! Laufzeit **{ms}ms**, WS **{ws}ms**',
    kicked: '👢 **{user}** gekickt — {reason}',
    banned: '🔨 **{user}** gebannt — {reason}',
    muted: '🔕 **{user}** stummgeschaltet — {reason}',
    unmuted: '🔔 **{user}** ist nicht mehr stummgeschaltet.',
    warned: '⚠️ **{user}** verwarnt — {reason}',
    levelUp: '🎉 {user} hat **Level {level}** erreicht!',
    welcome: 'Willkommen {user} auf {server}!',
    rateLimited: '⏳ Warte kurz vor deinem nächsten Befehl.'
  }
};

async function getLang(guildId) {
  const { rows } = await pool.query('SELECT language FROM settings WHERE guild_id=$1', [guildId]);
  return rows[0]?.language || 'en';
}

function t(lang, key, vars = {}) {
  const template = (strings[lang] || strings.en)[key] || strings.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

const SUPPORTED = Object.keys(strings);

module.exports = { getLang, t, SUPPORTED };
