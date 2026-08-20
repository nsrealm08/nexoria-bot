const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('antiraid-setup').setDescription('Configure anti-raid protection')
      .addBooleanOption(o => o.setName('enabled').setDescription('Turn anti-raid on/off').setRequired(true))
      .addIntegerOption(o => o.setName('join_threshold').setDescription('Joins within the window that trigger a response'))
      .addIntegerOption(o => o.setName('window_seconds').setDescription('Time window in seconds'))
      .addStringOption(o => o.setName('action').setDescription('What to do when triggered')
        .addChoices({ name: 'Lock server (deny @everyone send messages)', value: 'lockdown' }, { name: 'Kick new joiners', value: 'kick' }))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const enabled = interaction.options.getBoolean('enabled');
      const { rows } = await pool.query('SELECT * FROM antiraid_settings WHERE guild_id=$1', [interaction.guild.id]);
      const current = rows[0] || { join_threshold: 5, window_seconds: 10, action: 'lockdown' };

      const threshold = interaction.options.getInteger('join_threshold') ?? current.join_threshold;
      const window = interaction.options.getInteger('window_seconds') ?? current.window_seconds;
      const action = interaction.options.getString('action') ?? current.action;

      await pool.query(
        `INSERT INTO antiraid_settings (guild_id, enabled, join_threshold, window_seconds, action)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (guild_id) DO UPDATE SET enabled=excluded.enabled, join_threshold=excluded.join_threshold,
           window_seconds=excluded.window_seconds, action=excluded.action`,
        [interaction.guild.id, enabled, threshold, window, action]);

      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('Anti-raid updated')
        .addFields(
          { name: 'Enabled', value: String(enabled), inline: true },
          { name: 'Threshold', value: `${threshold} joins`, inline: true },
          { name: 'Window', value: `${window}s`, inline: true },
          { name: 'Action', value: action, inline: true }
        )], ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('unlock').setDescription('Lift an anti-raid lockdown and restore @everyone send permissions')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const everyone = interaction.guild.roles.everyone;
      for (const channel of interaction.guild.channels.cache.values()) {
        if (channel.permissionOverwrites) {
          await channel.permissionOverwrites.edit(everyone, { SendMessages: null }).catch(() => {});
        }
      }
      await pool.query('UPDATE antiraid_settings SET locked=FALSE WHERE guild_id=$1', [interaction.guild.id]);
      await interaction.reply({ content: '🔓 Server unlocked.', ephemeral: true });
    }
  }
];
