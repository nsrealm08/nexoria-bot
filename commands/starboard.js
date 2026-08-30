const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setstarboard').setDescription('Configure the starboard — messages with enough reactions get cross-posted')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post to (omit to disable)'))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji to watch for (default ⭐)'))
      .addIntegerOption(o => o.setName('threshold').setDescription('Reactions needed to post (default 3)').setMinValue(1))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const emoji = interaction.options.getString('emoji');
      const threshold = interaction.options.getInteger('threshold');

      const { rows } = await pool.query('SELECT starboard_emoji, starboard_threshold FROM settings WHERE guild_id=$1', [interaction.guild.id]);
      const current = rows[0] || { starboard_emoji: '⭐', starboard_threshold: 3 };

      await pool.query(
        `INSERT INTO settings (guild_id, starboard_channel, starboard_emoji, starboard_threshold) VALUES ($1,$2,$3,$4)
         ON CONFLICT (guild_id) DO UPDATE SET starboard_channel=excluded.starboard_channel,
           starboard_emoji=excluded.starboard_emoji, starboard_threshold=excluded.starboard_threshold`,
        [interaction.guild.id, channel ? channel.id : null, emoji || current.starboard_emoji, threshold || current.starboard_threshold]);

      await interaction.reply({
        content: channel
          ? `✅ Starboard active in ${channel} — ${emoji || current.starboard_emoji} × ${threshold || current.starboard_threshold} to post.`
          : '✅ Starboard disabled.',
        ephemeral: true
      });
    }
  }
];
