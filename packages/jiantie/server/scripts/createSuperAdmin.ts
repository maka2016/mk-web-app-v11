/**
 * 创建超级管理员脚本
 * 创建超级管理员账号、角色，并分配所有权限
 * 
 * 使用方法：
 * - 普通创建（如果已存在则更新）：npx tsx packages/jiantie/server/scripts/createSuperAdmin.ts
 * - 强制重新创建（删除后重建）：npx tsx packages/jiantie/server/scripts/createSuperAdmin.ts --force
 */

import { prisma } from '@mk/jiantie/v11-database';
import { hashPassword } from '../utils/password';

const ALL_MENU_GROUPS = [
  '工作台',
  '基础数据管理',
  '平台资源管理',
  'BI报表',
  '业务报表（废弃）',
  '风控管理',
  '权限管理',
] as const;

// 超级管理员配置
const SUPER_ADMIN_CONFIG = {
  username: process.env.SUPER_ADMIN_USERNAME || 'admin',
  password: process.env.SUPER_ADMIN_PASSWORD || 'admin123456', // 默认密码，建议首次登录后修改
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@example.com',
  roleName: '超级管理员',
  roleAlias: 'super_admin',
  roleDescription: '拥有所有权限的超级管理员角色',
};

async function createSuperAdmin(force: boolean = false) {
  console.log('开始创建超级管理员...');
  if (force) {
    console.log('⚠️  强制模式：将删除现有数据后重新创建');
  }

  try {
    // 如果强制模式，先删除现有数据
    if (force) {
      console.log('\n清理现有数据...');
      
      // 1. 删除现有的管理员账号关联
      const existingUser = await prisma.adminUser.findUnique({
        where: { username: SUPER_ADMIN_CONFIG.username },
        include: { adminUserRoles: true },
      });

      if (existingUser) {
        // 删除关联的角色关系
        if (existingUser.adminUserRoles.length > 0) {
          await prisma.adminUserRole.deleteMany({
            where: { admin_user_id: existingUser.id },
          });
          console.log(`已删除管理员 "${SUPER_ADMIN_CONFIG.username}" 的角色关联`);
        }
        
        // 删除管理员账号
        await prisma.adminUser.delete({
          where: { id: existingUser.id },
        });
        console.log(`已删除管理员账号: ${SUPER_ADMIN_CONFIG.username}`);
      }

      // 2. 删除现有的超级管理员角色
      const existingRole = await prisma.adminRole.findFirst({
        where: { name: SUPER_ADMIN_CONFIG.roleName },
      });

      if (existingRole) {
        // 检查是否有其他用户使用此角色
        const roleUsers = await prisma.adminUserRole.findMany({
          where: { admin_role_id: existingRole.id },
        });

        if (roleUsers.length > 0) {
          console.log(`⚠️  警告：角色 "${SUPER_ADMIN_CONFIG.roleName}" 仍被 ${roleUsers.length} 个用户使用，将删除这些关联`);
          await prisma.adminUserRole.deleteMany({
            where: { admin_role_id: existingRole.id },
          });
        }

        await prisma.adminRole.delete({
          where: { id: existingRole.id },
        });
        console.log(`已删除角色: ${SUPER_ADMIN_CONFIG.roleName}`);
      }

      console.log('✅ 清理完成\n');
    }

    // 1. 检查或创建超级管理员账号
    let adminUser = await prisma.adminUser.findUnique({
      where: { username: SUPER_ADMIN_CONFIG.username },
    });

    if (adminUser) {
      console.log(`管理员账号 "${SUPER_ADMIN_CONFIG.username}" 已存在`);
      
      // 如果强制模式但账号仍存在（理论上不应该），更新密码
      if (force) {
        const password_hash = hashPassword(SUPER_ADMIN_CONFIG.password);
        adminUser = await prisma.adminUser.update({
          where: { id: adminUser.id },
          data: { password_hash },
        });
        console.log(`已更新管理员密码`);
      }
    } else {
      const password_hash = hashPassword(SUPER_ADMIN_CONFIG.password);
      adminUser = await prisma.adminUser.create({
        data: {
          username: SUPER_ADMIN_CONFIG.username,
          email: SUPER_ADMIN_CONFIG.email,
          password_hash,
          status: 0,
        },
      });
      console.log(`已创建管理员账号: ${SUPER_ADMIN_CONFIG.username}`);
    }

    // 2. 检查或创建超级管理员角色
    let superAdminRole = await prisma.adminRole.findFirst({
      where: {
        name: SUPER_ADMIN_CONFIG.roleName,
      },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.adminRole.create({
        data: {
          name: SUPER_ADMIN_CONFIG.roleName,
          alias: SUPER_ADMIN_CONFIG.roleAlias,
          description: SUPER_ADMIN_CONFIG.roleDescription,
          menu_groups: [...ALL_MENU_GROUPS],
        },
      });
      console.log(`已创建角色: ${SUPER_ADMIN_CONFIG.roleName}`);
    } else {
      console.log(`角色 "${SUPER_ADMIN_CONFIG.roleName}" 已存在`);
    }

    // 3. 确保超级管理员角色拥有全部菜单分组权限
    const currentGroups = Array.isArray(superAdminRole.menu_groups)
      ? superAdminRole.menu_groups
      : [];
    const needsUpdate =
      currentGroups.length !== ALL_MENU_GROUPS.length ||
      ALL_MENU_GROUPS.some(g => !currentGroups.includes(g));

    if (needsUpdate) {
      superAdminRole = await prisma.adminRole.update({
        where: { id: superAdminRole.id },
        data: { menu_groups: [...ALL_MENU_GROUPS] },
      });
      console.log(`已更新角色权限为全部菜单分组（${ALL_MENU_GROUPS.length}个）`);
    } else {
      console.log(`角色已拥有全部菜单分组权限（${ALL_MENU_GROUPS.length}个）`);
    }

    // 4. 为管理员账号分配超级管理员角色（并写入权限快照到 AdminUserRole）
    const existingAdminUserRole = await prisma.adminUserRole.findFirst({
      where: {
        admin_user_id: adminUser.id,
        admin_role_id: superAdminRole.id,
      },
    });

    if (!existingAdminUserRole) {
      await prisma.adminUserRole.create({
        data: {
          admin_user_id: adminUser.id,
          admin_role_id: superAdminRole.id,
          menu_groups: [...ALL_MENU_GROUPS],
        },
      });
      console.log(
        `已为管理员 "${SUPER_ADMIN_CONFIG.username}" 分配角色 "${SUPER_ADMIN_CONFIG.roleName}"`
      );
    } else {
      // 同步更新权限快照
      await prisma.adminUserRole.update({
        where: { id: existingAdminUserRole.id },
        data: { menu_groups: [...ALL_MENU_GROUPS] },
      });
      console.log(
        `管理员 "${SUPER_ADMIN_CONFIG.username}" 已拥有角色 "${SUPER_ADMIN_CONFIG.roleName}"`
      );
    }

    console.log('\n✅ 超级管理员创建完成！');
    console.log(`\n登录信息:`);
    console.log(`  用户名: ${SUPER_ADMIN_CONFIG.username}`);
    console.log(`  密码: ${SUPER_ADMIN_CONFIG.password}`);
    console.log(`  邮箱: ${SUPER_ADMIN_CONFIG.email}`);
    console.log(`\n⚠️  请首次登录后立即修改默认密码！`);
  } catch (error) {
    console.error('创建超级管理员失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const force = process.argv.includes('--force');
  createSuperAdmin(force)
    .then(() => {
      console.log('\n脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { createSuperAdmin };
