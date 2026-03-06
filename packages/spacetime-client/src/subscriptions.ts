export function roomMessagesSubscription(roomId: string): string {
  return `SELECT * FROM messages WHERE roomId = '${roomId}'`;
}

export function dmSubscription(conversationKey: string): string {
  return `SELECT * FROM dmMessages WHERE conversationKey = '${conversationKey}'`;
}

export function presenceSubscription(): string {
  return "SELECT * FROM presence";
}
