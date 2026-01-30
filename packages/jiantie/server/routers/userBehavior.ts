import mysql from 'mysql2/promise';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// BI 行为日志库（MySQL）连接池（使用 mysql2，而不是 knex）
const biPool = mysql.createPool({
  host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
  user: 'report_api',
  password: 'j3E4h6NWBQ5U-',
  database: 'mk_datawork',
});

// 订单中心库（MySQL）连接池：用于读取用户付费行为
const orderPool = mysql.createPool({
  host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
  user: 'query_prod',
  password: 'jCItnVtI0k67RBrt',
  database: 'mk_order_center',
});

type RawEventRow = {
  uid: string;
  appid?: string | null;
  event_time: Date;
  event_type: string;
  page_type?: string | null;
  page_id?: string | null;
  ref_page_id?: string | null;
  parent_id?: string | null;
  object_type?: string | null;
  object_id?: string | null;
  url?: string | null;
};

type RawOrderRow = {
  uid: number;
  amount: number;
  currency: string;
  order_status: string;
  created_at: Date;
};

export type UserBehaviorItem = {
  uid: string;
  eventTime: Date;
  eventType: string;
  pageType?: string;
  pageId?: string;
  refPageId?: string;
  parentId?: string;
  objectType?: string;
  objectId?: string;
  url?: string;
  behaviorLabel: string;
  description: string;
};

