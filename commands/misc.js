const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder().setName('ping').setDescription("Check Nexoria's latency"),
    async execute(interaction) {
      const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply({
        content: null,
        embeds: [new EmbedBuilder().setColor('Red').setDescription(`🏓 Pong! Roundtrip **${latency}ms**, WS **${interaction.client.ws.ping}ms**`)]
      });
    }
  }
];
