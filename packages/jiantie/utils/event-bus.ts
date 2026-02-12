import { EventEmitter } from 'events';

// Global event bus for Ticket updates
// Note: This only works in a single-process environment (e.g. 'next dev', 'next start').
// For serverless/clustered environments, use Redis Pub/Sub.

export const TICKET_EVENTS = {
  UPDATED: 'ticket_updated', // Status change, new message, etc.
};

// 挂载到 globalThis 确保在 Next.js dev 热更新 / 不同 route handler 之间共享同一实例
const globalForTicketBus = globalThis as typeof globalThis & {
  __ticketBus?: EventEmitter;
};

if (!globalForTicketBus.__ticketBus) {
  globalForTicketBus.__ticketBus = new EventEmitter();
  globalForTicketBus.__ticketBus.setMaxListeners(100); // 避免多连接时的 warning
}

export const ticketBus = globalForTicketBus.__ticketBus;
