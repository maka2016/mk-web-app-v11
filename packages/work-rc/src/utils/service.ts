import {
  createOSSClient,
  getObject,
  loadAliCloudConfigFromEnv,
} from '@mk/jiantie/server';

/**
 * 生成用户作品数据存储路径
 */
export const wrapUserWorksDataStoragePath = ({
  uid,
  worksId,
  version,
}: {
  uid: number;
  worksId: string;
  version: string;
}) => {
  return `user/${uid}/event/${worksId}/${worksId}_v${version}.json`;
};

/**
 * 从 OSS 获取作品 JSON 数据
 * @param worksId - 作品ID
 * @param uid - 用户ID
 * @param version - 版本号（默认 'latest'）
 * @returns 作品 JSON 数据
 */
export async function getWorksDataFromOSS(
  worksId: string,
  uid: number,
  version: number = 0
): Promise<any> {
  try {
    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);
    const storagePath = wrapUserWorksDataStoragePath({
      uid,
      worksId,
      version: String(version),
    });

    const result = await getObject(ossClient, config.bucket, storagePath);
    return JSON.parse(result.content.toString());
  } catch (error) {
    console.error(
      '[getWorksDataFromOSS] Failed:',
      { worksId, uid, version },
      error
    );
    throw new Error(`Failed to get works data from OSS: ${error}`);
  }
}

/**
 * JSON 特征提取结果
 */
export interface JsonFeatures {
  /** 文字组件个数 */
  textCount: number;
  /** 文字组件内容列表 */
  textContents: string[];
  /** 图片组件个数 */
  imageCount: number;
  /** 图片 URL 列表 */
  imageUrls: string[];
  /** 用户上传的图片个数（URL中包含用户uid的图片） */
  userUploadedImageCount: number;
  /** 用户上传的图片 URL 列表 */
  userUploadedImageUrls: string[];
  /** 外链个数 */
  linkCount: number;
  /** 外链 URL 列表 */
  linkUrls: string[];
  /** 页面数量 */
  pageCount: number;
  /** 背景图片 URL 列表 */
  backgroundImageUrls: string[];
}

/**
 * 判断图片URL是否包含指定的用户uid
 * @param url - 图片URL
 * @param uid - 用户ID
 * @returns 是否包含该用户的uid
 */
function isUserUploadedImage(url: string, uid: number): boolean {
  if (!url || !uid) return false;
  // 检查URL中是否包含 /user/{uid}/ 或 user/{uid}/（允许开头或路径中）
  const uidPattern = new RegExp(`(^|[\\/])user[\\/]${uid}[\\/]`, 'i');
  return uidPattern.test(url);
}

/**
 * 递归遍历对象，提取特征
 */
