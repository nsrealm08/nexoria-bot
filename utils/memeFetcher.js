async function fetchMeme(subredditsCsv) {
  const subreddits = subredditsCsv ? subredditsCsv.split(',').map(s => s.trim()).filter(Boolean) : null;
  const chosenSub = subreddits?.length ? subreddits[Math.floor(Math.random() * subreddits.length)] : null;
  const url = chosenSub
    ? `https://meme-api.com/gimme/${encodeURIComponent(chosenSub)}/5`
    : 'https://meme-api.com/gimme/5';

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexoriaBot/1.0; +https://github.com)' }
  });
  if (!res.ok) throw new Error(`meme-api failed: ${res.status}`);
  const data = await res.json();

  const memes = data.memes || (data.title ? [data] : []);
  const safe = memes.filter(m => !m.nsfw && !m.spoiler);
  if (!safe.length) return null;

  return safe[Math.floor(Math.random() * safe.length)];
}

module.exports = { fetchMeme };
