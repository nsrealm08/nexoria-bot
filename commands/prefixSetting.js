const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setprefix').setDescription('Set a text prefix for a small set of quick commands (ping, avatar, rank, etc.)')
      .addStringOption(o => o.setName('prefix').setDescription('e.g. ! or ?  (omit to disable)').setMaxLength(5))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const prefix = interaction.options.getString('prefix');
      await pool.query(
        `INSERT INTO settings (guild_id, command_prefix) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET command_prefix=excluded.command_prefix`,
        [interaction.guild.id, prefix || null]);
      await interaction.reply({
        content: prefix
          ? `✅ Prefix set to \`${prefix}\`. Try \`${prefix}help\` for the available quick commands. Moderation stays slash-command-only for permission safety.`
          : '✅ Prefix disabled.',
        ephemeral: true
      });
    }
  }
];
