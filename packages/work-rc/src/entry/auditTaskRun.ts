//第一步，读取review_tasks表中status为pending且snapshot_time在15分钟前且type为makav7的记录
//第二步，如果有workId和snapshot_time相同的记录，则直接完成审核任务，更新workAuditResult的pvuv和历史pvuv
//第三步,如果是白名单用户或者人工标记过通过的作品，则直接完成审核任务，并且添加一条WorkAuditList，reason为白名单，passType为whiteWork或者whiteUser（这一步先不实现）
//第四步，读取作品信息，同步到workInfo表
//第五步，进行风控审核，返回是否通过和风险等级（先实现简单的标题检查，含有"群聊"的则为高危，其他都是通过）
//第六步，根据风控审核结果，更新WorkAuditList，reason为风控审核结果，passType为machine
//第七步，更新WorkAuditResult
//第八步，更新review_tasks表的status
//注意，用dayjs来处理时间，关键地方打点日志方便调试

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as WorkRcPrismaClient } from '../../generated/client/client';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import DB from '../utils/db';
import {
  getWorksDataFromOSS,
  extractJsonFeatures,
  JsonFeatures,
} from '../utils/service';

// 加载环境变量
dotenv.config();
dotenv.config({ path: '.env.local' });

// 风控结果接口
interface RiskControlResult {
  passed: boolean; // 是否通过
  riskLevel: 'low' | 'high' | 'suspicious'; // 风险等级
  reason: string; // 审核原因
}

// 作品信息接口
interface WorkInfoData {
  works_id: string;
  uid: number;
  title: string;
  create_time: Date | string;
  update_time: Date | string;
  thumb: string | null;
  status: number;
  version: number;
  metadata?: any; // 可选的元数据
  features?: any; // 用于存储JSON特征等信息
}

// 敏感词列表（启动时加载）
interface SensitiveWordItem {
  word: string;
  level: 'low' | 'high' | 'suspicious';
}

let sensitiveWordsCache: SensitiveWordItem[] = [];

// 初始化数据库连接
function initWorkRcPrisma(): WorkRcPrismaClient {
  const connectionString = process.env.RC_DB_URL;
  if (!connectionString) {
    throw new Error('RC_DB_URL 环境变量未设置');
  }
  const adapter = new PrismaPg({ connectionString });
  return new WorkRcPrismaClient({ adapter });
}

/**
 * 加载敏感词关键词库
 * @param workRcPrisma 数据库客户端
 */
async function loadSensitiveWords(
  workRcPrisma: WorkRcPrismaClient
): Promise<void> {
  try {
    const sensitiveWords = await workRcPrisma.sensitiveWord.findMany({
      select: {
        word: true,
        level: true,
      },
    });

    sensitiveWordsCache = sensitiveWords.map(item => ({
      word: item.word,
      level: item.level,
    }));

    console.log(
      `[敏感词库] 成功加载 ${sensitiveWordsCache.length} 个敏感词关键词`
    );
  } catch (error) {
    console.error(`[敏感词库] 加载敏感词关键词库失败:`, error);
    throw error;
  }
}

/**
 * 清理标题：去除空格和特殊符号，只保留中英文数字
 * @param text 原始文本
 * @returns 清理后的文本
 */
function cleanTitle(text: string): string {
  // 去除所有空格
  const withoutSpace = text.replace(/\s+/g, '');
  // 只保留中英文数字，去除其他特殊符号
  const validPattern = /[\u4e00-\u9fa5a-zA-Z0-9]/g;
  const matches = withoutSpace.match(validPattern);
  return matches ? matches.join('') : '';
}

/**
 * 风控审核函数：对作品进行风控审核
 * @param workInfo 作品信息
 * @returns 是否通过和风险等级
 */
