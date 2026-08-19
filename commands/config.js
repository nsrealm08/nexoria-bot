const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setwelcome').setDescription('Configure the welcome message')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Use {user} and {server} as placeholders').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      db.prepare(`INSERT INTO settings (guildId, welcomeChannel, welcomeMsg) VALUES (?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET welcomeChannel=excluded.welcomeChannel, welcomeMsg=excluded.welcomeMsg`)
        .run(interaction.guild.id, channel.id, message);
      await interaction.reply({ content: `✅ Welcome messages will post in ${channel}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('addrole').setDescription('Add a role to a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);
      await interaction.reply({ content: `✅ Added ${role} to ${user.tag}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('removerole').setDescription('Remove a role from a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role);
      await interaction.reply({ content: `✅ Removed ${role} from ${user.tag}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('reactionrole').setDescription('Add a reaction role to a message')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID (in this channel)').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const messageId = interaction.options.getString('message_id');
      const emoji = interaction.options.getString('emoji');
      const role = interaction.options.getRole('role');
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        await message.react(emoji);
        db.prepare(`INSERT OR REPLACE INTO reaction_roles (messageId, emoji, roleId, guildId) VALUES (?,?,?,?)`)
          .run(messageId, emoji, role.id, interaction.guild.id);
        await interaction.reply({ content: `✅ Reacting ${emoji} on that message now grants ${role}.`, ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: `❌ Could not find that message in this channel, or invalid emoji.`, ephemeral: true });
      }
    }
  }
];
