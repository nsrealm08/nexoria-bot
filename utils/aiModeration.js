// AI moderation is opt-in per server (automod_settings.ai_moderation) and
// requires the bot owner to set GROQ_API_KEY or GEMINI_API_KEY in Render's
// environment — no per-server API keys are stored in the database.

const SYSTEM_PROMPT = `You are a content moderation classifier for a Discord server. Given a message, respond with ONLY compact JSON, no markdown, no explanation:
{"flagged": boolean, "category": "harassment"|"hate"|"sexual"|"violence"|"self_harm"|"none", "confidence": 0-1}
Flag only clear violations — harassment, hate speech, sexual content, graphic violence, or self-harm encouragement. Do not flag mild profanity, sarcasm, jokes, or heated-but-normal disagreement. Be conservative: when uncertain, do not flag.`;

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch { /* fall through to regex extraction */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* give up below */ }
  }
  return null;
}

async function checkWithGroq(content) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content }
      ],
      temperature: 0,
      max_completion_tokens: 200,
      reasoning_effort: 'low'
    }),
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`Groq moderation call failed: ${res.status}`);
  const data = await res.json();
  return parseJsonLoose(data.choices?.[0]?.message?.content || '');
}

async function checkWithGemini(content) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nMessage: ${content}` }] }],
      generationConfig: { maxOutputTokens: 200, responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`Gemini moderation call failed: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseJsonLoose(text);
}

async function checkToxicity(content, provider = 'groq') {
  if (!content || content.trim().length < 4) return null;
  const result = provider === 'gemini' ? await checkWithGemini(content) : await checkWithGroq(content);
  if (!result || typeof result.flagged !== 'boolean') return null;
  return result;
}

module.exports = { checkToxicity };
