const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { pool } = require('../database');
const { getRank, getLeaderboard, setLevelReward, getLevelRewards } = require('../utils/leveling');
const { buildRankCard } = require('../utils/rankCard');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('rank').setDescription('Check your (or another user\'s) level')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const row = await getRank(interaction.guild.id, user.id) || { xp: 0, level: 0 };
      await interaction.deferReply();
      const buffer = await buildRankCard(user, row);
      const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
      await interaction.editReply({ files: [attachment] });
    }
  },
  {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('Top members by level'),
    async execute(interaction) {
      const rows = await getLeaderboard(interaction.guild.id, 10);
      if (!rows.length) return interaction.reply('No data yet.');

      const medals = ['🥇', '🥈', '🥉'];
      const desc = rows.map((r, i) => {
        const rank = medals[i] || `**#${i + 1}**`;
        return `${rank}  <@${r.user_id}> — **Level ${r.level}** · ${r.xp} XP`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🏆 Leaderboard')
        .setThumbnail(interaction.guild.iconURL({ size: 128 }))
        .setDescription(desc)
        .setFooter({ text: `${interaction.guild.name} · Top ${rows.length}` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setlevelchannel').setDescription('Set channel for level-up announcements')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      await pool.query(
        `INSERT INTO settings (guild_id, level_channel) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET level_channel=excluded.level_channel`,
        [interaction.guild.id, channel.id]);
      await interaction.reply({ content: `✅ Level-up messages will post in ${channel}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setlevelreward').setDescription('Auto-grant a role when a member reaches a level')
      .addIntegerOption(o => o.setName('level').setDescription('Level required').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');
      await setLevelReward(interaction.guild.id, level, role.id);
      await interaction.reply({ content: `✅ Members reaching level **${level}** now auto-get ${role}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder().setName('levelrewards').setDescription('List configured level-reward roles'),
    async execute(interaction) {
      const rows = await getLevelRewards(interaction.guild.id);
      if (!rows.length) return interaction.reply({ content: 'No level rewards configured.', ephemeral: true });
      const desc = rows.map(r => `Level **${r.level}** → <@&${r.role_id}>`).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Blue').setTitle('Level Rewards').setDescription(desc)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('noxp').setDescription('Toggle whether a channel earns XP')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const { rows } = await pool.query('SELECT 1 FROM noxp_channels WHERE guild_id=$1 AND channel_id=$2', [interaction.guild.id, channel.id]);
      if (rows.length) {
        await pool.query('DELETE FROM noxp_channels WHERE guild_id=$1 AND channel_id=$2', [interaction.guild.id, channel.id]);
        await interaction.reply({ content: `✅ ${channel} now earns XP again.`, ephemeral: true });
      } else {
        await pool.query('INSERT INTO noxp_channels (guild_id, channel_id) VALUES ($1,$2)', [interaction.guild.id, channel.id]);
        await interaction.reply({ content: `✅ ${channel} no longer earns XP.`, ephemeral: true });
      }
    }
  }
];
