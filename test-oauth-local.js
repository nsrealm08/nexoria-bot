// Run this on YOUR OWN computer (not on Render) to test whether Discord's
// OAuth rate limit follows Render's IP address or the app's credentials.
//
// Setup:
//   1. In Discord Developer Portal → your app → OAuth2 → Redirects,
//      add:  http://localhost:5555/callback
//      (this is IN ADDITION to your Render redirect — Discord allows
//      multiple, and this doesn't touch/remove the existing one)
//   2. npm install express dotenv   (if not already present)
//   3. Create a .env file next to this script with:
//        CLIENT_ID=your_app_client_id
//        DISCORD_CLIENT_SECRET=your_app_client_secret
//   4. node test-oauth-local.js
//   5. Open http://localhost:5555/login in your browser
//
// If this succeeds from your home network while Render still 429s
// immediately, that confirms it's Render's IP being rate-limited, not
// your app's credentials — and the fix is out of your app's hands
// (wait longer, or use a Render plan with a dedicated outbound IP).
//
// If THIS also fails immediately with a 429, the block really is tied
// to the client_id/credentials themselves, not the network.

require('dotenv').config();
const express = require('express');
const app = express();

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Set CLIENT_ID and DISCORD_CLIENT_SECRET in a .env file next to this script.');
  process.exit(1);
}

app.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send('No code received.');

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI
  });

  console.log('\n→ Exchanging code (check your current IP at https://whatismyipaddress.com for reference)');

  const res2 = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  console.log('\n=== RESULT ===');
  console.log('Status:', res2.status);
  if (res2.status === 429) {
    console.log('Retry-After header:', res2.headers.get('retry-after'));
    console.log('\n❌ Still 429 from your local network too.');
    console.log('   → This means it IS tied to the client_id/credentials, not Render\'s IP.');
  } else if (res2.ok) {
    console.log('\n✅ SUCCESS — token exchange worked from this machine.');
    console.log('   → This confirms it\'s Render\'s IP being rate-limited, not your app.');
  } else {
    const text = await res2.text();
    console.log('Body:', text);
  }
  console.log('==============\n');

  res.send(`Done — check this script's console output for the result. Status: ${res2.status}`);
});

app.listen(PORT, () => {
  console.log('Local OAuth test server running.');
  console.log(`Open this in your browser: http://localhost:${PORT}/login`);
});
