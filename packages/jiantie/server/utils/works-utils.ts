import {
  PrismaClient,
  RsvpFormConfigEntity,
  TemplateEntity,
  WorksEntity,
  WorksSpecEntity,
} from '@mk/jiantie/v11-database/generated/client/client';
import { IWorksData } from '../../components/GridEditorV3/works-store/types';
import { convertLegacyToNew } from '../../components/GridEditorV3/works-store/utils/convertData';
import { log } from '../logger';
import { getTemplateDataFromOSS, getWorksDataFromOSS } from '../oss/works-storage';
/**
 * 服务端返回的作品实体类型（包含关联数据）
 */
export type SerializedWorksEntity = WorksEntity & {
  // 作品关联规格信息
  specInfo: WorksSpecEntity;
  // 作品关联的 RSVP 表单配置
  rsvp_form_config?: RsvpFormConfigEntity | null;
  // 作品列表的 RSVP 统计信息
  rsvpStats?: {
    invited?: number;
    replied?: number;
  } | null;
};

/**
 * 客户端接收的作品实体类型
 * tRPC 会将 Date 类型序列化为 string，这个类型明确反映了序列化后的结构
 *
 * 只转换已知的 Date 字段，避免复杂的递归类型推导
 */
export type SerializedWorksEntityForClient = Omit<
  SerializedWorksEntity,
  'create_time' | 'update_time' | 'custom_time' | 'specInfo' | 'rsvp_form_config'
> & {
  create_time: string;
  update_time: string;
  custom_time: string;
  // specInfo 中的 Date 字段也需要转换
  specInfo: Omit<WorksSpecEntity, 'create_time' | 'update_time'> & {
    create_time: string;
    update_time: string;
  };
  // rsvp_form_config 可选，也需要转换其中的 Date 字段
  rsvp_form_config?:
    | (Omit<RsvpFormConfigEntity, 'create_time' | 'update_time' | 'submit_deadline'> & {
        create_time: string;
        update_time: string;
        submit_deadline: string | null;
      })
    | null;
};

export type SerializedTemplateEntity = TemplateEntity & {
  specInfo: WorksSpecEntity;
};

/**
 * 生成随机ID
 */
export function generateRandomId(length = 8): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 36).toString(36))
    .join('')
    .toUpperCase();
}

/**
 * 替换字符串中的路径
 * @param inputStr - 输入字符串
 * @param replaceStr - 要替换的字符串
 * @param targetStr - 目标字符串
 */
export function replacePath(inputStr: string, replaceStr: string, targetStr: string): string {
  console.log('[replacePath] Start:', {
    inputLength: inputStr?.length || 0,
    replaceStr,
    targetStr,
  });

  try {
    const regex = new RegExp(replaceStr, 'g');
    console.log('[replacePath] 正则表达式创建成功:', regex.toString());

    const result = inputStr.replace(regex, targetStr);

    // 计算替换次数
    const matches = inputStr.match(regex);
    const replaceCount = matches ? matches.length : 0;

    console.log('[replacePath] 替换完成:', {
      resultLength: result.length,
      replaceCount,
      changed: result !== inputStr,
    });

    return result;
  } catch (error) {
    console.error('[replacePath] ❌ 替换失败:', error);
    throw error;
  }
}

/**
 * 检查作品ID是否已存在
 */
export async function checkWorksId(prisma: PrismaClient, worksId: string): Promise<boolean> {
  const works = await prisma.worksEntity.findUnique({
    where: { id: worksId },
  });
  return !works; // 返回 true 表示可用（不存在）
}

/**
 * 生成唯一的作品ID
 */
export async function generateWorksId(prisma: PrismaClient, uid: number): Promise<string> {
  const worksId = `${generateRandomId()}_${uid}`;
  if (await checkWorksId(prisma, worksId)) {
    return worksId;
  }
  return generateWorksId(prisma, uid);
}

