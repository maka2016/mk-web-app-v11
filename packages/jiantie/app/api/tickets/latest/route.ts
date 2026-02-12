import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../v11-database';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const ticket = await prisma.ticket.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    return NextResponse.json({ ticket });
}
