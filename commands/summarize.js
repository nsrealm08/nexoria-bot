const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { askQuestion } = require('../utils/askAI');
const { checkAccess } = require('../utils/aiAccess');

const SUMMARY_SYSTEM_PROMPT = 'You summarize Discord chat logs. Given a transcript of "Username: message" lines, write a concise summary of the conversation — key topics, decisions, and any notable moments. Use bullet points. Do not address individual messages one by one; synthesize. Keep it under 250 words.';
const MAX_TRANSCRIPT_CHARS = 8000;

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('summarize').setDescription('AI summary of recent messages in this channel')
      .addIntegerOption(o => o.setName('messages').setDescription('How many recent messages to summarize (default 50, max 100)').setMinValue(5).setMaxValue(100)),
    async execute(interaction) {
      if (!(await checkAccess(interaction))) return;
      if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
        return interaction.reply({ content: '❌ No AI provider is configured — the bot owner needs to set `GROQ_API_KEY` or `GEMINI_API_KEY`.', ephemeral: true });
      }

      const limit = interaction.options.getInteger('messages') || 50;
      await interaction.deferReply();

      const fetched = await interaction.channel.messages.fetch({ limit }).catch(() => null);
      if (!fetched || fetched.size === 0) {
        return interaction.editReply('❌ Couldn\'t fetch any messages from this channel.');
      }

      const ordered = [...fetched.values()].reverse();
      let transcript = ordered
        .filter(m => !m.author.bot && (m.content || m.attachments.size))
        .map(m => `${m.author.username}: ${m.content || '[attachment]'}`)
        .join('\n');

      if (!transcript) {
        return interaction.editReply('❌ Nothing to summarize — no substantive messages in that range.');
      }
      if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        transcript = transcript.slice(transcript.length - MAX_TRANSCRIPT_CHARS);
      }

      const result = await askQuestion(transcript, SUMMARY_SYSTEM_PROMPT);
      if (!result) return interaction.editReply('❌ Both AI providers failed to respond — try again in a moment.');

      const summary = result.answer.length > 3900 ? `${result.answer.slice(0, 3900)}…` : result.answer;
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle(`📋 Summary — last ${ordered.length} messages`)
        .setDescription(summary)
        .setFooter({ text: `Summarized by ${result.provider === 'groq' ? 'Groq' : 'Gemini'} · requested by ${interaction.user.tag}` });

      await interaction.editReply({ embeds: [embed] });
    }
  }
];
