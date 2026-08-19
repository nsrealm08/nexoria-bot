const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder
} = require('discord.js');
const { pool } = require('../database');

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
      await pool.query(
        `INSERT INTO settings (guild_id, welcome_channel, welcome_msg) VALUES ($1,$2,$3)
         ON CONFLICT (guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, welcome_msg=excluded.welcome_msg`,
        [interaction.guild.id, channel.id, message]);
      await interaction.reply({ content: `✅ Welcome messages will post in ${channel}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setlogchannel').setDescription('Set the channel for moderation case logs')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      await pool.query(
        `INSERT INTO settings (guild_id, log_channel) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET log_channel=excluded.log_channel`,
        [interaction.guild.id, channel.id]);
      await interaction.reply({ content: `✅ Mod actions & errors will log to ${channel}.`, ephemeral: true });
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
      .setName('reactionrole').setDescription('Add a single reaction role to an existing message')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID (in this channel)').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant').setRequired(true))
      .addStringOption(o => o.setName('group').setDescription('Optional group name (for exclusive sets)'))
      .addBooleanOption(o => o.setName('exclusive').setDescription('Only one role from this group at a time?'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const messageId = interaction.options.getString('message_id');
      const emoji = interaction.options.getString('emoji');
      const role = interaction.options.getRole('role');
      const group = interaction.options.getString('group') || null;
      const exclusive = interaction.options.getBoolean('exclusive') || false;
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        await message.react(emoji);
        await pool.query(
          `INSERT INTO reaction_roles (message_id, emoji, role_id, guild_id, group_name, exclusive)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (message_id, emoji) DO UPDATE SET role_id=excluded.role_id, group_name=excluded.group_name, exclusive=excluded.exclusive`,
          [messageId, emoji, role.id, interaction.guild.id, group, exclusive]);
        await interaction.reply({ content: `✅ Reacting ${emoji} on that message now grants ${role}.`, ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: `❌ Could not find that message in this channel, or invalid emoji.`, ephemeral: true });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('reactionrole-panel').setDescription('Post a full reaction-role embed with up to 5 role/emoji pairs')
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(o => o.setName('emoji1').setDescription('Emoji 1').setRequired(true))
      .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
      .addStringOption(o => o.setName('emoji2').setDescription('Emoji 2'))
      .addRoleOption(o => o.setName('role2').setDescription('Role 2'))
      .addStringOption(o => o.setName('emoji3').setDescription('Emoji 3'))
      .addRoleOption(o => o.setName('role3').setDescription('Role 3'))
      .addStringOption(o => o.setName('emoji4').setDescription('Emoji 4'))
      .addRoleOption(o => o.setName('role4').setDescription('Role 4'))
      .addStringOption(o => o.setName('emoji5').setDescription('Emoji 5'))
      .addRoleOption(o => o.setName('role5').setDescription('Role 5'))
      .addBooleanOption(o => o.setName('exclusive').setDescription('Only one role from this panel at a time?'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const exclusive = interaction.options.getBoolean('exclusive') || false;
      const groupName = `panel-${Date.now()}`;

      const pairs = [];
      for (let i = 1; i <= 5; i++) {
        const emoji = interaction.options.getString(`emoji${i}`);
        const role = interaction.options.getRole(`role${i}`);
        if (emoji && role) pairs.push({ emoji, role });
      }
      if (!pairs.length) return interaction.reply({ content: '❌ Provide at least one emoji/role pair.', ephemeral: true });

      const lines = pairs.map(p => `${p.emoji} — <@&${p.role.id}>`).join('\n');
      const embed = new EmbedBuilder().setColor('Red').setTitle(title).setDescription(`${description}\n\n${lines}`);
      const message = await interaction.channel.send({ embeds: [embed] });

      for (const p of pairs) {
        await message.react(p.emoji);
        await pool.query(
          `INSERT INTO reaction_roles (message_id, emoji, role_id, guild_id, group_name, exclusive)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (message_id, emoji) DO NOTHING`,
          [message.id, p.emoji, p.role.id, interaction.guild.id, groupName, exclusive]);
      }
      await interaction.reply({ content: `✅ Reaction-role panel posted with ${pairs.length} option(s).`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('rolemenu').setDescription('Post a dropdown menu for self-service roles (up to 5 options)')
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
      .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
      .addStringOption(o => o.setName('label1').setDescription('Label for role 1').setRequired(true))
      .addRoleOption(o => o.setName('role2').setDescription('Role 2'))
      .addStringOption(o => o.setName('label2').setDescription('Label for role 2'))
      .addRoleOption(o => o.setName('role3').setDescription('Role 3'))
      .addStringOption(o => o.setName('label3').setDescription('Label for role 3'))
      .addRoleOption(o => o.setName('role4').setDescription('Role 4'))
      .addStringOption(o => o.setName('label4').setDescription('Label for role 4'))
      .addRoleOption(o => o.setName('role5').setDescription('Role 5'))
      .addStringOption(o => o.setName('label5').setDescription('Label for role 5'))
      .addBooleanOption(o => o.setName('exclusive').setDescription('Only one role from this menu at a time?'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const exclusive = interaction.options.getBoolean('exclusive') || false;

      const options = [];
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`role${i}`);
        const label = interaction.options.getString(`label${i}`);
        if (role && label) options.push({ role, label });
      }
      if (!options.length) return interaction.reply({ content: '❌ Provide at least one role/label pair.', ephemeral: true });

      const embed = new EmbedBuilder().setColor('Red').setTitle(title).setDescription(description);
      const menu = new StringSelectMenuBuilder()
        .setCustomId('nexoria-rolemenu')
        .setPlaceholder('Choose your role(s)')
        .setMinValues(0)
        .setMaxValues(exclusive ? 1 : options.length)
        .addOptions(options.map(o => ({ label: o.label, value: o.role.id })));

      const message = await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });

      await pool.query(
        `INSERT INTO role_menus (message_id, guild_id, channel_id, exclusive) VALUES ($1,$2,$3,$4)
         ON CONFLICT (message_id) DO UPDATE SET exclusive=excluded.exclusive`,
        [message.id, interaction.guild.id, interaction.channel.id, exclusive]);
      for (const o of options) {
        await pool.query(
          `INSERT INTO role_menu_options (message_id, role_id, label) VALUES ($1,$2,$3)
           ON CONFLICT (message_id, role_id) DO UPDATE SET label=excluded.label`,
          [message.id, o.role.id, o.label]);
      }
      await interaction.reply({ content: `✅ Role menu posted with ${options.length} option(s).`, ephemeral: true });
    }
  }
];
