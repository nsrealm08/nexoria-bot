const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');
const { SUPPORTED } = require('../utils/i18n');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('language').setDescription("Set Nexoria's reply language for this server")
      .addStringOption(o => o.setName('code').setDescription('Language').setRequired(true)
        .addChoices(...SUPPORTED.map(c => ({ name: c, value: c }))))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const code = interaction.options.getString('code');
      await pool.query(
        `INSERT INTO settings (guild_id, language) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET language=excluded.language`,
        [interaction.guild.id, code]);
      await interaction.reply({ content: `✅ Language set to \`${code}\`. Covers core replies (ping, mod actions, welcome, level-up) — not every command yet.`, ephemeral: true });
    }
  }
];
