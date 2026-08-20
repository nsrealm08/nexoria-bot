const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { pickWinners } = require('../utils/giveaway');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('giveaway').setDescription('Run a giveaway')
      .addSubcommand(sc => sc.setName('start').setDescription('Start a giveaway')
        .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true)))
      .addSubcommand(sc => sc.setName('reroll').setDescription('Reroll winners for an ended giveaway')
        .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'start') {
        const prize = interaction.options.getString('prize');
        const minutes = interaction.options.getInteger('minutes');
        const winnerCount = interaction.options.getInteger('winners');
        const endTime = Date.now() + minutes * 60000;

        const embed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('🎉 Giveaway!')
          .setDescription(`**${prize}**\n\nReact with 🎉 to enter!\nWinners: **${winnerCount}**\nEnds: <t:${Math.floor(endTime / 1000)}:R>`);
        const message = await interaction.channel.send({ embeds: [embed] });
        await message.react('🎉');

        await pool.query(
          'INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winner_count, end_time, ended) VALUES ($1,$2,$3,$4,$5,$6,FALSE)',
          [interaction.guild.id, interaction.channel.id, message.id, prize, winnerCount, endTime]);

        await interaction.reply({ content: `✅ Giveaway started for **${prize}**.`, ephemeral: true });
      }

      if (sub === 'reroll') {
        const messageId = interaction.options.getString('message_id');
        const { rows } = await pool.query('SELECT * FROM giveaways WHERE message_id=$1 AND guild_id=$2', [messageId, interaction.guild.id]);
        const giveaway = rows[0];
        if (!giveaway) return interaction.reply({ content: '❌ No giveaway found with that message ID.', ephemeral: true });

        const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (!message) return interaction.reply({ content: '❌ Could not fetch that message (wrong channel?).', ephemeral: true });

        const winners = await pickWinners(message, giveaway.winner_count);
        if (!winners.length) return interaction.reply({ content: '❌ No eligible entrants to pick from.', ephemeral: true });

        await interaction.channel.send(`🎉 New winner(s) for **${giveaway.prize}**: ${winners.map(w => `<@${w.id}>`).join(', ')}`);
        await interaction.reply({ content: '✅ Rerolled.', ephemeral: true });
      }
    }
  }
];
