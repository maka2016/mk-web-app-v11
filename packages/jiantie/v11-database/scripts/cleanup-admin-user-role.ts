/**
 * 清理 admin_user_role 表中的旧数据
 * 用于迁移前清理，因为旧的 role_id (Int) 无法映射到新的 admin_role_id (String)
 */

import { prisma } from '@mk/jiantie/v11-database';

async function cleanupAdminUserRole() {
  console.log('开始清理 admin_user_role 表中的旧数据...');

  try {
    // 检查表是否存在
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_user_role'
      ) as exists;
    `;

    if (!tableExists[0]?.exists) {
      console.log('admin_user_role 表不存在，无需清理');
      return;
    }

    // 检查是否有数据
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM admin_user_role;
    `;

    const rowCount = Number(count[0]?.count || 0);
    console.log(`找到 ${rowCount} 条记录`);

    if (rowCount === 0) {
      console.log('表中没有数据，无需清理');
      return;
    }

    // 删除所有旧数据
    await prisma.$executeRaw`DELETE FROM admin_user_role`;
    console.log(`已删除 ${rowCount} 条旧记录`);

    // 如果存在旧的 role_id 列，删除它
    const hasRoleIdColumn = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'admin_user_role' 
        AND column_name = 'role_id'
      ) as exists;
    `;

    if (hasRoleIdColumn[0]?.exists) {
      console.log('删除旧的 role_id 列...');
      await prisma.$executeRaw`ALTER TABLE admin_user_role DROP COLUMN IF EXISTS role_id`;
      console.log('已删除 role_id 列');
    }

    // 删除旧的唯一约束
    await prisma.$executeRaw`
      ALTER TABLE admin_user_role 
      DROP CONSTRAINT IF EXISTS "UQ_admin_user_role_admin_user_id_role_id";
    `;

    // 删除旧的索引
    await prisma.$executeRaw`DROP INDEX IF EXISTS "IDX_admin_user_role_role_id"`;

    console.log('✅ 清理完成！现在可以执行 db push 了');
  } catch (error) {
    console.error('清理失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanupAdminUserRole()
    .then(() => {
      console.log('\n脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { cleanupAdminUserRole };
