import { NextRequest, NextResponse } from 'next/server';
import { ticketBus, TICKET_EVENTS } from '../../../../utils/event-bus';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE event
      const sendEvent = (data: any) => {
        const msg = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(msg));
      };

      // 1. Send initial connection success
      sendEvent({ type: 'connected' });

      // 2. Listen for updates
      const onUpdate = (data: any) => {
        // Only notify if it affects this user
        if (data.userId === userId) {
          sendEvent({ type: 'update', ticketId: data.ticketId });
        }
      };

      ticketBus.on(TICKET_EVENTS.UPDATED, onUpdate);

      // 3. Keep-alive (Heartbeat) every 30s to prevent timeout
      const heartbeat = setInterval(() => {
        const msg = `: heartbeat\n\n`;
        controller.enqueue(encoder.encode(msg));
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        ticketBus.off(TICKET_EVENTS.UPDATED, onUpdate);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
