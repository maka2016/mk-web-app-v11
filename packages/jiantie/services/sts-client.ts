import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import OSS from 'ali-oss';
import { getAppId, getToken, getUid } from './request';

let ossClientData: {
  client: S3Client | OSS;
  clientInfo: {
    region: string;
    endpoint: string;
    accessKeyId: string;
    accessKeySecret: string;
    stsToken: string;
    bucket: string;
  };
  uploadPath: string;
  bucket: string;
  provider?: 'aliyun' | 'aws'; // 云服务提供商
} | null;

/**
 * 初始化 STS OSS 客户端（使用 AWS SDK S3Client）
 */
export async function startupStsOssClient(
  payload: {
    appid?: string;
    uid?: string | number;
    token?: string;
    /** 访客场景：作品 ID，用于 STS 服务器端生成访客 uid */
    worksId?: string;
    /** 访客场景：客户端特征 ID（本地持久化），与 worksId 一起生成 uid */
    clientFeatureId?: string;
  } = {},
  resetClient = false,
  retryTime = 0
) {
  const {
    appid = getAppId(),
    uid,
    token = getToken(),
    worksId,
    clientFeatureId,
  } = payload;

  if (!resetClient && ossClientData) return ossClientData;

  const response = await fetch('/api/oss-sts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify(
      worksId && clientFeatureId
        ? {
            appid,
            worksId,
            clientFeatureId,
            duration: 3600,
          }
        : {
            appid,
            uid: uid != null ? String(uid) : getUid(),
            duration: 3600,
          }
    ),
  });
  const res = await response.json();
  console.log('[startupStsOssClient] STS 响应:', res);

  if (retryTime > 3) {
    throw new Error('oss client error: 重试次数超过限制');
  }

  // 检查错误
  if (res.error || (res as any).message === 'tokenError') {
    console.error('[startupStsOssClient] STS 获取失败:', res);
    return await startupStsOssClient(payload, true, retryTime + 1);
  }

  // 验证必需字段
  if (!res.credentials || !res.bucket || !res.uploadPath) {
    console.error('[startupStsOssClient] STS 响应缺少必需字段:', res);
    throw new Error('Invalid STS response: missing required fields');
  }

  const ossRegion = res.region || 'oss-cn-beijing';
  const provider = res.provider || 'aliyun';

  const clientInfo = {
    region: ossRegion,
    endpoint: res.hostId || `https://${res.bucket}.${ossRegion}.aliyuncs.com`,
    accessKeyId: res.credentials.AccessKeyId,
    accessKeySecret: res.credentials.AccessKeySecret,
    stsToken: res.credentials.SecurityToken,
    bucket: res.bucket,
  };

  let client: S3Client | OSS;

  if (provider === 'aws') {
    // AWS S3：使用 AWS SDK
    const awsStyleRegion = ossRegion.replace('oss-', '');
    client = new S3Client({
      region: awsStyleRegion,
      endpoint: clientInfo.endpoint,
      credentials: {
        accessKeyId: res.credentials.AccessKeyId,
        secretAccessKey: res.credentials.AccessKeySecret,
        sessionToken: res.credentials.SecurityToken,
      },
      forcePathStyle: false,
      tls: true,
    });
  } else {
    // 阿里云 OSS：使用阿里云官方 SDK
    client = new OSS({
      region: ossRegion,
      accessKeyId: res.credentials.AccessKeyId,
      accessKeySecret: res.credentials.AccessKeySecret,
      stsToken: res.credentials.SecurityToken,
      bucket: res.bucket,
      secure: true,
    });
  }

  ossClientData = {
    client,
    clientInfo,
    uploadPath: res.uploadPath,
    bucket: res.bucket,
    provider,
  };

  return ossClientData;
}

/**
 * 上传文件到 OSS（双云服务支持）
 * - 阿里云：使用阿里云官方 SDK
 * - AWS：使用 AWS SDK
 */
export async function uploadFileToOSS(
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; name: string }> {
  try {
    const { client, uploadPath, bucket, clientInfo, provider } =
      await startupStsOssClient();

    if (!client) {
      throw new Error(
        'OSS client not initialized. Call startupStsOssClient first.'
      );
    }

    const fullPath = `${uploadPath}${path}`;

    console.log('[uploadFileToOSS] 开始上传:', {
      provider: provider || 'aliyun',
      fullPath,
      bucket,
      endpoint: clientInfo.endpoint,
      fileSize: file.size,
      fileType: file.type,
    });

    if (provider === 'aws') {
      // AWS S3：使用 AWS SDK
      console.log('[uploadFileToOSS] 使用 AWS SDK 上传');

      const arrayBuffer = await file.arrayBuffer();

      if (onProgress) {
        onProgress(0.1);
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fullPath,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type,
        ACL: 'public-read',
      });

      await (client as S3Client).send(command);

      if (onProgress) {
        onProgress(1);
      }

      console.log('[uploadFileToOSS] AWS SDK 上传成功');
    } else {
      // 阿里云 OSS：使用阿里云官方 SDK
      console.log('[uploadFileToOSS] 使用阿里云 OSS SDK 上传');

      const result = await (client as OSS).put(fullPath, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        ...(onProgress && {
          progress: (p: number) => {
            onProgress(p);
          },
        }),
      });

      console.log('[uploadFileToOSS] 阿里云 OSS SDK 上传成功:', result.name);
    }

    // 构建 URL
    const url = `/${fullPath}`;

    return {
      url,
      name: fullPath,
    };
  } catch (error) {
    console.error('[uploadFileToOSS] 上传失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3),
      });
    }
    throw error;
  }
}

/**
 * 获取当前 OSS 客户端数据
 */
export function getOssClientData() {
  return ossClientData;
}

/**
 * 清除 OSS 客户端缓存
 */
export function clearOssClient() {
  ossClientData = null as any;
}
