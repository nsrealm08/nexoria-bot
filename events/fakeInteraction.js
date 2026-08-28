// Mimics just enough of discord.js's CommandInteraction surface for every
// existing command's execute(interaction) to run unmodified from a plain
// text message. Ephemeral has no equivalent for normal messages, so it's
// silently dropped rather than causing an error.

class FakeInteraction {
  constructor(message, commandName, subcommand, optionsMap) {
    this._message = message;
    this._replyMessage = null;

    this.user = message.author;
    this.member = message.member;
    this.guild = message.guild;
    this.channel = message.channel;
    this.client = message.client;
    this.memberPermissions = message.member.permissions;
    this.commandName = commandName;
    this.replied = false;
    this.deferred = false;

    const opts = optionsMap;
    this.options = {
      getString: (name) => (opts.has(name) ? String(opts.get(name)) : null),
      getInteger: (name) => (opts.has(name) ? Math.trunc(Number(opts.get(name))) : null),
      getNumber: (name) => (opts.has(name) ? Number(opts.get(name)) : null),
      getBoolean: (name) => (opts.has(name) ? Boolean(opts.get(name)) : null),
      getUser: (name) => opts.get(name) ?? null,
      getRole: (name) => opts.get(name) ?? null,
      getChannel: (name) => opts.get(name) ?? null,
      getSubcommand: () => subcommand
    };
  }

  static _strip(payload) {
    const normalized = typeof payload === 'string' ? { content: payload } : { ...payload };
    delete normalized.ephemeral;
    delete normalized.fetchReply;
    delete normalized.withResponse;
    return normalized;
  }

  async reply(payload) {
    const wantsResource = typeof payload === 'object' && payload?.withResponse;
    const sent = await this._message.reply(FakeInteraction._strip(payload));
    this.replied = true;
    this._replyMessage = sent;
    return wantsResource ? { resource: { message: sent } } : sent;
  }

  async deferReply() {
    const sent = await this._message.reply('⏳ Working on it...');
    this.deferred = true;
    this._replyMessage = sent;
    return sent;
  }

  async editReply(payload) {
    const normalized = FakeInteraction._strip(payload);
    if (this._replyMessage) return this._replyMessage.edit(normalized);
    const sent = await this._message.reply(normalized);
    this._replyMessage = sent;
    return sent;
  }

  async followUp(payload) {
    return this._message.channel.send(FakeInteraction._strip(payload));
  }

  async update(payload) {
    return this.editReply(payload);
  }
}

module.exports = { FakeInteraction };
