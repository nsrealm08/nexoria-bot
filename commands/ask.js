const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { askQuestion } = require('../utils/askAI');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('ask').setDescription('Ask the AI a question')
      .addStringOption(o => o.setName('question').setDescription('What do you want to ask?').setRequired(true).setMaxLength(500)),
    async execute(interaction) {
      const { rows } = await pool.query('SELECT ask_role FROM settings WHERE guild_id=$1', [interaction.guild.id]);
      const roleId = rows[0]?.ask_role;

      if (!roleId) {
        return interaction.reply({ content: '❌ `/ask` isn\'t set up on this server yet — ask an admin to run `/setaskrole`.', ephemeral: true });
      }
      if (!interaction.member.roles.cache.has(roleId)) {
        return interaction.reply({ content: `❌ You need the <@&${roleId}> role to use \`/ask\`.`, ephemeral: true });
      }
      if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
        return interaction.reply({ content: '❌ No AI provider is configured — the bot owner needs to set `GROQ_API_KEY` or `GEMINI_API_KEY`.', ephemeral: true });
      }

      const question = interaction.options.getString('question');
      await interaction.deferReply();

      const result = await askQuestion(question);
      if (!result) {
        return interaction.editReply('❌ Both AI providers failed to respond — try again in a moment.');
      }

      const answer = result.answer.length > 3900 ? `${result.answer.slice(0, 3900)}…` : result.answer;
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setAuthor({ name: `${interaction.user.tag} asked:`, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`**${question}**\n\n${answer}`)
        .setFooter({ text: `Answered by ${result.provider === 'groq' ? 'Groq' : 'Gemini'}` });

      await interaction.editReply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setaskrole').setDescription('Set which role can use /ask')
      .addRoleOption(o => o.setName('role').setDescription('Role allowed to use /ask (omit to disable)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const role = interaction.options.getRole('role');
      await pool.query(
        `INSERT INTO settings (guild_id, ask_role) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET ask_role=excluded.ask_role`,
        [interaction.guild.id, role ? role.id : null]);
      await interaction.reply({
        content: role ? `✅ ${role} can now use \`/ask\`.` : '✅ `/ask` disabled for everyone.',
        ephemeral: true
      });
    }
  }
];
