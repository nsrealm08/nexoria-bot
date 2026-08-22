async function safeDM(user, payload) {
  try {
    await user.send(payload);
    return true;
  } catch {
    return false; // DMs closed, bot blocked, or user left — not an error worth logging
  }
}

module.exports = { safeDM };
