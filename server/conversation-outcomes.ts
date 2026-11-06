import type { Message, Session } from '@shared/schema';

// Legacy provider failures were persisted as ordinary text messages.
export function isFailedAIResponse(message: Pick<Message, 'from' | 'content' | 'payload'>): boolean {
  const payload = message.payload as { aiError?: boolean } | null;
  return message.from === 'chatvice' && (payload?.aiError === true ||
    /^(I'm experiencing some technical difficulties\.|I'm sorry, I couldn't process your request\.|Maaf, layanan AI sedang mengalami gangguan\.)/.test(message.content));
}

// An AI-mode session is not proof of resolution: it must have ended, have a
// customer question followed by an AI answer, and contain no failed reply.
export function getConversationOutcomes(sessions: Session[], messages: Message[]) {
  const grouped = new Map<string, Message[]>();
  for (const message of messages) {
    const group = grouped.get(message.sessionId) || [];
    group.push(message);
    grouped.set(message.sessionId, group);
  }
  const conversations = sessions.filter(s => !s.visitorSession &&
    (grouped.get(s.id) || []).some(m => m.from === 'customer' || m.from === 'user'));
  const resolvedIds = new Set<string>();
  for (const session of conversations) {
    if (session.mode !== 'AI' || session.supervisorId || session.needsSupervisorAttention ||
      !['ended', 'closed', 'finished', 'resolved'].includes(session.status || '')) continue;
    const history = [...(grouped.get(session.id) || [])].sort((a, b) =>
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
    if (history.some(isFailedAIResponse)) continue;
    let awaitingReply = false;
    let answered = false;
    let humanReply = false;
    for (const message of history) {
      if (message.from === 'customer' || message.from === 'user') awaitingReply = true;
      else if (message.from === 'chatvice' && message.content.trim() && awaitingReply) {
        awaitingReply = false;
        answered = true;
      } else if (message.from === 'supervisor' || message.from === 'human') humanReply = true;
    }
    if (answered && !awaitingReply && !humanReply) resolvedIds.add(session.id);
  }
  const rated = conversations.filter(s => s.customerRating != null && s.customerRating >= 1 && s.customerRating <= 5);
  return {
    conversations,
    resolvedIds,
    aiResolved: resolvedIds.size,
    aiResolutionRate: conversations.length ? Math.round(resolvedIds.size / conversations.length * 100) : 0,
    satisfactionRate: rated.length ? Math.round(rated.filter(s => s.customerRating! >= 4).length / rated.length * 100) : null,
  };
}
