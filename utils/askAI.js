// Shared with utils/aiModeration.js in spirit but a separate concern:
// this answers open questions rather than classifying toxicity. Reuses the
// same env vars (GROQ_API_KEY / GEMINI_API_KEY) since both features are
// "bring your own AI key" and there's no reason to require two.

class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function askGroq(question) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are a helpful, concise assistant answering questions in a Discord server. Keep answers under 300 words unless the question genuinely needs more.' },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_completion_tokens: 1024,
      reasoning_effort: 'low'
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) throw new ProviderError(`Groq failed: ${res.status}`, res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function askGemini(question) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: question }] }],
      systemInstruction: { parts: [{ text: 'You are a helpful, concise assistant answering questions in a Discord server. Keep answers under 300 words unless the question genuinely needs more.' }] },
      generationConfig: { maxOutputTokens: 700 }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) throw new ProviderError(`Gemini failed: ${res.status}`, res.status);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function askQuestion(question) {
  try {
    const answer = await askGroq(question);
    if (answer) return { answer, provider: 'groq' };
  } catch (err) {
    console.warn('Groq /ask failed, falling back to Gemini:', err.message);
  }

  try {
    const answer = await askGemini(question);
    if (answer) return { answer, provider: 'gemini' };
  } catch (err) {
    console.warn('Gemini /ask fallback also failed:', err.message);
  }

  return null;
}

module.exports = { askQuestion, askGroq, askGemini, ProviderError };
