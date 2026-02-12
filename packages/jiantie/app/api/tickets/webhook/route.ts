import { NextRequest, NextResponse } from 'next/server';
import { TICKET_EVENTS, ticketBus } from '../../../../utils/event-bus';
import { replyMessage } from '../../../../utils/feishu';
import { prisma } from '../../../../v11-database';

// 事件订阅 v2.0 卡片回调的响应格式：通过 response body 更新卡片
function cardActionResponse(cardData: Record<string, unknown>) {
  return NextResponse.json({
    card: {
      type: 'raw',
      data: cardData,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

  // URL Verification
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Encrypt check omitted for simplicity, but should be done in prod

  // 1. Card Action (Button Click) - 事件订阅 v2.0 格式
  if (body.header?.event_type === 'card.action.trigger') {
    const action = body.event?.action?.value?.action;
    const ticketId = body.event?.action?.value?.ticket_id;
    const operatorId = body.event?.operator?.open_id;

    if (action === 'reply_user') {
      // Staff takes the ticket
      // Update DB status -> processing
      // Update Card -> Green

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'processing',
          ownerOpenId: operatorId,
        },
      });

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return NextResponse.json({});

      // Notify Frontend
      ticketBus.emit(TICKET_EVENTS.UPDATED, { userId: ticket.userId, ticketId: ticket.id });

      const newCard = {
        config: { wide_screen_mode: true },
        header: {
          template: 'green',
          title: { content: `🟢 处理中: ${ticket.ticketId}`, tag: 'plain_text' },
        },
        elements: [
          {
            fields: [
              { is_short: true, text: { content: `**用户:** ${ticket.userId}`, tag: 'lark_md' } },
              { is_short: true, text: { content: `**当前状态:** ⚡ 处理中 (客服: ${operatorId})`, tag: 'lark_md' } },
            ],
            tag: 'div',
          },
          { tag: 'hr' },
          { content: `**问题描述:**\n${ticket.content}`, tag: 'markdown' },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { content: '✅ 标记结单', tag: 'plain_text' },
                type: 'default',
                value: { action: 'close_ticket', ticket_id: ticketId },
              },
            ],
          },
        ],
      };

      // 在话题中通知
      if (ticket.feishuThreadId) {
        replyMessage(ticket.feishuThreadId, 'text', { text: `客服 ${operatorId} 已接单` });
      }

      // 通过 response 更新卡片（v2.0 格式）
      return cardActionResponse(newCard);
    }

    if (action === 'close_ticket') {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'resolved' },
      });
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return NextResponse.json({});

      // Notify Frontend
      ticketBus.emit(TICKET_EVENTS.UPDATED, { userId: ticket.userId, ticketId: ticket.id });

      // 通过 response 更新卡片为灰色（v2.0 格式）
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
              { is_short: true, text: { content: `**当前状态:** ✅ 已解决`, tag: 'lark_md' } },
            ],
            tag: 'div',
          },
          { tag: 'hr' },
          { content: `**问题描述:**\n${ticket.content}`, tag: 'markdown' },
        ],
      };

      return cardActionResponse(newCard);
    }
  }

  // 2. Message Event (Staff replies in thread)
  // body.header.event_type === 'im.message.receive_v1'
  if (body.header && body.header.event_type === 'im.message.receive_v1') {
    const message = body.event.message;
    const parentId = message.parent_id;
    const senderType = body.event.sender.sender_type;

    if (parentId && senderType === 'user') {
      // 'user' in Lark means the lark user (staff)
      // Check if this parent_id corresponds to a ticket
      const ticket = await prisma.ticket.findFirst({
        where: { feishuThreadId: parentId },
      });

      if (ticket) {
        const contentJson = JSON.parse(message.content);
        const text = contentJson.text;

        // Scheme B: /c prefix
        if (text && text.startsWith('/c ')) {
          const replyContent = text.substring(3);

          // Save to DB so user can see it
          await prisma.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              sender: 'support',
              content: replyContent,
              type: 'text',
              feishuMsgId: message.message_id,
            },
          });

          // Notify Frontend
          ticketBus.emit(TICKET_EVENTS.UPDATED, { userId: ticket.userId, ticketId: ticket.id });
        }
        // If text starts with /r, close ticket and comment
        if (text && text.startsWith('/r ')) {
          const comment = text.substring(3);
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: 'resolved' },
          });

          await prisma.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              sender: 'support',
              content: `(工单已解决) ${comment}`,
              type: 'text',
              feishuMsgId: message.message_id,
            },
          });

          // Notify Frontend
          ticketBus.emit(TICKET_EVENTS.UPDATED, { userId: ticket.userId, ticketId: ticket.id });

          // Should also update card to Grey, but complex to trigger here without async logic or copying code.
          // For MVP, we skip card update on /r or user can click button.
        }
      }
    }
    return NextResponse.json({ code: 0 });
  }

  return NextResponse.json({});
}