async function riskControl(workInfo: WorkInfoData): Promise<RiskControlResult> {
  console.log(
    `[风控审核] 开始审核作品 ${workInfo.works_id}，标题: ${workInfo.title}`
  );

  const originalTitle = workInfo.title || '';
  // 去除空格和特殊符号，只保留中英文数字
  const title = cleanTitle(originalTitle);

  // 检查敏感词库是否已加载
  if (sensitiveWordsCache.length === 0) {
    console.warn(`[风控审核] 敏感词库未加载，默认通过`);
    return {
      passed: true,
      riskLevel: 'low',
      reason: '敏感词库未加载，默认通过',
    };
  }

  // 第一步：遍历敏感词，检查标题是否包含
  for (const sensitiveWord of sensitiveWordsCache) {
    // 对敏感词也进行清理，确保匹配准确性
    const cleanedWord = cleanTitle(sensitiveWord.word);
    if (cleanedWord && title.includes(cleanedWord)) {
      const riskLevel = sensitiveWord.level;

      console.log(
        `[风控审核] 作品 ${workInfo.works_id} 标题命中敏感词"${sensitiveWord.word}"，风险等级: ${riskLevel}`
      );

      return {
        passed: false,
        riskLevel,
        reason: `标题含有敏感词"${sensitiveWord.word}"`,
      };
    }
  }

  // 特征检查：检查作品的特征是否符合要求。如果没有特征数据，则直接可以，理由是无特征数据
  // 以下为可疑情况：
  // 页面数量为1且用户上传的图片为1，没什么文本内容（15字以内）
  // 含有外链link
  // 内容不丰富，用户上传图片<3且文本内容小于30
  // 将文本信息处理后进行敏感词匹配，直接命中敏感词，则直接返回风控等级，理由是内容含有敏感词 XX

  // 检查是否有特征数据
  const features = workInfo.features as JsonFeatures | undefined;
  if (!features || typeof features !== 'object') {
    console.log(`[风控审核] 作品 ${workInfo.works_id} 无特征数据，直接通过`);
    return {
      passed: false,
      riskLevel: 'suspicious',
      reason: '无特征数据，请联系开发',
    };
  }

  // 计算文本总字数
  const totalTextLength = features.textContents
    ? features.textContents.reduce((sum, text) => sum + text.length, 0)
    : 0;

  // 检查1：页面数量为1且用户上传的图片为1，没什么文本内容（15字以内）
  if (
    // features.pageCount === 1 &&
    features.userUploadedImageCount <= 5 &&
    totalTextLength <= 10
  ) {
    console.log(
      `[风控审核] 作品 ${workInfo.works_id} 可疑：页面数为1，用户上传图片为1，文本内容${totalTextLength}字（≤15字）`
    );
    return {
      passed: false,
      riskLevel: 'suspicious',
      reason: `用户上传图片<5，文本内容${totalTextLength}字（≤10字）`,
    };
  }

  // 检查2：含有外链link
  if (features.linkCount > 0) {
    console.log(
      `[风控审核] 作品 ${workInfo.works_id} 可疑：含有外链，外链数量：${features.linkCount}`
    );
    return {
      passed: false,
      riskLevel: 'suspicious',
      reason: `含有外链，外链数量：${features.linkCount}`,
    };
  }

  // 检查3：内容不丰富，用户上传图片<3且文本内容小于30
  if (features.userUploadedImageCount < 2 && totalTextLength < 30) {
    console.log(
      `[风控审核] 作品 ${workInfo.works_id} 可疑：内容不丰富，用户上传图片${features.userUploadedImageCount}张（<2），文本内容${totalTextLength}字（<30字）`
    );
    return {
      passed: false,
      riskLevel: 'suspicious',
      reason: `内容不丰富，用户上传图片${features.userUploadedImageCount}张，文本内容${totalTextLength}字（<30字）`,
    };
  }

  // 检查4：将文本信息处理后进行敏感词匹配
  if (features.textContents && features.textContents.length > 0) {
    // 合并所有文本内容
    const allText = features.textContents.join('');
    // 清理文本：去除空格和特殊符号，只保留中英文数字
    const cleanedText = cleanTitle(allText);

    // 遍历敏感词，检查文本内容是否包含
    for (const sensitiveWord of sensitiveWordsCache) {
      const cleanedWord = cleanTitle(sensitiveWord.word);
      if (cleanedWord && cleanedText.includes(cleanedWord)) {
        const riskLevel = sensitiveWord.level;

        console.log(
          `[风控审核] 作品 ${workInfo.works_id} 文本内容命中敏感词"${sensitiveWord.word}"，风险等级: ${riskLevel}`
        );

        return {
          passed: false,
          riskLevel,
          reason: `内容含有敏感词"${sensitiveWord.word}"`,
        };
      }
    }
  }

  // 未命中任何敏感词和可疑情况，审核通过
  console.log(`[风控审核] 作品 ${workInfo.works_id} 审核通过，风险等级：低`);
  return {
    passed: true,
    riskLevel: 'low',
    reason: '机审通过',
  };
}

