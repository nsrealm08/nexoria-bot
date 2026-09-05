const { askQuestion } = require('./askAI');

const QOTD_SYSTEM_PROMPT = 'Generate ONE fun, thought-provoking "question of the day" for a Discord community to discuss. Something that sparks conversation — hypotheticals, preferences, light debates, "would you rather" style, or reflective questions. Respond with ONLY the question itself, no preamble, no quotes, no numbering.';

const FALLBACK_QUESTIONS = [
  "What's a skill you'd love to master if you had unlimited time to practice?",
  'Would you rather explore space or the deep ocean?',
  "What's the best piece of advice you've ever received?",
  'If you could instantly learn any language, which would you pick and why?',
  "What's a small thing that instantly improves your day?",
  'Would you rather have the ability to fly or be invisible?',
  "What's a movie or show you could rewatch endlessly?",
  'If you could have dinner with anyone, living or dead, who would it be?',
  "What's the most useless talent you have?",
  'Would you rather live without music or without movies?',
  "What's a hobby you've always wanted to try but haven't yet?",
  'If your life had a theme song, what would it be?',
  "What's the best game you've ever played?",
  'Would you rather be able to time travel to the past or the future?',
  "What's something you believed as a kid that turned out to be completely wrong?",
  'If you had to eat one meal for the rest of your life, what would it be?',
  "What's a place you'd love to visit that most people overlook?",
  'Would you rather always be 10 minutes late or 20 minutes early?',
  "What's the last thing that made you laugh out loud?",
  'If you could master any instrument instantly, which would you choose?'
];

async function generateQuestion() {
  if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      const result = await askQuestion('Give me today\'s question.', QOTD_SYSTEM_PROMPT);
      if (result?.answer) return result.answer.replace(/^["']|["']$/g, '').trim();
    } catch (err) {
      console.warn('QOTD AI generation failed, using fallback list:', err.message);
    }
  }
  return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
}

module.exports = { generateQuestion };
