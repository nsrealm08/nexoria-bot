const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLang, t } = require('../utils/i18n');

module.exports = [
  {
    data: new SlashCommandBuilder().setName('ping').setDescription("Check Nexoria's latency"),
    async execute(interaction) {
      const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const lang = await getLang(interaction.guild.id);
      await interaction.editReply({
        content: null,
        embeds: [new EmbedBuilder().setColor('Red').setDescription(t(lang, 'pong', { ms: latency, ws: interaction.client.ws.ping }))]
      });
    }
  }
];
