const { SlashCommandBuilder } = require('discord.js');
const { applyStatus, saveStatus } = require('../utils/botStatus');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setstatus').setDescription("Set Nexoria's Discord status (bot owner only — applies across every server)")
      .addStringOption(o => o.setName('presence').setDescription('Online status').setRequired(true)
        .addChoices(
          { name: 'Online', value: 'online' },
          { name: 'Idle', value: 'idle' },
          { name: 'Do Not Disturb', value: 'dnd' },
          { name: 'Invisible', value: 'invisible' }
        ))
      .addStringOption(o => o.setName('activity_type').setDescription('Activity type (leave off for no activity text)')
        .addChoices(
          { name: 'Playing', value: 'playing' },
          { name: 'Watching', value: 'watching' },
          { name: 'Listening to', value: 'listening' },
          { name: 'Competing in', value: 'competing' },
          { name: 'Custom status', value: 'custom' }
        ))
      .addStringOption(o => o.setName('text').setDescription('Activity text, e.g. "with slash commands"').setMaxLength(128)),
    async execute(interaction) {
      const ownerId = process.env.OWNER_ID;
      if (!ownerId) {
        return interaction.reply({ content: '❌ `OWNER_ID` isn\'t set in the bot\'s environment, so this command is locked. Set it to your Discord user ID in Render to enable `/setstatus`.', ephemeral: true });
      }
      if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: '❌ Only the bot owner can change Nexoria\'s status — it applies to every server it\'s in.', ephemeral: true });
      }

      const presence = interaction.options.getString('presence');
      const activityType = interaction.options.getString('activity_type');
      const text = interaction.options.getString('text');

      await applyStatus(interaction.client, { activityType, text, presence });
      await saveStatus({ activityType, text, presence });

      await interaction.reply({
        content: `✅ Status updated${text ? ` — ${activityType || 'playing'} "${text}"` : ''}, presence: ${presence}.`,
        ephemeral: true
      });
    }
  }
];
