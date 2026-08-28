const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setprefix').setDescription('Set a text prefix so every slash command also works as a typed command')
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
          ? `✅ Prefix set to \`${prefix}\`. Every command works with it now, e.g. \`${prefix}kick @user spamming\` — permissions are checked exactly like the slash version. Try \`${prefix}help\` for the full list.`
          : '✅ Prefix disabled.',
        ephemeral: true
      });
    }
  }
];
