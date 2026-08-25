export type ProactiveGreetingSession = {
  visitorSession: boolean | null;
  proactiveGreetingSent: boolean | null;
  status: string | null;
};

export type ProactiveGreetingMessage = {
  from: string;
};

/**
 * Determines whether a newly connected visitor socket needs the persisted
 * proactive-open signal replayed. The greeting itself is loaded by the widget
 * from the normal messages endpoint after the signal opens it.
 */
export function hasReplayableProactiveGreeting(
  session: ProactiveGreetingSession | null | undefined,
  messages: ProactiveGreetingMessage[],
): boolean {
  return Boolean(
    session?.visitorSession &&
    session.proactiveGreetingSent &&
    session.status === "active" &&
    messages.some((message) => message.from === "ai"),
  );
}

export function greetingDelayToMilliseconds(greetingDelaySeconds?: number): number {
  return (greetingDelaySeconds ?? 8) * 1000;
}