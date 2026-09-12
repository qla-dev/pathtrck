/** Detail responses contain chronological messages; list previews arrive newest first. */
export function lenaConversationMessages(row: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(row.messages)) return row.messages;
  if (Array.isArray(row.recent_messages)) return [...row.recent_messages].reverse();
  return [];
}
