import { NextRequest, NextResponse } from 'next/server';
import { TICKET_EVENTS, ticketBus } from '../../../../utils/event-bus';
import { patchMessage, replyMessage } from '../../../../utils/feishu';
import { prisma } from '../../../../v11-database';

export async function POST(req: NextRequest) {
  const { ticketId, score, comment } = await req.json();

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'rated',
      satisfactionScore: score,
      satisfactionComment: comment,
    },
  });

  // Notify Frontend
  ticketBus.emit(TICKET_EVENTS.UPDATED, { userId: ticket.userId, ticketId: ticket.id });

  if (ticket.feishuThreadId) {
    // 1. Notify in thread
    await replyMessage(ticket.feishuThreadId, 'text', {
      text: `🌟 用户已评价： ${score}分 - ${comment || '无备注'}`,
    });

    // 2. Update Card (Archive)
    const newCard = {
      config: { wide_screen_mode: true },
      header: {
        template: 'grey',
        title: { content: `⚪ 已解决: ${ticket.ticketId}`, tag: 'plain_text' },
      },
      elements: [
        {
          fields: [
            { is_short: true, text: { content: `**用户:** ${ticket.userId}`, tag: 'lark_md' } },
            { is_short: true, text: { content: `**当前状态:** ⭐ 已评价 (${score}分)`, tag: 'lark_md' } },
          ],
          tag: 'div',
        },
        { tag: 'hr' },
        { content: `**问题描述:**\n${ticket.content}`, tag: 'markdown' },
        { tag: 'hr' },
        { content: `**最终评分:** ${'⭐'.repeat(score)} ${comment || ''}`, tag: 'markdown' },
      ],
    };

    await patchMessage(ticket.feishuThreadId, newCard);
  }

  return NextResponse.json({ success: true });
}
