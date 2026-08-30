const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { askQuestion, askGroq, askGemini } = require('../utils/askAI');
const { checkAccess } = require('../utils/aiAccess');

function buildAnswerEmbed(interaction, question, answer, providerLabel) {
  const trimmed = answer.length > 3900 ? `${answer.slice(0, 3900)}…` : answer;
  return new EmbedBuilder()
    .setColor('Red')
    .setAuthor({ name: `${interaction.user.tag} asked:`, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(`**${question}**\n\n${trimmed}`)
    .setFooter({ text: `Answered by ${providerLabel}` });
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('ask').setDescription('Ask the AI a question — tries Groq first, falls back to Gemini automatically')
      .addStringOption(o => o.setName('question').setDescription('What do you want to ask?').setRequired(true).setMaxLength(500)),
    async execute(interaction) {
      if (!(await checkAccess(interaction))) return;
      if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
        return interaction.reply({ content: '❌ No AI provider is configured — the bot owner needs to set `GROQ_API_KEY` or `GEMINI_API_KEY`.', ephemeral: true });
      }

      const question = interaction.options.getString('question');
      await interaction.deferReply();

      const result = await askQuestion(question);
      if (!result) return interaction.editReply('❌ Both AI providers failed to respond — try again in a moment.');

      await interaction.editReply({ embeds: [buildAnswerEmbed(interaction, question, result.answer, result.provider === 'groq' ? 'Groq' : 'Gemini')] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('groq').setDescription('Ask Groq specifically (no fallback to Gemini)')
      .addStringOption(o => o.setName('question').setDescription('What do you want to ask?').setRequired(true).setMaxLength(500)),
    async execute(interaction) {
      if (!(await checkAccess(interaction))) return;
      if (!process.env.GROQ_API_KEY) {
        return interaction.reply({ content: '❌ Groq isn\'t configured — the bot owner needs to set `GROQ_API_KEY`. Try `/ask` instead.', ephemeral: true });
      }

      const question = interaction.options.getString('question');
      await interaction.deferReply();

      try {
        const answer = await askGroq(question);
        if (!answer) return interaction.editReply('❌ Groq returned an empty response — try again, or use `/ask` to fall back to Gemini.');
        await interaction.editReply({ embeds: [buildAnswerEmbed(interaction, question, answer, 'Groq')] });
      } catch (err) {
        console.error('/groq failed:', err.message);
        await interaction.editReply(`❌ Groq failed to respond (${err.message}). Try \`/ask\` to fall back to Gemini.`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('gemini').setDescription('Ask Gemini specifically (no fallback to Groq)')
      .addStringOption(o => o.setName('question').setDescription('What do you want to ask?').setRequired(true).setMaxLength(500)),
    async execute(interaction) {
      if (!(await checkAccess(interaction))) return;
      if (!process.env.GEMINI_API_KEY) {
        return interaction.reply({ content: '❌ Gemini isn\'t configured — the bot owner needs to set `GEMINI_API_KEY`. Try `/ask` instead.', ephemeral: true });
      }

      const question = interaction.options.getString('question');
      await interaction.deferReply();

      try {
        const answer = await askGemini(question);
        if (!answer) return interaction.editReply('❌ Gemini returned an empty response — try again, or use `/ask` to fall back to Groq.');
        await interaction.editReply({ embeds: [buildAnswerEmbed(interaction, question, answer, 'Gemini')] });
      } catch (err) {
        console.error('/gemini failed:', err.message);
        await interaction.editReply(`❌ Gemini failed to respond (${err.message}). Try \`/ask\` to fall back to Groq.`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setaskrole').setDescription('Set which role can use /ask, /groq, and /gemini')
      .addRoleOption(o => o.setName('role').setDescription('Role allowed to use AI commands (omit to disable)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const role = interaction.options.getRole('role');
      await pool.query(
        `INSERT INTO settings (guild_id, ask_role) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET ask_role=excluded.ask_role`,
        [interaction.guild.id, role ? role.id : null]);
      await interaction.reply({
        content: role ? `✅ ${role} can now use \`/ask\`, \`/groq\`, and \`/gemini\`.` : '✅ AI commands disabled for everyone.',
        ephemeral: true
      });
    }
  }
];
