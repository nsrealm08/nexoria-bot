const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { FakeInteraction } = require('./fakeInteraction');
const { tokenize, resolveOption } = require('./prefixParser');

// Commands that need real Discord-interaction machinery (modals, component
// interactions) or that only make sense triggered by a button/DM, not typed
// directly. Everything else — including moderation — is available via
// prefix, gated by the same setDefaultMemberPermissions each command
// already declares for its slash version.
const EXCLUDED = new Set(['setstatus']); // owner-only global control; kept slash-only to avoid accidental typos changing bot-wide presence

async function handle(message, prefix) {
  const withoutPrefix = message.content.slice(prefix.length).trim();
  const tokens = tokenize(withoutPrefix);
  const commandName = (tokens.shift() || '').toLowerCase();
  if (!commandName) return false;

  if (commandName === 'help') {
    const names = [...message.client.commands.keys()].filter(n => !EXCLUDED.has(n)).sort();
    await message.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('Prefix commands')
      .setDescription(`Every slash command works here too — just use \`${prefix}\` instead of \`/\`.\n\n${names.map(n => `\`${prefix}${n}\``).join(', ')}`)] });
    return true;
  }

  const command = message.client.commands.get(commandName);
  if (!command || EXCLUDED.has(commandName)) return false;

  const requiredPerms = command.data.default_member_permissions;
  if (requiredPerms && !message.member.permissions.has(BigInt(requiredPerms))) {
    await message.reply('❌ You don\'t have permission to use this command.');
    return true;
  }

  let optionDefs = command.data.options || [];
  let subcommand = null;

  if (optionDefs.length && optionDefs[0].type === ApplicationCommandOptionType.Subcommand) {
    const subToken = (tokens.shift() || '').toLowerCase();
    const subDef = optionDefs.find(o => o.name === subToken);
    if (!subDef) {
      await message.reply(`❌ Unknown subcommand. Try: ${optionDefs.map(o => `\`${o.name}\``).join(', ')}`);
      return true;
    }
    subcommand = subDef.name;
    optionDefs = subDef.options || [];
  }

  const resolved = new Map();
  for (let i = 0; i < optionDefs.length; i++) {
    const def = optionDefs[i];
    const isTrailingString = def.type === ApplicationCommandOptionType.String && i === optionDefs.length - 1;
    const rawValue = isTrailingString ? tokens.slice(i).join(' ') : tokens[i];

    if (!rawValue) {
      if (def.required) {
        await message.reply(`❌ Missing required option: \`${def.name}\`. Try \`${prefix}help\` or use the slash command for guidance on each field.`);
        return true;
      }
      continue;
    }

    const value = await resolveOption(rawValue, def.type, message);
    const needsResolve = [ApplicationCommandOptionType.User, ApplicationCommandOptionType.Role, ApplicationCommandOptionType.Channel].includes(def.type);
    if (needsResolve && !value) {
      await message.reply(`❌ Couldn't resolve \`${def.name}\` — mention it or use a valid ID.`);
      return true;
    }
    resolved.set(def.name, value);
  }

  const fakeInteraction = new FakeInteraction(message, commandName, subcommand, resolved);
  try {
    await command.execute(fakeInteraction);
  } catch (err) {
    console.error(`Prefix command "${commandName}" error:`, err);
    await message.reply('❌ Something went wrong running that command.').catch(() => {});
  }
  return true;
}

module.exports = { handle };
