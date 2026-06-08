export type TableChatMessage = {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  avatar?: string | null;
  text: string;
  at: number;
};
