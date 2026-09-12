import type { Session } from "@shared/schema";

export interface SessionAttentionStorage {
  updateSession(id: string, data: Partial<Session>): Promise<Session | undefined>;
  markNotificationsSeenBySession(sessionId: string): Promise<number>;
}

export async function resolveSessionAttention(
  storage: SessionAttentionStorage,
  sessionId: string,
  updates: Partial<Session> = {},
): Promise<Session | undefined> {
  const [updatedSession] = await Promise.all([
    storage.updateSession(sessionId, {
      ...updates,
      needsSupervisorAttention: false,
    }),
    storage.markNotificationsSeenBySession(sessionId),
  ]);

  return updatedSession;
}

export function canSessionRequireAttention(status: string | null | undefined): boolean {
  return !["ended", "closed", "archived"].includes(status || "active");
}