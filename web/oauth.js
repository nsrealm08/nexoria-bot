const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = `${BASE}/callback`;
const MANAGE_GUILD = 0x20;

if (!BASE) {
  console.error('❌ BASE_URL is not set — OAuth login will fail with "Not a well formed URL." Set it in Render\'s Environment tab to your service URL, e.g. https://nexoria-bot-x22a.onrender.com (no trailing slash).');
}

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
    state
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI
  });
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10000)
  });
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new Error(`Discord is rate-limiting login attempts — wait ${retryAfter || 'a few'} seconds, then start over from the login page (don't refresh this page — the code it used is now spent).`);
  }
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function fetchUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Fetch user failed: ${res.status}`);
  return res.json();
}

async function fetchManageableGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000)
  });
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new Error(`Discord is rate-limiting this request — try again in ${retryAfter || 'a few'} seconds.`);
  }
  if (!res.ok) throw new Error(`Fetch guilds failed: ${res.status}`);
  const guilds = await res.json();
  return guilds
    .filter(g => (BigInt(g.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD))
    .map(g => ({
      ...g,
      iconURL: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null
    }));
}

module.exports = { getAuthUrl, exchangeCode, fetchUser, fetchManageableGuilds };
