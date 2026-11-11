// Email for local development and tests ONLY: nothing is sent. Each message is kept in `sent` (tests read it)
// and handed to `onSend` (the local run prints it).
export function createOutboxMailer({ onSend } = {}) {
  const sent = [];
  return {
    sent,
    async send(m) {
      sent.push(m);
      if (onSend) onSend(m);
    },
  };
}
