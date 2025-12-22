
import { WebSocket } from "ws";
import { storage } from "./storage";

// In-memory pub/sub (upgrade to Redis for production multi-instance)
class MessageBroker {
  private subscribers = new Map<string, Set<(data: any) => void>>();

  subscribe(channel: string, callback: (data: any) => void): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);
  }

  unsubscribe(channel: string, callback: (data: any) => void): void {
    this.subscribers.get(channel)?.delete(callback);
  }

  publish(channel: string, data: any): void {
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const broker = new MessageBroker();

export function broadcastToSessionCluster(sessionId: string, data: any): void {
  // Publish to message broker for cross-instance delivery
  broker.publish(`session:${sessionId}`, {
    sessionId,
    data,
    timestamp: Date.now(),
  });
}

// For production: Replace with Redis
// import { createClient } from 'redis';
// const redisClient = createClient({ url: process.env.REDIS_URL });
// await redisClient.connect();
// await redisClient.publish(`session:${sessionId}`, JSON.stringify(data));
