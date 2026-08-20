const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setsuggestionschannel').setDescription('Set the channel where suggestions get posted')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      await pool.query(
        `INSERT INTO settings (guild_id, suggestions_channel) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET suggestions_channel=excluded.suggestions_channel`,
        [interaction.guild.id, channel.id]);
      await interaction.reply({ content: `✅ Suggestions will post in ${channel}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('suggest').setDescription('Submit a suggestion for staff to review')
      .addStringOption(o => o.setName('idea').setDescription('Your suggestion').setRequired(true)),
    async execute(interaction) {
      const { rows } = await pool.query('SELECT suggestions_channel FROM settings WHERE guild_id=$1', [interaction.guild.id]);
      const channelId = rows[0]?.suggestions_channel;
      if (!channelId) return interaction.reply({ content: '❌ No suggestions channel configured yet. Ask a mod to run `/setsuggestionschannel`.', ephemeral: true });
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) return interaction.reply({ content: '❌ Configured suggestions channel no longer exists.', ephemeral: true });

      const content = interaction.options.getString('idea');
      const embed = new EmbedBuilder()
        .setColor('Yellow')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(content)
        .setFooter({ text: 'Status: Pending' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggestion-approve').setLabel('Approve').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('suggestion-deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
      );

      const message = await channel.send({ embeds: [embed], components: [row] });
      await message.react('👍');
      await message.react('👎');

      await pool.query(
        'INSERT INTO suggestions (guild_id, message_id, channel_id, user_id, content, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [interaction.guild.id, message.id, channel.id, interaction.user.id, content, 'pending', Date.now()]);

      await interaction.reply({ content: `✅ Suggestion posted in ${channel}.`, ephemeral: true });
    }
  }
];