/**
 * 从 platv5_works 表读取作品信息
 */
async function fetchWorkInfo(
  workId: string,
  uid: number
): Promise<WorkInfoData | null> {
  const tableIndex = uid % 16;
  const tableName = `platv5_works_${tableIndex}`;

  console.log(
    `[读取作品信息] 查询表 ${tableName}，workId: ${workId}, uid: ${uid}`
  );

  try {
    const worksInfo = await DB.makadb(tableName)
      .select(
        'works_id',
        'uid',
        'title',
        'create_time',
        'update_time',
        'thumb',
        'status',
        'version'
      )
      .where('works_id', workId)
      .where('uid', uid)
      .first();

    if (!worksInfo) {
      console.log(`[读取作品信息] 未找到作品 ${workId} 的信息`);
      return null;
    }

    console.log(`[读取作品信息] 成功获取作品 ${workId} 的信息`);
    return {
      works_id: worksInfo.works_id,
      uid: worksInfo.uid,
      title: worksInfo.title || '',
      create_time: worksInfo.create_time,
      update_time: worksInfo.update_time,
      thumb: worksInfo.thumb || null,
      status: worksInfo.status || 0,
      version: worksInfo.version || '0',
    };
  } catch (error) {
    console.error(`[读取作品信息] 查询表 ${tableName} 时出错:`, error);
    return null;
  }
}

/**
 * 同步作品信息到 workInfo 表
 */
async function syncWorkInfo(
  workRcPrisma: WorkRcPrismaClient,
  workInfo: WorkInfoData
): Promise<void> {
  console.log(
    `[同步作品信息] 开始同步作品 ${workInfo.works_id} 到 workInfo 表`
  );

  const createTime =
    workInfo.create_time instanceof Date
      ? workInfo.create_time
      : new Date(workInfo.create_time);
  const updateTime =
    workInfo.update_time instanceof Date
      ? workInfo.update_time
      : new Date(workInfo.update_time);

  const metadata = {
    title: workInfo.title,
    create_time: createTime.toISOString(),
    update_time: updateTime.toISOString(),
    thumb: workInfo.thumb,
    status: workInfo.status,
    // 如果 workInfo 中有 metadata，则合并进来（例如 JSON 特征）
    ...(workInfo.metadata || {}),
  };

  try {
    // 使用 upsert 操作，如果存在则更新，不存在则创建
    await workRcPrisma.workInfo.upsert({
      where: {
        workId: workInfo.works_id,
      },
      update: {
        uid: workInfo.uid,
        type: 'makav7',
        title: workInfo.title,
        cover: workInfo.thumb,
        status: workInfo.status,
        createTime: createTime,
        updateTime: updateTime,
        metadata: metadata as any,
        features: workInfo.features,
        updatedAt: new Date(),
      },
      create: {
        workId: workInfo.works_id,
        uid: workInfo.uid,
        type: 'makav7',
        title: workInfo.title,
        cover: workInfo.thumb,
        status: workInfo.status,
        createTime: createTime,
        updateTime: updateTime,
        metadata: metadata as any,
        features: workInfo.features,
      },
    });

    console.log(
      `[同步作品信息] 成功同步作品 ${workInfo.works_id} 到 workInfo 表`
    );
  } catch (error) {
    console.error(
      `[同步作品信息] 同步作品 ${workInfo.works_id} 时出错:`,
      error
    );
    throw error;
  }
}

/**
 * 处理单个审核任务
 */
