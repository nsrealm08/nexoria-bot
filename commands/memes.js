const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setmemes').setDescription('Auto-post a meme on a timer')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (omit to disable)'))
      .addIntegerOption(o => o.setName('interval').setDescription('Minutes between memes (default 60)').setMinValue(5))
      .addStringOption(o => o.setName('subreddits').setDescription('Comma-separated subreddits (default: meme-api\'s general pool)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const interval = interaction.options.getInteger('interval') || 60;
      const subreddits = interaction.options.getString('subreddits');

      await pool.query(
        `INSERT INTO settings (guild_id, meme_channel, meme_interval_minutes, meme_subreddits, meme_last_sent) VALUES ($1,$2,$3,$4,NULL)
         ON CONFLICT (guild_id) DO UPDATE SET meme_channel=excluded.meme_channel,
           meme_interval_minutes=excluded.meme_interval_minutes, meme_subreddits=excluded.meme_subreddits, meme_last_sent=NULL`,
        [interaction.guild.id, channel ? channel.id : null, interval, subreddits || null]);

      await interaction.reply({
        content: channel
          ? `✅ Memes every ${interval} minutes in ${channel}${subreddits ? ` from: ${subreddits}` : ''}.`
          : '✅ Auto-memes disabled.',
        ephemeral: true
      });
    }
  }
];
