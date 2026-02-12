import { NextRequest, NextResponse } from 'next/server';
import { TICKET_EVENTS, ticketBus } from '../../../../utils/event-bus';
import { createMessage } from '../../../../utils/feishu';
import { prisma } from '../../../../v11-database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, content, userName } = body;

    if (!userId || !content) {
      return NextResponse.json({ error: 'Missing userId or content' }, { status: 400 });
    }

    // Generate a business ticket ID (e.g. #20240130-001)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const ticketIdStr = `#${dateStr}-${String(count + 1).padStart(3, '0')}`;

    // Create ticket in DB
    const ticket = await prisma.ticket.create({
      data: {
        ticketId: ticketIdStr,
        userId: userId,
        content: content,
        status: 'open',
        messages: {
          create: {
            sender: 'user',
            content: content,
            type: 'text',
          },
        },
      },
    });

    // Notify Frontend via SSE
    ticketBus.emit(TICKET_EVENTS.UPDATED, { userId, ticketId: ticket.id });

    // Create Lark card
    const cardContent = {
      config: { wide_screen_mode: true },
      header: {
        template: 'blue',
        title: { content: `🆕 待处理: ${ticketIdStr}`, tag: 'plain_text' },
      },
      elements: [
        {
          fields: [
            { is_short: true, text: { content: `**用户:** ${userName || userId}`, tag: 'lark_md' } },
            { is_short: true, text: { content: `**当前状态:** ⏳ 等待接单`, tag: 'lark_md' } },
          ],
          tag: 'div',
        },
        { tag: 'hr' },
        { content: `**问题描述:**\n${content}`, tag: 'markdown' },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { content: '✍️ 接单处理', tag: 'plain_text' },
              type: 'primary',
              value: {
                action: 'reply_user',
                ticket_id: ticket.id, // Use internal UUID for callback
              },
            },
            {
              tag: 'button',
              text: { content: '✅ 标记结单', tag: 'plain_text' },
              type: 'default',
              value: {
                action: 'close_ticket',
                ticket_id: ticket.id,
              },
            },
          ],
        },
      ],
    };

    // Send to Lark Group
    // Assuming LARK_TICKET_GROUP_ID is set in env
    const groupId = process.env.LARK_TICKET_GROUP_ID || 'oc_567030b4e34257cb37e08c2f1e43496d';
    console.log(`Trying to send Lark Card. Group ID: ${groupId || 'MISSING'}`);

    if (groupId) {
      try {
        const larkMsg = await createMessage(groupId, 'interactive', cardContent, 'chat_id');
        console.log('Lark Message Result:', larkMsg);

        if (larkMsg.code === 0 && larkMsg.data?.message_id) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { feishuThreadId: larkMsg.data.message_id },
          });
        } else {
          console.error('Failed to send Lark message:', JSON.stringify(larkMsg));
        }
      } catch (e) {
        console.error('Error sending Lark message:', e);
      }
    } else {
      console.warn('⚠️ LARK_TICKET_GROUP_ID not set, skipping Feishu notification.');
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