/**
 * 检查模板ID是否已存在
 */
export async function checkTemplateId(prisma: PrismaClient, templateId: string): Promise<boolean> {
  const template = await prisma.templateEntity.findUnique({
    where: { id: templateId },
  });
  return !template; // 返回 true 表示可用（不存在）
}

/**
 * 生成唯一的模板ID
 */
export async function generateTemplateId(prisma: PrismaClient): Promise<string> {
  const templateId = `T_${generateRandomId(12)}`;
  if (await checkTemplateId(prisma, templateId)) {
    return templateId;
  }
  return generateTemplateId(prisma);
}

/**
 * 获取作品数据（包含详情和OSS数据）
 * 共享函数，供 getWorksData 和 getViewerData 复用
 */
export async function getWorksDataWithOSS(params: {
  prisma: PrismaClient;
  worksId: string;
  version?: string;
}): Promise<{
  detail: SerializedWorksEntity;
  work_data: IWorksData;
  specInfo: WorksSpecEntity;
}> {
  const { prisma, worksId, version = 'latest' } = params;

  // 1. 获取作品详情（通过关联查询直接获取 spec 信息）
  const detail = await prisma.worksEntity.findUnique({
    where: { id: worksId },
    include: {
      specInfo: true, // 通过关联查询直接获取 spec 信息
      rsvp_form_config: true,
    },
  });

  log.info(
    {
      has: !detail,
      worksId,
      version,
    },
    'detail'
  );

  if (!detail) {
    console.log('作品不存在', {
      worksId,
      version,
    });
    throw new Error('作品不存在');
  }

  if (detail.deleted) {
    throw new Error('作品已删除');
  }

  const specInfo = detail.specInfo;

  // 2. 从 OSS 获取作品数据
  try {
    const work_data = await getWorksDataFromOSS(worksId, detail.uid, version === 'latest' ? 'latest' : version);

    return {
      detail: detail as SerializedWorksEntity,
      work_data: convertLegacyToNew(work_data),
      specInfo: specInfo || ({} as WorksSpecEntity), // 保持返回类型兼容性
    };
  } catch (error) {
    console.error('[getWorksDataWithOSS] Failed to get OSS data:', {
      worksId,
      uid: detail.uid,
      error,
    });
    // 如果获取 OSS 数据失败，只返回详情
    throw new Error(`Failed to get OSS data: ${error}`);
  }
}

/**
 * 获取模板数据（包含详情和OSS数据）
 * 共享函数，供 getTemplateData 和 getViewerData 复用
 */
export async function getTemplateDataWithOSS(params: { prisma: PrismaClient; templateId: string }): Promise<{
  detail: SerializedTemplateEntity;
  work_data: IWorksData;
  specInfo: WorksSpecEntity;
}> {
  const { prisma, templateId } = params;

  // 1. 获取模板详情（通过关联查询直接获取 spec 信息）
  const detail = await prisma.templateEntity.findUnique({
    where: { id: templateId },
    include: {
      specInfo: true, // 通过关联查询直接获取 spec 信息
    },
  });

  if (!detail) {
    throw new Error('模板不存在');
  }

  if (detail.deleted) {
    throw new Error('模板已删除');
  }

  const specInfo = detail.specInfo;

  // 2. 从 OSS 获取模板数据
  try {
    const work_data = await getTemplateDataFromOSS(templateId);

    log.info(work_data, 'work_data');
    return {
      detail: detail as SerializedTemplateEntity,
      work_data: convertLegacyToNew(work_data),
      specInfo: specInfo || ({} as WorksSpecEntity), // 保持返回类型兼容性
    };
  } catch (error) {
    console.error('[getTemplateDataWithOSS] Failed to get OSS data:', {
      templateId,
      error,
    });
    // 如果获取 OSS 数据失败，只返回详情
    throw new Error(`Failed to get OSS data: ${error}`);
  }
}
