const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('schedule').setDescription('Schedule an announcement')
      .addSubcommand(sc => sc.setName('create').setDescription('Schedule a message')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('Message content').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Send in how many minutes from now').setRequired(true))
        .addStringOption(o => o.setName('recurring').setDescription('Repeat?')
          .addChoices({ name: 'One-time', value: 'none' }, { name: 'Daily', value: 'daily' }, { name: 'Weekly', value: 'weekly' })))
      .addSubcommand(sc => sc.setName('list').setDescription('List scheduled announcements'))
      .addSubcommand(sc => sc.setName('cancel').setDescription('Cancel a scheduled announcement')
        .addIntegerOption(o => o.setName('id').setDescription('Schedule ID').setRequired(true)))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'create') {
        const channel = interaction.options.getChannel('channel');
        const content = interaction.options.getString('message');
        const minutes = interaction.options.getInteger('minutes');
        const recurring = interaction.options.getString('recurring') || 'none';
        const nextRun = Date.now() + minutes * 60000;

        const { rows } = await pool.query(
          'INSERT INTO scheduled_messages (guild_id, channel_id, content, next_run, recurring, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [interaction.guild.id, channel.id, content, nextRun, recurring, interaction.user.id]);

        await interaction.reply({ content: `✅ Scheduled (#${rows[0].id}) for ${channel} <t:${Math.floor(nextRun / 1000)}:R>${recurring !== 'none' ? `, repeating ${recurring}` : ''}.`, ephemeral: true });
      }

      if (sub === 'list') {
        const { rows } = await pool.query('SELECT * FROM scheduled_messages WHERE guild_id=$1 ORDER BY next_run ASC', [interaction.guild.id]);
        if (!rows.length) return interaction.reply({ content: 'No scheduled announcements.', ephemeral: true });
        const desc = rows.map(r => `**#${r.id}** in <#${r.channel_id}> — <t:${Math.floor(Number(r.next_run) / 1000)}:R>${r.recurring !== 'none' ? ` (${r.recurring})` : ''}\n> ${r.content.slice(0, 80)}`).join('\n\n');
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('Blue').setTitle('Scheduled Announcements').setDescription(desc)], ephemeral: true });
      }

      if (sub === 'cancel') {
        const id = interaction.options.getInteger('id');
        const { rowCount } = await pool.query('DELETE FROM scheduled_messages WHERE id=$1 AND guild_id=$2', [id, interaction.guild.id]);
        await interaction.reply({ content: rowCount ? `✅ Cancelled #${id}.` : `❌ No schedule #${id} found.`, ephemeral: true });
      }
    }
  }
];
