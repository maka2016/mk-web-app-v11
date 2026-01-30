//从order_record_entity读取所有订单，paymenttime为销售时间
//通过work_id找到模板template_entity，空或者无法关联则跳过
//template_entity的create_time为上架时间
//关联模板设计师的designer_entity的name
//通过uid关联user_info_entity获取appid
// 导出excel，列为，订单id、销售时间、金额、模板id、上架时间、设计师名字、appid

import {
  getPrisma,
  getOrderDB,
  getUsercenterDB,
  closeAllConnections,
} from '../service/db-connections';
import * as fs from 'fs';
import * as path from 'path';

const prisma = getPrisma();
const orderDB = getOrderDB();
const usercenterDB = getUsercenterDB();

interface ExportRow {
  订单id: string;
  销售时间: string;
  金额: string;
  模板id: string;
  上架时间: string;
  设计师名字: string;
  appid: string;
}

/**
 * 转义 CSV 字段中的特殊字符
 */
const escapeCsvField = (field: string | number | null | undefined): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * 将数据转换为 CSV 格式
 */
const convertToCsv = (rows: ExportRow[]): string => {
  if (rows.length === 0) {
    return '';
  }

  // CSV 头部
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(escapeCsvField).join(',');

  // CSV 数据行
  const dataRows = rows.map(row => {
    return headers
      .map(header => escapeCsvField(row[header as keyof ExportRow]))
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * 主导出函数
 */
async function exportOrderByDesignerAndTemplate() {
  console.log('开始导出订单数据...');

  try {
    // 1. 从 order_record_entity 读取所有订单（排除已删除的）
    const orderRecords = await prisma.orderRecordEntity.findMany({
      where: {
        deleted: false,
      },
      orderBy: {
        payment_time: 'desc',
      },
    });

    console.log(`找到 ${orderRecords.length} 条订单记录`);

    if (orderRecords.length === 0) {
      console.log('没有订单数据需要导出');
      return;
    }

    // 2. 批量查询模板信息
    const workIds = orderRecords
      .map(record => record.work_id)
      .filter((id): id is string => id !== null);

    const works = await prisma.worksEntity.findMany({
      where: {
        id: { in: workIds },
        deleted: false,
      },
      select: {
        id: true,
        template_id: true,
      },
    });

    const workMap = new Map(works.map(w => [w.id, w]));

    // 3. 批量查询模板信息
    const templateIds = works
      .map(w => w.template_id)
      .filter((id): id is string => id !== null);

    const templates = await prisma.templateEntity.findMany({
      where: {
        id: { in: templateIds },
        deleted: false,
      },
      include: {
        designer: {
          select: {
            name: true,
          },
        },
      },
    });

    const templateMap = new Map(templates.map(t => [t.id, t]));

    // 4. 批量查询用户信息获取 appid（从 usercenterDB 获取）
    const uids = orderRecords.map(record => record.uid);
    const users = await usercenterDB('users')
      .whereIn('uid', uids)
      .whereIn('appid', ['jiantie', 'maka'])
      .select('uid', 'appid');

    const userInfoMap = new Map<number, { uid: number; appid: string }>();
    for (const user of users as any[]) {
      if (!userInfoMap.has(user.uid)) {
        userInfoMap.set(user.uid, { uid: user.uid, appid: user.appid });
      }
    }

    // 5. 批量查询订单金额
    const orderIds = orderRecords.map(record => record.order_id);
    const orders = await orderDB('orders')
      .whereIn('order_no', orderIds)
      .where('order_status', 'paid')
      .select('order_no', 'amount');

    const orderAmountMap = new Map<string, number>();
    for (const order of orders) {
      // amount 单位是分，转换为元
      orderAmountMap.set(order.order_no, Number(order.amount) / 100);
    }

    // 6. 构建导出数据
    const exportRows: ExportRow[] = [];
    let skippedCount = 0;

    for (const orderRecord of orderRecords) {
      // 跳过没有 work_id 的记录
      if (!orderRecord.work_id) {
        skippedCount++;
        continue;
      }

      // 查找作品
      const work = workMap.get(orderRecord.work_id);
      if (!work || !work.template_id) {
        skippedCount++;
        continue;
      }

      // 查找模板
      const template = templateMap.get(work.template_id);
      if (!template) {
        skippedCount++;
        continue;
      }

      // 获取金额（如果找不到则显示为空）
      const amount = orderAmountMap.get(orderRecord.order_id);
      const amountStr = amount !== undefined ? amount.toFixed(2) : '';

      // 获取设计师名字
      const designerName = template.designer?.name || '';

      // 获取用户 appid
      const userInfo = userInfoMap.get(orderRecord.uid);
      const appid = userInfo?.appid || '';

      const row: ExportRow = {
        订单id: orderRecord.order_id,
        销售时间: orderRecord.payment_time
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19),
        金额: amountStr,
        模板id: template.id,
        上架时间: template.create_time
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19),
        设计师名字: designerName,
        appid: appid,
      };

      exportRows.push(row);
    }

    console.log(
      `处理完成，共 ${exportRows.length} 条有效记录，跳过 ${skippedCount} 条`
    );

    // 7. 生成 CSV 文件
    const csvContent = convertToCsv(exportRows);
    const outputDir = path.join(process.cwd(), 'output');
    const outputPath = path.join(outputDir, `订单导出_${Date.now()}.csv`);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf-8'); // 添加 BOM 以支持 Excel 正确显示中文

    console.log(`CSV 文件已生成: ${outputPath}`);
    console.log(`总计: ${exportRows.length} 条记录`);

    // 打印一些统计信息
    const totalAmount = exportRows.reduce((sum, row) => {
      const amount = parseFloat(row.金额) || 0;
      return sum + amount;
    }, 0);

    console.log('\n统计摘要:');
    console.log(`- 总订单数: ${exportRows.length}`);
    console.log(`- 总金额: ${totalAmount.toFixed(2)} 元`);
    console.log(
      `- 平均金额: ${(totalAmount / exportRows.length).toFixed(2)} 元`
    );

    return exportRows;
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    await exportOrderByDesignerAndTemplate();
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    await closeAllConnections();
  }
}

if (require.main === module) {
  main();
}

export { exportOrderByDesignerAndTemplate };
