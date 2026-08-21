const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show info about this server'),
    async execute(interaction) {
      const guild = interaction.guild;
      const owner = await guild.fetchOwner().catch(() => null);
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
          { name: 'Members', value: String(guild.memberCount), inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: 'Text channels', value: String(guild.channels.cache.filter(c => c.isTextBased() && !c.isThread()).size), inline: true },
          { name: 'Voice channels', value: String(guild.channels.cache.filter(c => c.isVoiceBased()).size), inline: true },
          { name: 'Roles', value: String(guild.roles.cache.size), inline: true },
          { name: 'Boost level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
          { name: 'Server ID', value: guild.id, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('userinfo').setDescription('Show info about a member')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle(user.tag)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'User ID', value: user.id, inline: true },
          { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true }
        );

      if (member) {
        embed.addFields(
          { name: 'Joined server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'Unknown', inline: true },
          { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).slice(0, 15).join(' ') : 'None', inline: false }
        );
      }
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('avatar').setDescription("Show a user's avatar")
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle(`${user.tag}'s avatar`)
        .setImage(user.displayAvatarURL({ size: 512 }));
      await interaction.reply({ embeds: [embed] });
    }
  }
];
