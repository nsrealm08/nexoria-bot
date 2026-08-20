const BASE = process.env.BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = `${BASE}/callback`;
const MANAGE_GUILD = 0x20;

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds'
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
    body
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function fetchUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Fetch user failed: ${res.status}`);
  return res.json();
}

async function fetchManageableGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Fetch guilds failed: ${res.status}`);
  const guilds = await res.json();
  return guilds.filter(g => (BigInt(g.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD));
}

module.exports = { getAuthUrl, exchangeCode, fetchUser, fetchManageableGuilds };
