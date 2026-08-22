const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setdmnotify').setDescription('Toggle DMing members when they get a moderation action (default: on)')
      .addBooleanOption(o => o.setName('enabled').setDescription('Send a DM on kick/ban/mute/warn/timeout?').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const enabled = interaction.options.getBoolean('enabled');
      await pool.query(
        `INSERT INTO settings (guild_id, dm_notifications) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET dm_notifications=excluded.dm_notifications`,
        [interaction.guild.id, enabled]);
      await interaction.reply({ content: `✅ DM notifications ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }
  }
];
