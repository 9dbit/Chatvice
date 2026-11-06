import { describe, it, expect } from 'vitest';
import { getConversationOutcomes } from '../conversation-outcomes';
import { stripBase64Photos } from '../response-sanitizer';
import type { Session, Message } from '@shared/schema';
const session = (id: string, overrides = {}) => ({ id, mode: 'AI', status: 'ended', ...overrides } as Session);
const chat = (id: string, error = false) => [
  { sessionId: id, from: 'customer', content: 'Help', timestamp: new Date(1000) },
  { sessionId: id, from: 'chatvice', content: error ? "I'm experiencing some technical difficulties. Please try again in a moment." : 'Here is how to proceed', timestamp: new Date(2000) },
] as Message[];
describe('truthful conversation outcomes', () => {
  it('does not equate AI mode or an initial greeting with successful resolution', () => {
    const result = getConversationOutcomes([session('active', { status: 'active' }), session('failed'), session('done'), session('visitor', { visitorSession: true }), session('empty')], [...chat('active'), ...chat('failed', true), ...chat('done'), ...chat('visitor')]);
    expect(result.conversations).toHaveLength(3);
    expect(result.aiResolved).toBe(1);
    expect(result.aiResolutionRate).toBe(33);
    expect(result.satisfactionRate).toBeNull();
  });
  it('rejects unanswered, human-assisted and previously failed sessions', () => {
    const unanswered = [...chat('unanswered'), { sessionId: 'unanswered', from: 'customer', content: 'One more question', timestamp: new Date(3000) } as Message];
    const result = getConversationOutcomes([session('unanswered'), session('human', { supervisorId: 'sup1' }), session('recovered')], [...unanswered, ...chat('human'), ...chat('recovered', true), ...chat('recovered')]);
    expect(result.aiResolved).toBe(0);
  });
  it('uses customer ratings for satisfaction rather than the handling mode', () => {
    const result = getConversationOutcomes([session('good', { customerRating: 5 }), session('bad', { customerRating: 2 })], [...chat('good'), ...chat('bad')]);
    expect(result.aiResolutionRate).toBe(100);
    expect(result.satisfactionRate).toBe(50);
  });
});
it('preserves nested API dates while stripping large inline images', () => {
  const stamp = new Date('2026-11-06T10:00:00Z');
  const result = JSON.parse(JSON.stringify(stripBase64Photos({ createdAt: stamp, nested: [{ date: stamp, photo: 'data:image/png;base64,' + 'x'.repeat(300) }] })));
  expect(result.createdAt).toBe(stamp.toISOString());
  expect(result.nested[0]).toEqual({ date: stamp.toISOString(), photo: '' });
});