function traverseAndExtractFeatures(
  obj: any,
  features: JsonFeatures,
  uid?: number
): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => traverseAndExtractFeatures(item, features, uid));
    return;
  }

  // 处理 pages（可能是对象或数组）
  if (obj.pages) {
    const pages = obj.pages;
    if (Array.isArray(pages)) {
      features.pageCount = Math.max(features.pageCount, pages.length);
    } else if (typeof pages === 'object') {
      features.pageCount = Math.max(
        features.pageCount,
        Object.keys(pages).length
      );
    }
  }

  // 处理背景图片
  if (obj.bgpic && typeof obj.bgpic === 'string' && obj.bgpic.trim()) {
    features.backgroundImageUrls.push(obj.bgpic);
  }
  if (
    obj.background?.bgpic &&
    typeof obj.background.bgpic === 'string' &&
    obj.background.bgpic.trim()
  ) {
    features.backgroundImageUrls.push(obj.background.bgpic);
  }

  // 处理新格式：MkText 文字组件
  if (obj.elementRef === 'MkText' && obj.attrs?.planText) {
    const planText = obj.attrs.planText;
    if (typeof planText === 'string' && planText.trim()) {
      features.textCount++;
      features.textContents.push(planText);
    }
  }

  // 处理新格式：MkPicture 图片组件
  if (obj.elementRef === 'MkPicture' && obj.attrs?.ossPath) {
    const ossPath = obj.attrs.ossPath;
    if (typeof ossPath === 'string' && ossPath.trim()) {
      features.imageUrls.push(ossPath);
      if (uid && isUserUploadedImage(ossPath, uid)) {
        features.userUploadedImageUrls.push(ossPath);
      }
    }
  }

  // 处理旧格式：text 文字组件
  if (obj.type === 'text' && obj.text) {
    const text = typeof obj.text === 'string' ? obj.text : obj.text.content;
    if (text && typeof text === 'string' && text.trim()) {
      features.textCount++;
      features.textContents.push(text);
    }
  }

  // 处理旧格式：pic 图片组件
  if (obj.type === 'pic') {
    const picUrl = obj.picid || obj.pcEditorPicId;
    if (picUrl && typeof picUrl === 'string' && picUrl.trim()) {
      features.imageUrls.push(picUrl);
      if (uid && isUserUploadedImage(picUrl, uid)) {
        features.userUploadedImageUrls.push(picUrl);
      }
    }
    // imgUrl 是外链地址
    if (obj.imgUrl && typeof obj.imgUrl === 'string' && obj.imgUrl.trim()) {
      features.linkUrls.push(obj.imgUrl);
    }
  }

  // 处理外链
  if (obj.linkUrl && typeof obj.linkUrl === 'string' && obj.linkUrl.trim()) {
    features.linkUrls.push(obj.linkUrl);
  }
  if (
    obj.linkInfo?.linkUrl &&
    typeof obj.linkInfo.linkUrl === 'string' &&
    obj.linkInfo.linkUrl.trim()
  ) {
    features.linkUrls.push(obj.linkInfo.linkUrl);
  }
  // 处理 action 类型的外链
  if (
    obj.action?.type === 'link' &&
    obj.action?.actionAttrs?.value &&
    typeof obj.action.actionAttrs.value === 'string' &&
    obj.action.actionAttrs.value.trim()
  ) {
    features.linkUrls.push(obj.action.actionAttrs.value);
  }

  // 递归遍历所有属性
  Object.keys(obj).forEach(key => {
    traverseAndExtractFeatures(obj[key], features, uid);
  });
}

/**
 * 提取 JSON 特征
 * 通过遍历 key、value 进行统计，不区分新旧格式
 * @param jsonData - JSON 数据对象
 * @param uid - 用户ID（可选，用于区分用户上传的图片）
 * @returns 提取的特征信息
 */
export function extractJsonFeatures(jsonData: any, uid?: number): JsonFeatures {
  const features: JsonFeatures = {
    textCount: 0,
    textContents: [],
    imageCount: 0,
    imageUrls: [],
    userUploadedImageCount: 0,
    userUploadedImageUrls: [],
    linkCount: 0,
    linkUrls: [],
    pageCount: 0,
    backgroundImageUrls: [],
  };

  // 递归遍历整个 JSON 对象
  traverseAndExtractFeatures(jsonData, features, uid);

  // 去重合并相同的图片地址
  features.imageUrls = Array.from(new Set(features.imageUrls));
  features.imageCount = features.imageUrls.length;

  // 去重合并相同的用户上传图片地址
  features.userUploadedImageUrls = Array.from(
    new Set(features.userUploadedImageUrls)
  );
  features.userUploadedImageCount = features.userUploadedImageUrls.length;

  // 去重合并相同的外链地址
  features.linkUrls = Array.from(new Set(features.linkUrls));
  features.linkCount = features.linkUrls.length;

  // 去重合并相同的背景图片地址
  features.backgroundImageUrls = Array.from(
    new Set(features.backgroundImageUrls)
  );

  // 页面数量最小为1
  if (features.pageCount === 0) {
    features.pageCount = 1;
  }

  return features;
}
