import { closeAllConnections, getMakaplatv4DB } from '../../service/db-connections';

/**
 * 从 id=360001 开始，按 id 范围分组（每组 200 条），
 * 扫描 platv4_user_invoice_history：
 * - 只用 id 做 SQL 条件（whereBetween(id, ...)）
 * - 在代码里筛选 invoice_id = 40168 且 status = 0
 * - 再通过 id 逐条执行 DELETE
 *
 * 使用方法（示例）：
 * pnpm ts-node packages/jobs/src/entry/yunying/clearfapiao.ts
 */
async function main() {
  const db = getMakaplatv4DB();

  const tableName = 'platv4_user_invoice_history';
  const startId = 577105;
  const batchSize = 1000;

  try {
    // 1. 先拿到从 startId 起的最大 id，确定扫描上限
    const maxRow = await db(tableName).where('id', '>=', startId).max<{ maxId: number }>('id as maxId').first();

    const maxId = maxRow?.maxId ?? 0;

    if (!maxId || maxId < startId) {
      console.log(`表 ${tableName} 中从 id >= ${startId} 开始没有数据，无需删除`);
      return;
    }

    console.log(`开始扫描 ${tableName}，id 范围：${startId} ~ ${maxId}，批量大小：${batchSize}`);

    let totalDeleteTarget = 0;
    let successCount = 0;

    for (let batchStart = startId; batchStart <= maxId; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, maxId);

      console.log(`\n处理 id 区间 [${batchStart}, ${batchEnd}] ...`);

      // 2. 仅用 id 范围做 SQL 条件，其他条件在内存中过滤
      const rows: { id: number; invoice_id: number; status: number }[] = await db(tableName)
        .select('id', 'invoice_id', 'status')
        .whereBetween('id', [batchStart, batchEnd]);

      if (!rows.length) {
        console.log('该区间无数据');
        continue;
      }

      // 在内存中过滤出需要删除的行
      const needDelete = rows.filter(row => row.invoice_id === 40168 && row.status === 0);

      if (!needDelete.length) {
        console.log('该区间中没有 invoice_id=40168 且 status=0 的数据');
        continue;
      }

      totalDeleteTarget += needDelete.length;
      console.log(`该区间内命中 ${needDelete.length} 条待删除记录（累计待删除目标 ${totalDeleteTarget} 条）`);

      // 3. 按 id 批量删除
      const ids = needDelete.map(row => row.id);
      try {
        console.time('delete');
        const affected = await db(tableName).whereBetween('id', [batchStart, batchEnd]).andWhere('status', 0).del();
        console.timeEnd('delete');
        successCount += affected;
        console.log(`本批删除 ${affected} 条，累计已删除 ${successCount}/${totalDeleteTarget} 条`);
      } catch (err) {
        console.error(`批量删除 id IN (${ids.join(', ')}) 时出错:`, err);
      }
    }

    console.log(`\n扫描完成，目标条件记录共 ${totalDeleteTarget} 条，实际成功删除 ${successCount} 条`);
  } finally {
    // 4. 关闭数据库连接
    await closeAllConnections();
  }
}

main()
  .then(() => {
    console.log('clearfapiao 任务执行完毕');
    process.exit(0);
  })
  .catch(err => {
    console.error('clearfapiao 任务执行失败:', err);
    closeAllConnections()
      .catch(closeErr => {
        console.error('关闭数据库连接失败:', closeErr);
      })
      .finally(() => {
        process.exit(1);
      });
  });
