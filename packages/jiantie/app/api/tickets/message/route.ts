import { NextRequest, NextResponse } from 'next/server';
import { TICKET_EVENTS, ticketBus } from '../../../../utils/event-bus';
import { replyMessage } from '../../../../utils/feishu';
import { prisma } from '../../../../v11-database';

export async function POST(req: NextRequest) {
  const { ticketId, content, sender } = await req.json();

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  // Save message
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      sender,
      content,
      type: 'text',
    },
  });

  // Notify Frontend via SSE
  ticketBus.emit(TICKET_EVENTS.UPDATED, { userId: ticket.userId, ticketId: ticket.id });

  // Sync to Lark
  if (ticket.feishuThreadId && sender === 'user') {
    // User reply -> Reply to thread
    await replyMessage(ticket.feishuThreadId, 'text', {
      text: `(用户追加) ${content}`,
    });
  }

  return NextResponse.json({ success: true });
}
