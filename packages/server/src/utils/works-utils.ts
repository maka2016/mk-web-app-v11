import { PrismaClient } from '@workspace/database/generated/client';

/**
 * 生成随机ID
 */
export function generateRandomId(length = 8): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36)
  )
    .join('')
    .toUpperCase();
}

/**
 * 替换字符串中的路径
 * @param inputStr - 输入字符串
 * @param replaceStr - 要替换的字符串
 * @param targetStr - 目标字符串
 */
export function replacePath(
  inputStr: string,
  replaceStr: string,
  targetStr: string
): string {
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
export async function checkWorksId(
  prisma: PrismaClient,
  worksId: string
): Promise<boolean> {
  const works = await prisma.worksEntity.findUnique({
    where: { id: worksId },
  });
  return !works; // 返回 true 表示可用（不存在）
}

/**
 * 生成唯一的作品ID
 */
export async function generateWorksId(
  prisma: PrismaClient,
  uid: number
): Promise<string> {
  const worksId = `${generateRandomId()}_${uid}`;
  if (await checkWorksId(prisma, worksId)) {
    return worksId;
  }
  return generateWorksId(prisma, uid);
}