async function processTask(
  workRcPrisma: WorkRcPrismaClient,
  task: any
): Promise<'processed' | 'skipped' | 'error'> {
  try {
    console.log(
      `\n[处理任务] 开始处理任务 ${task.id}，workId: ${task.workId}, snapshotTime: ${dayjs(task.snapshotTime).format('YYYY-MM-DD HH:mm:ss')}`
    );

    // 第二步：检查是否有 workId 和 snapshot_time 相同的记录
    const existingAuditList = await workRcPrisma.workAuditList.findFirst({
      where: {
        workId: task.workId,
        snapshotTime: task.snapshotTime,
      },
    });

    if (existingAuditList) {
      // 更新 workAuditResult 的 pv、uv 和历史 pv、uv
      const existingAuditResult = await workRcPrisma.workAuditResult.findUnique(
        {
          where: {
            workId: task.workId,
          },
        }
      );

      if (existingAuditResult) {
        await workRcPrisma.workAuditResult.update({
          where: {
            workId: task.workId,
          },
          data: {
            pv: task.pv,
            uv: task.uv,
            historyPv: task.historyPv,
            historyUv: task.historyUv,
          },
        });
        console.log(
          `[第二步] 成功更新 workAuditResult，workId: ${task.workId}，pv: ${task.pv}, uv: ${task.uv}, historyPv: ${task.historyPv}, historyUv: ${task.historyUv}`
        );
      } else {
        // 如果不存在 workAuditResult，则创建
        await workRcPrisma.workAuditResult.create({
          data: {
            workId: task.workId,
            uid: task.uid,
            type: 'makav7',
            pv: task.pv,
            uv: task.uv,
            historyPv: task.historyPv,
            historyUv: task.historyUv,
          },
        });
        console.log(
          `[第二步] 成功创建 workAuditResult，workId: ${task.workId}`
        );
      }

      // 更新 review_tasks 表的 status 为 completed
      await workRcPrisma.reviewTask.update({
        where: {
          id: task.id,
        },
        data: {
          status: 'completed',
        },
      });

      return 'skipped';
    }

    // 第四步：读取作品信息，同步到 workInfo 表
    console.log(
      `[第四步] 开始读取作品信息，workId: ${task.workId}, uid: ${task.uid}`
    );
    const workInfo = await fetchWorkInfo(task.workId, task.uid);

    if (!workInfo) {
      console.log(`[第四步] 无法获取作品信息，跳过任务 ${task.id}`);
      return 'error';
    }

    //读取作品json数据，提取json特征，放到workInfo的metadata中
    console.log(
      `[第四步-提取特征] 开始读取作品JSON数据并提取特征，workId: ${task.workId}, uid: ${task.uid}`
    );
    try {
      const worksJsonData = await getWorksDataFromOSS(
        task.workId,
        task.uid,
        workInfo.version
      );
      const jsonFeatures: any = extractJsonFeatures(worksJsonData, task.uid);

      //根据uid查询用户注册时间和名字也作为特征
      const userInfo = await DB.usercenterDB('users')
        .where('uid', task.uid)
        .first();
      if (userInfo) {
        jsonFeatures.userInfo = {
          registerTime: userInfo.reg_date,
          userName: userInfo.name,
        };
      }

      workInfo.features = jsonFeatures;

      console.log(
        `[第四步-提取特征] 成功提取JSON特征，文字组件: ${jsonFeatures.textCount}, 图片组件: ${jsonFeatures.imageCount}, 外链: ${jsonFeatures.linkCount}, 页面数: ${jsonFeatures.pageCount}`
      );
    } catch (error) {
      workInfo.features = {
        msg: '提取特征失败',
        error: `${JSON.stringify(error)}`,
      };
      console.error(
        `[第四步-提取特征] 读取作品JSON数据或提取特征失败，workId: ${task.workId}:`,
        error
      );
      // 即使提取特征失败，也继续后续流程
    }

    // 同步作品信息到 workInfo 表
    await syncWorkInfo(workRcPrisma, workInfo);

    // 第三步：检查白名单用户和白名单作品是否有，有则通过
    console.log(
      `[第三步] 开始检查白名单，workId: ${task.workId}, uid: ${task.uid}`
    );

    // 检查白名单用户
    const whitelistUser = await workRcPrisma.whitelistUser.findUnique({
      where: {
        uid: task.uid,
      },
    });

    // 检查白名单作品
    const whitelistWork = await workRcPrisma.whitelistWork.findUnique({
      where: {
        workId: task.workId,
      },
    });

    if (whitelistUser || whitelistWork) {
      const passType = whitelistUser ? 'whiteUser' : 'whiteWork';
      const reason = whitelistUser
        ? '白名单用户，自动通过'
        : '白名单作品，自动通过';

      console.log(
        `[第三步] 发现${whitelistUser ? '白名单用户' : '白名单作品'}，直接通过，workId: ${task.workId}, uid: ${task.uid}`
      );

      // 创建白名单审核记录
      const createdAuditList = await workRcPrisma.workAuditList.create({
        data: {
          workId: task.workId,
          uid: task.uid,
          type: 'makav7',
          snapshotTime: task.snapshotTime,
          machineReviewResult: 'pass',
          passType: passType as any,
          machineRiskLevel: 'low',
          reason: reason,
          reviewTime: new Date(),
        } as any,
      });

      console.log(
        `[第三步] 成功创建白名单审核记录，auditId: ${createdAuditList.id}`
      );

      // 更新或创建 WorkAuditResult
      const existingAuditResult = await workRcPrisma.workAuditResult.findUnique(
        {
          where: {
            workId: task.workId,
          },
        }
      );

      const auditResultData = {
        workId: task.workId,
        uid: task.uid,
        type: 'makav7' as const,
        pv: task.pv,
        uv: task.uv,
        historyPv: task.historyPv,
        historyUv: task.historyUv,
        meta: {
          title: workInfo.title,
          create_time:
            workInfo.create_time instanceof Date
              ? workInfo.create_time.toISOString()
              : workInfo.create_time,
          update_time:
            workInfo.update_time instanceof Date
              ? workInfo.update_time.toISOString()
              : workInfo.update_time,
          thumb: workInfo.thumb,
          status: workInfo.status,
        } as any,
        lastReviewTime: new Date(),
        reviewCount: existingAuditResult
          ? existingAuditResult.reviewCount + 1
          : 1,
        lastAuditId: createdAuditList.id,
      };

      if (existingAuditResult) {
        await workRcPrisma.workAuditResult.update({
          where: {
            workId: task.workId,
          },
          data: auditResultData,
        });
        console.log(
          `[第三步] 成功更新 WorkAuditResult，workId: ${task.workId}`
        );
      } else {
        await workRcPrisma.workAuditResult.create({
          data: auditResultData,
        });
        console.log(
          `[第三步] 成功创建 WorkAuditResult，workId: ${task.workId}`
        );
      }

      // 更新 review_tasks 表的 status 为 completed
      await workRcPrisma.reviewTask.update({
        where: {
          id: task.id,
        },
        data: {
          status: 'completed',
        },
      });

      console.log(
        `[第三步] 白名单审核完成，跳过后续风控审核，taskId: ${task.id}`
      );
      return 'skipped';
    }

    // 第五步：进行风控审核
    console.log(`[第五步] 开始进行风控审核，workId: ${task.workId}`);
    const riskResult = await riskControl(workInfo);

    const reviewStatus = riskResult.passed ? 'pass' : 'failed';
    const reviewTime = new Date();

    // 第六步：根据风控审核结果，创建 WorkAuditList
    console.log(`[第六步] 开始创建 WorkAuditList，workId: ${task.workId}`);

    const createdAuditList = await workRcPrisma.workAuditList.create({
      data: {
        workId: task.workId,
        uid: task.uid,
        type: 'makav7',
        snapshotTime: task.snapshotTime,
        machineReviewResult: reviewStatus,
        passType: 'machine' as any,
        machineRiskLevel: riskResult.riskLevel,
        reason: riskResult.reason,
        reviewTime: reviewTime,
      } as any,
    });

    console.log(
      `[第六步] 成功创建 WorkAuditList 记录，审核结果: ${reviewStatus}, 风险等级: ${riskResult.riskLevel}, auditId: ${createdAuditList.id}`
    );

    // 第七步：更新 WorkAuditResult，关联最后一次审核
    console.log(`[第七步] 开始更新 WorkAuditResult，workId: ${task.workId}`);

    // 查询是否已存在 WorkAuditResult
    const existingAuditResult = await workRcPrisma.workAuditResult.findUnique({
      where: {
        workId: task.workId,
      },
    });

    const auditResultData = {
      workId: task.workId,
      uid: task.uid,
      type: 'makav7' as const,
      pv: task.pv,
      uv: task.uv,
      historyPv: task.historyPv,
      historyUv: task.historyUv,
      meta: {
        title: workInfo.title,
        create_time:
          workInfo.create_time instanceof Date
            ? workInfo.create_time.toISOString()
            : workInfo.create_time,
        update_time:
          workInfo.update_time instanceof Date
            ? workInfo.update_time.toISOString()
            : workInfo.update_time,
        thumb: workInfo.thumb,
        status: workInfo.status,
      } as any,
      lastReviewTime: reviewTime,
      reviewCount: existingAuditResult
        ? existingAuditResult.reviewCount + 1
        : 1,
      lastAuditId: createdAuditList.id, // 关联最后一次审核
    };

    if (existingAuditResult) {
      await workRcPrisma.workAuditResult.update({
        where: {
          workId: task.workId,
        },
        data: auditResultData,
      });
      console.log(
        `[第七步] 成功更新 WorkAuditResult，workId: ${task.workId}，关联审核记录: ${createdAuditList.id}`
      );
    } else {
      await workRcPrisma.workAuditResult.create({
        data: auditResultData,
      });
      console.log(
        `[第七步] 成功创建 WorkAuditResult，workId: ${task.workId}，关联审核记录: ${createdAuditList.id}`
      );
    }

    // 第八步：更新 review_tasks 表的 status
    console.log(`[第八步] 开始更新 review_tasks 状态，taskId: ${task.id}`);
    await workRcPrisma.reviewTask.update({
      where: {
        id: task.id,
      },
      data: {
        status: 'completed',
      },
    });

    console.log(
      `[第八步] 成功更新 review_tasks 状态为 completed，taskId: ${task.id}`
    );

    console.log(`[处理任务] 任务 ${task.id} 处理完成\n`);
    return 'processed';
  } catch (error) {
    console.error(`[处理任务] 处理任务 ${task.id} 时出错:`, error);
    return 'error';
  }
}

