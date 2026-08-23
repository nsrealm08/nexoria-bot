const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('clearoauthlock').setDescription('Bot owner only — manually clear the persisted dashboard login rate-limit lock'),
    async execute(interaction) {
      const ownerId = process.env.OWNER_ID;
      if (!ownerId || interaction.user.id !== ownerId) {
        return interaction.reply({ content: '❌ Only the bot owner can do this.', ephemeral: true });
      }
      await pool.query(`DELETE FROM bot_config WHERE key='oauth_locked_until'`);
      await interaction.reply({ content: '✅ Cleared. Note: this only clears Nexoria\'s own record of the lock — if Discord is still actually rate-limiting the OAuth app, the very next attempt will just set it again.', ephemeral: true });
    }
  }
];