// 将原始事件行映射为前端可读的用户行为
const mapEventToBehavior = (row: RawEventRow): UserBehaviorItem => {
  const {
    uid,
    event_time,
    event_type,
    page_type,
    page_id,
    ref_page_id,
    parent_id,
    object_type,
    object_id,
    url,
  } = row;

  let behaviorLabel = '其他行为';
  let description = '';

  // 热词频道访问
  if (page_type === 'hotword_channel' && page_id) {
    behaviorLabel = '热词频道访问';
    description = `访问热词频道，频道ID：${page_id}`;
  }
  // 模板详情页
  else if (page_type === 'template_page' && page_id) {
    behaviorLabel = '模板详情访问';
    description = `查看模板详情，模板ID：${page_id}`;
  }
  // 作品预览页（viewer，page_id 为作品 ID）
  else if (page_type === 'viewer' && page_id) {
    behaviorLabel = '作品预览';
    description = `预览作品，作品ID：${page_id}`;
  }
  // 编辑器访问
  else if (page_type === 'editor_page' && parent_id) {
    behaviorLabel = '编辑器访问';
    description = `进入编辑器，作品ID：${parent_id}`;
  }
  // VIP 拦截页
  else if (
    page_type === 'vip_intercept_page' ||
    object_type === 'vip_intercept_pay'
  ) {
    behaviorLabel = 'VIP拦截页';
    description = '访问 VIP 拦截页';
  }
  // 编辑器发布按钮点击
  else if (
    event_type === 'click' &&
    object_type === 'editor_publish_btn' &&
    ref_page_id
  ) {
    behaviorLabel = '发布作品';
    description = `在编辑器中点击发布按钮，作品ID：${ref_page_id}`;
  }
  // 作品分享点击
  else if (
    event_type === 'click' &&
    object_type === 'work_share_btn' &&
    object_id
  ) {
    behaviorLabel = '分享作品';
    description = `点击作品分享按钮，作品ID：${object_id}`;
  } else {
    // 兜底描述，方便排查
    description = [
      `event_type=${event_type}`,
      page_type ? `page_type=${page_type}` : '',
      object_type ? `object_type=${object_type}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return {
    uid,
    eventTime: event_time,
    eventType: event_type,
    pageType: page_type || undefined,
    pageId: page_id || undefined,
    refPageId: ref_page_id || undefined,
    parentId: parent_id || undefined,
    objectType: object_type || undefined,
    objectId: object_id || undefined,
    url: url || undefined,
    behaviorLabel,
    description,
  };
};

// 将订单记录映射为“付费行为”
const mapOrderToBehavior = (row: RawOrderRow): UserBehaviorItem => {
  const { uid, amount, currency, order_status, created_at } = row;

  let behaviorLabel = '付费订单';
  let description = `支付订单，金额：${amount}（分），币种：${currency}`;

  if (order_status !== 'paid') {
    behaviorLabel = '订单行为';
    description = `订单状态：${order_status}，金额：${amount}（分），币种：${currency}`;
  }

  return {
    uid: String(uid),
    eventTime: created_at,
    eventType: 'order_paid',
    pageType: undefined,
    pageId: undefined,
    refPageId: undefined,
    parentId: undefined,
    objectType: 'order',
    objectId: undefined,
    url: undefined,
    behaviorLabel,
    description,
  };
};

export const userBehaviorRouter = router({
  // 根据用户ID查询行为列表，按时间由近到远排序
  getUserBehaviorByUid: publicProcedure
    .input(
      z.object({
        uid: z.number(),
        skip: z.number().optional().default(0),
        take: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      const { uid, skip, take } = input;

      // 公共 WHERE 条件：uid + 我们关注的关键行为组合
      const whereSql = `
        uid = ?
        AND (
          -- 热词频道访问
          (page_type = 'hotword_channel' AND page_id IS NOT NULL) OR
          -- 模板详情页
          (page_type = 'template_page' AND page_id IS NOT NULL) OR
          -- 编辑器访问
          (page_type = 'editor_page' AND parent_id IS NOT NULL) OR
          -- VIP 拦截页
          (page_type = 'vip_intercept_page' AND page_id = 'vip_intercept_page') OR
          (event_type = 'click' AND object_type = 'vip_intercept_pay') OR
          -- 编辑器发布按钮点击
          (event_type = 'click' AND object_type = 'editor_publish_btn' AND ref_page_id IS NOT NULL) OR
          -- 作品预览页（page_id 为作品 ID）
          (page_type = 'viewer' AND page_id IS NOT NULL) OR
          -- 作品分享点击
          (event_type = 'click' AND object_type = 'work_share_btn' AND object_id IS NOT NULL)
        )
      `;

      // LIMIT / OFFSET 某些 BI 引擎对占位符支持不好，这里直接内联安全的整数值
      const safeTake = Math.max(0, Math.floor(take ?? 100));
      const safeSkip = Math.max(0, Math.floor(skip ?? 0));

      const listSql = `
        SELECT
          uid,
          event_time,
          event_type,
          page_type,
          page_id,
          ref_page_id,
          parent_id,
          object_type,
          object_id,
          url
        FROM mk_datawork_sls_events
        WHERE ${whereSql}
        ORDER BY event_time DESC
        LIMIT ${safeTake + safeSkip}
      `;

      const countSql = `
        SELECT COUNT(*) AS count
        FROM mk_datawork_sls_events
        WHERE ${whereSql}
      `;

      const [rows] = (await biPool.execute(listSql, [
        String(uid),
      ])) as unknown as [RawEventRow[]];

      const [countRows] = (await biPool.execute(countSql, [
        String(uid),
      ])) as unknown as [{ count: number }[]];

      const eventTotal =
        Array.isArray(countRows) && countRows.length > 0
          ? Number((countRows[0] as any).count || 0)
          : 0;

      // 订单库中查询用户的付费订单（order_status = 'paid'）
      const orderListSql = `
        SELECT
          uid,
          amount,
          currency,
          order_status,
          created_at
        FROM orders
        WHERE uid = ?
          AND appid IN ('jiantie', 'maka')
          AND order_status = 'paid'
        ORDER BY created_at DESC
        LIMIT ${safeTake + safeSkip}
      `;

      const orderCountSql = `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE uid = ?
          AND appid IN ('jiantie', 'maka')
          AND order_status = 'paid'
      `;

      const [orderRows] = (await orderPool.execute(orderListSql, [
        uid,
      ])) as unknown as [RawOrderRow[]];

      const [orderCountRows] = (await orderPool.execute(orderCountSql, [
        uid,
      ])) as unknown as [{ count: number }[]];

      const orderTotal =
        Array.isArray(orderCountRows) && orderCountRows.length > 0
          ? Number((orderCountRows[0] as any).count || 0)
          : 0;

      // 将打点事件和订单行为合并，按时间倒序排序，再做统一分页
      const eventItems = rows.map(mapEventToBehavior);
      const payItems = orderRows.map(mapOrderToBehavior);

      const merged = [...eventItems, ...payItems].sort(
        (a, b) => b.eventTime.getTime() - a.eventTime.getTime()
      );

      const pagedItems = merged.slice(safeSkip, safeSkip + safeTake);

      const total = eventTotal + orderTotal;

      return {
        items: pagedItems,
        total,
      };
    }),
});
