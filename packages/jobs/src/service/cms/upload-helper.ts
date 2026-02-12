import {
  createOSSClient,
  loadAliCloudConfigFromEnv,
  uploadFile,
} from '@mk/jiantie/server';
import { bitFileRaw } from './bit_tables/types';
import { getLarkClient } from './lark';

/**
 * 获取飞书 Access Token
 * @returns Access Token
 */
async function getLarkAccessToken(): Promise<string> {
  const larkClient = await getLarkClient();
  const token = await larkClient.tokenManager.getTenantAccessToken();
  if (!token) {
    throw new Error('获取飞书 Access Token 失败');
  }
  return token;
}

/**
 * 获取飞书文件的临时下载链接
 * @param fileToken 文件 token
 * @returns 临时下载链接
 */
async function getLarkTmpDownloadUrl(file: bitFileRaw): Promise<string> {
  const accessToken = await getLarkAccessToken();

  const response = await fetch(`${file.tmp_url}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  console.log('resp', data);

  if (
    data.code !== 0 ||
    !data.data?.tmp_download_urls ||
    data.data.tmp_download_urls.length === 0
  ) {
    throw new Error(`获取飞书文件临时下载链接失败: ${file.name}, ${data.msg}`);
  }

  const downloadUrl = data.data.tmp_download_urls[0]?.tmp_download_url;
  if (!downloadUrl) {
    throw new Error(`飞书文件临时下载链接为空: ${file.name}`);
  }

  return downloadUrl;
}

/**
 * 下载飞书图片并上传到 OSS
 * @param fileInfo 飞书文件信息
 * @param appid 应用ID，默认为 'jiantie'
 * @returns OSS 路径
 */
export async function downloadAndUploadLarkImage(
  fileInfo: bitFileRaw,
  appid: string = 'jiantie'
): Promise<string> {
  try {
    // 1. 获取飞书文件的临时下载链接
    console.log(
      `开始获取飞书图片下载链接: ${fileInfo.name}, file_token: ${fileInfo.file_token}`
    );
    const downloadUrl = await getLarkTmpDownloadUrl(fileInfo);
    console.log(`获取到临时下载链接: ${downloadUrl}`);

    // 2. 下载飞书图片（需要带 Bearer Token）
    console.log(`开始下载飞书图片: ${fileInfo.name}`);
    const accessToken = await getLarkAccessToken();
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `下载飞书图片失败: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`图片下载成功，大小: ${buffer.length} bytes`);

    // 3. 创建 OSS 客户端
    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);

    // 4. 生成 OSS 路径
    // 提取文件扩展名
    const fileExtension = getFileExtension(fileInfo.name);
    const timestamp = Date.now();
    //日期20221010
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const ossPath = `cdn/${appid}/lark-images/cms/${date}/${timestamp}${fileExtension}`;

    console.log(`开始上传到 OSS: ${ossPath}`);

    // 5. 上传到 OSS
    const result = await uploadFile(ossClient, config.bucket, ossPath, buffer);

    console.log(`上传成功: ${result.url}`);

    // 返回 OSS 路径（不包含 bucket 和域名）
    return ossPath;
  } catch (error) {
    console.error('下载并上传飞书图片失败:', error);
    throw error;
  }
}

/**
 * 批量下载并上传飞书图片
 * @param files 飞书文件列表
 * @param appid 应用ID
 * @returns OSS 路径列表
 */
export async function batchDownloadAndUploadLarkImages(
  files: bitFileRaw[],
  appid: string = 'jiantie'
): Promise<string[]> {
  const results: string[] = [];

  for (const file of files) {
    try {
      const ossPath = await downloadAndUploadLarkImage(file, appid);
      results.push(ossPath);
    } catch (error) {
      console.error(`处理文件 ${file.name} 失败:`, error);
      // 继续处理下一个文件
    }
  }

  return results;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const reg = /\.[^.]+$/;
  const matches = reg.exec(filename);
  if (matches) {
    return matches[0];
  }
  return '.png'; // 默认扩展名
}

/**
 * 从 OSS 路径生成完整的 URL
 * @param ossPath OSS 路径
 * @param bucket bucket 名称
 * @returns 完整的 URL
 */
export function getOssUrl(ossPath: string): string {
  const config = loadAliCloudConfigFromEnv();
  const region = config.region.startsWith('oss-')
    ? config.region
    : `oss-${config.region}`;
  return `https://${config.bucket}.${region}.aliyuncs.com/${ossPath}`;
}
