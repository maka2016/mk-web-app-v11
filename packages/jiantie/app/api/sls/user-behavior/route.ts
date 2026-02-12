import { NextRequest, NextResponse } from 'next/server';
import { queryV11SlsLogs } from '@/server/utils/sls';
import { prisma } from '@mk/jiantie/v11-database';

export const runtime = 'nodejs'; // 必须使用 Node.js runtime，因为 @alicloud/sls20201230 包含原生绑定
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const appid = searchParams.get('appid');
    const eventTypesParam = searchParams.get('eventTypes');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    // 验证必需参数
    if (!uid) {
      return NextResponse.json({ error: '缺少必需参数: uid' }, { status: 400 });
    }

    const uidNum = parseInt(uid, 10);
    if (isNaN(uidNum)) {
      return NextResponse.json({ error: 'uid 必须是数字' }, { status: 400 });
    }

    // 解析可选参数
    const eventTypes = eventTypesParam
      ? eventTypesParam
          .split(',')
          .filter((et): et is 'click' | 'page_view' | 'success' =>
            ['click', 'page_view', 'success'].includes(et)
          )
      : ['click', 'page_view', 'success'];

    // 如果没有提供时间范围，默认查询最近30天
    const now = Math.floor(Date.now() / 1000);
    const defaultFrom = now - 30 * 24 * 60 * 60; // 30天前
    const queryFrom = fromParam ? parseInt(fromParam, 10) : defaultFrom;
    const queryTo = toParam ? parseInt(toParam, 10) : now;
    const limit = limitParam ? parseInt(limitParam, 10) : 1000;

    // 计算时间范围（用于查询订单）
    const queryFromDate = new Date(queryFrom * 1000);
    const queryToDate = new Date(queryTo * 1000);

    // 构建查询条件
    const conditions: string[] = [];

    // uid 条件
    conditions.push(`uid: ${uidNum}`);

    // appid 条件（如果提供）
    if (appid) {
      conditions.push(`app_id: "${appid}"`);
    }

    // event 类型条件
    if (eventTypes && eventTypes.length > 0) {
      const eventConditions = eventTypes
        .map(et => `event: "${et}"`)
        .join(' or ');
      conditions.push(`(${eventConditions})`);
    }

    // 构建查询语句
    const whereClause = conditions.join(' and ');
    const query = `${whereClause} | SELECT uid, event, page_type, page_id, ref_page_id, object_type, object_id, url, platform, __time__ as time LIMIT ${limit}`;

    // 并行查询 SLS 日志和订单记录
    const [logs, orderRecords] = await Promise.all([
      // 查询 SLS 日志
      queryV11SlsLogs({
        query,
        from: queryFrom,
        to: queryTo,
        reverse: true, // 按时间倒序
      }),
      // 查询订单记录
      prisma.orderRecordEntity.findMany({
        where: {
          uid: uidNum,
          deleted: false,
          payment_time: {
            gte: queryFromDate,
            lte: queryToDate,
          },
          ...(appid ? { appid } : {}),
        },
        select: {
          order_id: true,
          payment_time: true,
          payment_type: true,
          work_id: true,
          ref_page_type: true,
          ref_page_id: true,
        },
        orderBy: {
          payment_time: 'desc',
        },
        take: limit, // 限制数量
      }),
    ]);

    // 格式化 SLS 日志数据
    const formattedLogs = logs.map(({ raw }) => ({
      uid: raw.uid ? Number(raw.uid) : null,
      event: raw.event || '',
      pageType: raw.page_type || null,
      pageId: raw.page_id || null,
      refPageId: raw.ref_page_id || null,
      parentId: raw.parent_id || null,
      objectType: raw.object_type || null,
      objectId: raw.object_id || null,
      url: raw.url || null,
      platform: raw.platform || null,
      time: raw.time ? new Date(raw.time * 1000).toISOString() : null,
      raw: raw, // 保留原始数据以便调试
    }));

    // 将订单记录转换为行为日志格式
    const orderLogs = orderRecords.map(order => ({
      uid: uidNum,
      event: 'order_paid',
      pageType: order.ref_page_type || null,
      pageId: order.ref_page_id || null,
      refPageId: null,
      parentId: order.work_id || null,
      objectType: 'order',
      objectId: order.order_id || null,
      url: null,
      platform: null,
      time: order.payment_time.toISOString(),
      raw: {
        event: 'order_paid',
        page_type: order.ref_page_type,
        page_id: order.ref_page_id,
        object_type: 'order',
        object_id: order.order_id,
        payment_type: order.payment_type,
        work_id: order.work_id,
      },
    }));

    // 合并日志和订单，按时间倒序排序
    const allLogs = [...formattedLogs, ...orderLogs].sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    // 限制返回数量
    const limitedLogs = allLogs.slice(0, limit);

    return NextResponse.json({
      logs: limitedLogs,
      total: allLogs.length,
    });
  } catch (error) {
    console.error('查询用户行为日志失败:', error);
    return NextResponse.json(
      {
        error: '查询失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