/**
 * 主函数：执行审核任务
 */
async function main() {
  const workRcPrisma = initWorkRcPrisma();

  try {
    // 启动时加载敏感词关键词库
    console.log('[启动] 开始加载敏感词关键词库...');
    await loadSensitiveWords(workRcPrisma);

    // 第一步：读取 review_tasks 表中 status 为 pending 且 snapshot_time 在 15 分钟前且 type 为 makav7 的记录
    const fifteenMinutesAgo = dayjs().subtract(15, 'minute').toDate();

    console.log(
      `[第一步] 开始查询审核任务，时间阈值: ${dayjs(fifteenMinutesAgo).format('YYYY-MM-DD HH:mm:ss')}`
    );

    const pendingTasks = await workRcPrisma.reviewTask.findMany({
      where: {
        status: 'pending',
        type: 'makav7',
        snapshotTime: {
          lte: fifteenMinutesAgo,
        },
      },
      orderBy: {
        snapshotTime: 'asc',
      },
    });

    console.log(`[第一步] 查询到 ${pendingTasks.length} 个待审核任务`);

    if (pendingTasks.length === 0) {
      console.log('没有待审核的任务，结束。');
      return;
    }

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 并行处理，每批20个任务
    const BATCH_SIZE = 20;
    for (let i = 0; i < pendingTasks.length; i += BATCH_SIZE) {
      const batch = pendingTasks.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pendingTasks.length / BATCH_SIZE);

      console.log(
        `[批次处理] 开始处理第 ${batchNumber}/${totalBatches} 批，本批 ${batch.length} 个任务`
      );

      // 并行处理当前批次的所有任务
      const results = await Promise.all(
        batch.map(task => processTask(workRcPrisma, task))
      );

      // 统计结果
      for (const result of results) {
        if (result === 'processed') {
          processedCount++;
        } else if (result === 'skipped') {
          skippedCount++;
        } else {
          errorCount++;
        }
      }

      // 显示进度
      console.log(
        `[批次处理] 第 ${batchNumber}/${totalBatches} 批完成，进度: ${processedCount + skippedCount + errorCount}/${pendingTasks.length} (成功: ${processedCount}, 跳过: ${skippedCount}, 错误: ${errorCount})`
      );
    }

    console.log('\n处理完成！');
    console.log(`处理成功: ${processedCount} 个`);
    console.log(`跳过: ${skippedCount} 个`);
    console.log(`错误: ${errorCount} 个`);
  } catch (error) {
    console.error('执行失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await workRcPrisma.$disconnect();
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

export { main };
