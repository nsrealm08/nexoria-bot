const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { pool } = require('../database');
const { buildResultsEmbed } = require('../utils/pollResults');
const { finalizePoll } = require('../utils/scheduler');

const NUMBER_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('poll').setDescription('Run a poll')
      .addSubcommand(sc => sc.setName('create').setDescription('Create a poll')
        .addStringOption(o => o.setName('question').setDescription('The poll question').setRequired(true))
        .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
        .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
        .addStringOption(o => o.setName('option3').setDescription('Option 3'))
        .addStringOption(o => o.setName('option4').setDescription('Option 4'))
        .addStringOption(o => o.setName('option5').setDescription('Option 5'))
        .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes (default 1440 = 24h, 0 = never auto-closes)'))
        .addStringOption(o => o.setName('mode').setDescription('Voting style')
          .addChoices({ name: 'Buttons (live results)', value: 'button' }, { name: 'Reactions (native counts)', value: 'reaction' })))
      .addSubcommand(sc => sc.setName('close').setDescription('Close a poll early')
        .addStringOption(o => o.setName('message_id').setDescription('Poll message ID').setRequired(true)))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'create') {
        const question = interaction.options.getString('question');
        const options = [1, 2, 3, 4, 5]
          .map(i => interaction.options.getString(`option${i}`))
          .filter(Boolean);
        const minutes = interaction.options.getInteger('minutes') ?? 1440;
        const mode = interaction.options.getString('mode') || 'button';
        const endTime = minutes > 0 ? Date.now() + minutes * 60000 : null;

        const embed = buildResultsEmbed(question, options, options.map(() => 0), { mode });

        let message;
        if (mode === 'button') {
          const row = new ActionRowBuilder().addComponents(
            options.map((opt, i) => new ButtonBuilder()
              .setCustomId(`nexoria-poll-vote-${i}`)
              .setLabel(opt.slice(0, 78))
              .setStyle(ButtonStyle.Secondary))
          );
          message = await interaction.channel.send({ embeds: [embed], components: [row] });
        } else {
          message = await interaction.channel.send({ embeds: [embed] });
          for (let i = 0; i < options.length; i++) await message.react(NUMBER_EMOJI[i]);
        }

        await pool.query(
          'INSERT INTO polls (guild_id, channel_id, message_id, question, options, mode, end_time, ended) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE)',
          [interaction.guild.id, interaction.channel.id, message.id, question, options, mode, endTime]);

        await interaction.reply({ content: `✅ Poll created${endTime ? ` — closes <t:${Math.floor(endTime / 1000)}:R>` : ''}.`, ephemeral: true });
      }

      if (sub === 'close') {
        const messageId = interaction.options.getString('message_id');
        const { rows } = await pool.query('SELECT * FROM polls WHERE message_id=$1 AND guild_id=$2', [messageId, interaction.guild.id]);
        const poll = rows[0];
        if (!poll) return interaction.reply({ content: '❌ No poll found with that message ID.', ephemeral: true });
        if (poll.ended) return interaction.reply({ content: '❌ That poll is already closed.', ephemeral: true });

        await finalizePoll(interaction.client, poll);
        await interaction.reply({ content: '✅ Poll closed.', ephemeral: true });
      }
    }
  }
];
