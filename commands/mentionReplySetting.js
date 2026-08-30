const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setmentionreply').setDescription('Let Nexoria reply with AI when @mentioned directly in a message (uses the same AI role gate)')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable @mention auto-reply?').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const enabled = interaction.options.getBoolean('enabled');
      await pool.query(
        `INSERT INTO settings (guild_id, mention_reply) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET mention_reply=excluded.mention_reply`,
        [interaction.guild.id, enabled]);
      await interaction.reply({
        content: enabled
          ? '✅ Nexoria will now reply when @mentioned — only works for members with the role set via `/setaskrole`.'
          : '✅ @mention auto-reply disabled.',
        ephemeral: true
      });
    }
  }
];
