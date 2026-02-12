import { prisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

import knex from 'knex';

// const dids = [
//   605294846
// 605188792
// 605375744
// 605112235
// 605196910
// 605091011
// 605053832

// 605056689
// 605277277
// 605318172
// 605220964
// 605424109
// ]

const duids = [
  605294846, 605188792, 605375744, 605112235, 605196910, 605091011, 605053832,
  605056689, 605277277, 605318172, 605220964, 605424109, 605075635,
];

// this.biAdb = knex({
//   client: "mysql",
//   connection: {
//     host: "am-2zeo48x814d64lo93167330.ads.aliyuncs.com",
//     // user: "root",
//     // password: "uB=$4ySh2Zak",
//     user: "report_api",
//     password: "j3E4h6NWBQ5U-",
//     database: "mk_datawork",
//   },
// });

const biAdb = knex({
  client: 'mysql',
  connection: {
    host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
    user: 'report_api',
    password: 'j3E4h6NWBQ5U-',
    database: 'mk_datawork',
  },
});

const assetDB = knex({
  client: 'mysql', //指定knex要操作的数据库为MySQL
  connection: {
    host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
    user: 'mso_read_only',
    password: 'j3E4h6NWBQ5U',
    database: 'mk_user_asset_center',
  },
});

const userCenterDB = knex({
  client: 'mysql', //指定knex要操作的数据库为MySQL
  connection: {
    host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
    user: 'mso_read_only',
    password: 'j3E4h6NWBQ5U',
    database: 'mk_user_center',
  },
});

interface StatRow {
  作品ID: string;
  作品标题: string;
  作品创建时间: string;
  作品链接: string;
  提交量: number;
  表单配置ID: string;
  表单标题: string;
  购买状态: string;
  会员状态: string;
  设计师: string;
  PV: number;
  定向邀请: number;
  包含邀请信息: number;
}

/**
 * 生成作品链接
 */
const generateWorkLink = (work: {
  id: string;
  child_works_id: string | null;
}): string => {
  const baseUrl = 'https://www.jiantieapp.com';
  const workId = work.child_works_id || work.id;
  return `${baseUrl}/viewer2/${workId}`;
};

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
const convertToCsv = (rows: StatRow[]): string => {
  if (rows.length === 0) {
    return '';
  }

  // CSV 头部
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(escapeCsvField).join(',');

  // CSV 数据行
  const dataRows = rows.map(row => {
    return headers
      .map(header => escapeCsvField(row[header as keyof StatRow]))
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * 主统计函数
 */
const statRsvp = async () => {
  console.log('开始统计 RSVP 数据...');

  try {
    // 1. 查询所有未删除的 RSVP 表单配置
    const formConfigs = await prisma.rsvpFormConfigEntity.findMany({
      where: {
        deleted: false,
        works_id: {
          not: {
            startsWith: 'T_',
          },
        },
      },
    });

    console.log(`找到 ${formConfigs.length} 个 RSVP 表单配置`);

    // 2. 获取所有相关的作品 ID
    const worksIds = formConfigs.map(config => config.works_id);
    const uniqueWorksIds = [...new Set(worksIds)];

    console.log('uniqueWorksIds query:', uniqueWorksIds.length);

    const assetWorks = await assetDB('user_resources')
      .select('*')
      .whereIn('resource_id', uniqueWorksIds);

    const assetWorksMap = new Map(
      assetWorks.map(work => [work.resource_id, work])
    );

    console.log('assetWorks:', assetWorks.length);

    // 3. 批量查询作品信息
    const works = await prisma.worksEntity.findMany({
      where: {
        id: {
          in: uniqueWorksIds,
        },
        // id: {},
        // deleted: false,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        create_time: true,
        child_works_id: true,
      },
    });

    console.log('作品:', works.length);

    // 创建作品信息映射
    const worksMap = new Map(works.map(work => [work.id, work]));

    const userIds = works.map(work => work.uid);
    const uniqueUserIds = [...new Set(userIds)];

    const userRoles = await userCenterDB('user_roles')
      .select('*')
      .whereIn('uid', uniqueUserIds)
      .where('appid', 'jiantie');
    // .where('status', 1);

    console.log('vip用户:', userRoles.length);
    const vipMap = new Map(userRoles.map(role => [role.uid, role]));

    // 4. 构建统计结果
    const statRows: StatRow[] = [];
    let count = 0;
    for (const formConfig of formConfigs) {
      if (!assetWorksMap.get(formConfig.works_id)) continue;

      count++;
      console.log(`处理第 ${count} 个表单配置`);

      const work = worksMap.get(formConfig.works_id);

      if (!work) {
        console.warn(`未找到作品 ID: ${formConfig.works_id}`);
        continue;
      }

      // 统计提交量（去重，按 submission_group_id 分组）
      const submissionCount = await prisma.rsvpSubmissionEntity.groupBy({
        by: ['submission_group_id'],
        where: {
          form_config_id: formConfig.id,
          deleted: false,
        },
      });

      // 统计包含 _inviteeInfo 的提交量
      const allSubmissions = await prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: formConfig.id,
          deleted: false,
        },
        select: {
          submission_group_id: true,
          submission_data: true,
        },
      });

      // 筛选包含 _inviteeInfo 的提交
      const submissionsWithInviteeInfo = allSubmissions.filter(submission => {
        const data = submission.submission_data as any;
        return data && typeof data === 'object' && '_inviteeInfo' in data;
      });

      const inviteeInfoCount = new Set(
        submissionsWithInviteeInfo.map(s => s.submission_group_id)
      ).size;

      // 统计 PV（页面浏览量）
      const pvCount = await prisma.rsvpViewLogEntity.count({
        where: {
          form_config_id: formConfig.id,
          action_type: 'view_page',
        },
      });

      // const uvCount = await biAdb('mk_datawork.mk_datawork_sls_events')
      //   // .select('*')
      //   .count(1)
      //   .countDistinct('distinct_id')
      //   .where({
      //     page_id: work.id,
      //   });

      //rsvp_contact_form_config_entity
      const rsvpContactCount = await prisma.rsvpContactFormConfigEntity.count({
        where: {
          form_config_id: formConfig.id,
        },
      });

      // console.log('uvCount:', uvCount);
      console.log('rsvpContactCount:', rsvpContactCount);
      console.log('inviteeInfoCount:', inviteeInfoCount);

      const row: StatRow = {
        作品ID: work.id,
        作品标题: work.title || '',
        作品创建时间: work.create_time.toISOString(),
        作品链接: generateWorkLink(work),
        提交量: submissionCount.length,
        表单配置ID: formConfig.id,
        表单标题: formConfig.title || '',
        购买状态: !!assetWorksMap.get(work.id) ? '已购买' : '未购买',
        会员状态: !!vipMap.get(work.uid) ? '会员' : '非会员',
        设计师: duids.includes(work.uid) ? '是' : '否',
        PV: pvCount,
        定向邀请: rsvpContactCount,
        包含邀请信息: inviteeInfoCount,
      };

      if (work.id === '38G7NXKS_605477616') {
        console.log('row:', row);
      }

      statRows.push(row);
    }

    console.log(`统计完成，共 ${statRows.length} 条记录`);

    // 5. 生成 CSV 文件
    const csvContent = convertToCsv(statRows);
    const outputDir = path.join(process.cwd(), 'output');
    const outputPath = path.join(outputDir, `rsvp_stat_${Date.now()}.csv`);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf-8'); // 添加 BOM 以支持 Excel 正确显示中文

    console.log(`CSV 文件已生成: ${outputPath}`);
    console.log(`总计: ${statRows.length} 条记录`);

    // 打印一些统计信息
    const totalSubmissions = statRows.reduce((sum, row) => sum + row.提交量, 0);
    const totalPV = statRows.reduce((sum, row) => sum + row.PV, 0);

    console.log('\n统计摘要:');
    console.log(`- 总作品数: ${statRows.length}`);
    console.log(`- 总提交量: ${totalSubmissions}`);
    console.log(`- 总PV: ${totalPV}`);
    console.log(
      `- 平均提交量: ${(totalSubmissions / statRows.length).toFixed(2)}`
    );
    console.log(`- 平均PV: ${(totalPV / statRows.length).toFixed(2)}`);

    return statRows;
  } catch (error) {
    console.error('统计失败:', error);
    throw error;
  }
};

// 主函数
const main = async () => {
  try {
    await statRsvp();
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

export { statRsvp };
