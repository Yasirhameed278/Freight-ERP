const _outbox = [];

const send = async (msg) => {
  _outbox.push({ ...msg, sentAt: new Date() });
  return { messageId: `mock-${_outbox.length}`, accepted: [msg.to].flat() };
};

const _clear = () => { _outbox.length = 0; };

module.exports = { send, _outbox, _clear };
