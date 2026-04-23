// Anti-spam simples: dedupe por messageId + debounce por conversa.
const recentMessageIds = new Set<string>();
const lastProcessedByConversation = new Map<string, number>();

const DEDUPE_WINDOW_MS = 60_000;
const DEBOUNCE_MS = 1500;

export function alreadyProcessed(messageId: string): boolean {
  if (recentMessageIds.has(messageId)) return true;
  recentMessageIds.add(messageId);
  setTimeout(() => recentMessageIds.delete(messageId), DEDUPE_WINDOW_MS);
  return false;
}

export function shouldDebounce(conversationId: string): boolean {
  const now = Date.now();
  const last = lastProcessedByConversation.get(conversationId) ?? 0;
  if (now - last < DEBOUNCE_MS) return true;
  lastProcessedByConversation.set(conversationId, now);
  return false;
}
