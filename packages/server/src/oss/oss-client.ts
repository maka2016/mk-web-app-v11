import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import {
  AssumeRoleCommand,
  STSClient,
  type AssumeRoleCommandOutput,
} from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * 阿里云统一配置接口
 * 包含OSS和STS所需的所有配置项
 */
export interface AliCloudConfig {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  roleArn?: string; // STS 需要
}

export interface STSResponse {
  hostId: string;
  bucket: string;
  uploadPath: string;
  credentials: {
    AccessKeyId: string;
    AccessKeySecret: string;
    SecurityToken: string;
    Expiration: string;
  };
}

/**
 * 从环境变量加载阿里云配置（统一入口）
 * 延迟读取环境变量，避免在模块加载时读取
 */
export function loadAliCloudConfigFromEnv(): AliCloudConfig {
  const accessKeyId = process.env.ALIYUN_AK_ID;
  const accessKeySecret = process.env.ALIYUN_AK_SECRET;
  const bucket = process.env.OSS_MAIN_BUCKET;
  const region = process.env.OSS_REGION;
  const roleArn = process.env.STS_ROLE_ARN;

  if (!accessKeyId || !accessKeySecret || !bucket || !region) {
    console.error(
      '[loadAliCloudConfigFromEnv] Missing required environment variables:',
      {
        hasALIYUN_AK_ID: !!accessKeyId,
        hasALIYUN_AK_SECRET: !!accessKeySecret,
        hasOSS_MAIN_BUCKET: !!bucket,
        hasOSS_REGION: !!region,
      }
    );

    throw new Error(
      'Missing required environment variables: ALIYUN_AK_ID, ALIYUN_AK_SECRET, OSS_MAIN_BUCKET, OSS_REGION'
    );
  }

  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    region,
    roleArn,
  };
}

/**
 * 创建 STS 客户端（AWS SDK）
 */
function createSTSClient(config: AliCloudConfig): STSClient {
  const endpoint = `https://sts.aliyuncs.com`;

  return new STSClient({
    region: config.region || 'cn-beijing',
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret,
    },
  });
}

/**
 * 获取 STS 临时凭证
 * @param config - 阿里云配置
 * @param appid - 应用 ID
 * @param uid - 用户 ID
 * @param durationSeconds - 临时凭证有效期（秒），默认 3600，最小900，最大以角色设定为准
 * @returns STS 响应数据
 */
export async function getSTSToken(
  config: AliCloudConfig,
  appid: string,
  uid: number,
  durationSeconds: number = 3600
): Promise<STSResponse> {
  try {
    const client = createSTSClient(config);

    const roleArn = 'roleArn' in config ? config.roleArn : undefined;
    if (!roleArn) {
      throw new Error('Missing STS_ROLE_ARN in configuration');
    }

    const sessionName = `${appid}-user-${uid}-${Date.now()}`;
    const uploadPath = `cdn/${appid}/works-resources/${uid}/`;

    const policy = JSON.stringify({
      Version: '1',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'oss:PutObject',
            'oss:GetObject',
            'oss:DeleteObject',
            'oss:ListObjects',
          ],
          Resource: [
            `acs:oss:*:*:${config.bucket}/${uploadPath}*`,
            `acs:oss:*:*:${config.bucket}/${uploadPath}`,
          ],
        },
      ],
    });

    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      DurationSeconds: durationSeconds,
      Policy: policy,
    });

    const result: AssumeRoleCommandOutput = await client.send(command);

    if (!result.Credentials) {
      throw new Error('Failed to get STS credentials');
    }

    const region = config.region || 'oss-cn-beijing';
    const hostId = `https://${config.bucket}.${region}.aliyuncs.com`;

    return {
      hostId,
      bucket: config.bucket,
      uploadPath,
      credentials: {
        AccessKeyId: result.Credentials.AccessKeyId!,
        AccessKeySecret: result.Credentials.SecretAccessKey!,
        SecurityToken: result.Credentials.SessionToken!,
        Expiration: result.Credentials.Expiration!.toISOString(),
      },
    };
  } catch (error) {
    console.error('[getSTSToken] Failed to generate STS token:', error);
    throw new Error(`Failed to generate STS token: ${error}`);
  }
}

/**
 * 创建 OSS 客户端（使用 AWS SDK S3Client）
 * 注意：仅在服务端使用，不要暴露给前端
 */
export function createOSSClient(config: AliCloudConfig): S3Client {
  const formattedRegion = config.region.startsWith('oss-')
    ? config.region
    : `oss-${config.region}`;

  let endpoint: string;
  const lanEndpoint = process.env.OSS_LAN_ENDPOINT;

  if (lanEndpoint) {
    endpoint = lanEndpoint.startsWith('http')
      ? lanEndpoint
      : `https://${lanEndpoint}`;
  } else {
    endpoint = `https://${formattedRegion}.aliyuncs.com`;
  }

  return new S3Client({
    region: formattedRegion,
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret,
    },
    forcePathStyle: false,
  });
}

/**
 * 上传文件到 OSS
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param key - OSS 路径
 * @param file - 文件内容（Buffer 或 字符串）
 * @returns 上传结果
 */
export async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  file: Buffer | string
) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
    });

    const result = await client.send(command);

    const endpoint = (client.config.endpoint as any)?.();
    const url = endpoint
      ? `${endpoint.protocol}//${bucket}.${endpoint.hostname}/${key}`
      : `https://${bucket}.oss-cn-beijing.aliyuncs.com/${key}`;

    return {
      name: key,
      url: url,
      res: result,
    };
  } catch (error) {
    console.error('[uploadFile] Failed to upload:', key, error);
    throw new Error(`Failed to upload file: ${error}`);
  }
}

/**
 * 获取 OSS 对象
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param key - OSS 路径
 * @returns 对象内容
 */
export async function getObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<{ content: Buffer }> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const result = await client.send(command);

    const chunks: Uint8Array[] = [];
    for await (const chunk of result.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      content: buffer,
    };
  } catch (error) {
    console.error('[getObject] Failed to get:', key, error);
    throw new Error(`Failed to get object: ${error}`);
  }
}

/**
 * 列出 OSS 对象
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param prefix - 前缀
 * @param marker - 分页标记
 * @param maxKeys - 最大返回数量
 * @returns 对象列表
 */
export async function listObjects(
  client: S3Client,
  bucket: string,
  prefix?: string,
  marker?: string,
  maxKeys: number = 1000
): Promise<{
  objects: Array<{ name: string; size?: number; lastModified?: Date }>;
  nextMarker?: string;
  isTruncated: boolean;
}> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: marker,
      MaxKeys: maxKeys,
    });

    const result: ListObjectsV2CommandOutput = await client.send(command);

    const objects = (result.Contents || []).map(item => ({
      name: item.Key!,
      size: item.Size,
      lastModified: item.LastModified,
    }));

    return {
      objects,
      nextMarker: result.NextContinuationToken,
      isTruncated: result.IsTruncated || false,
    };
  } catch (error) {
    console.error('[listObjects] Failed to list:', prefix, error);
    throw new Error(`Failed to list objects: ${error}`);
  }
}

/**
 * 删除 OSS 文件
 */
export async function deleteFile(
  client: S3Client,
  bucket: string,
  key: string
) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const result = await client.send(command);
    return result;
  } catch (error) {
    console.error('[deleteFile] Failed to delete:', key, error);
    throw new Error(`Failed to delete file: ${error}`);
  }
}

/**
 * 生成签名URL（用于临时访问私有文件）
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param key - OSS 路径
 * @param expires - 过期时间（秒），默认3600秒
 * @returns 签名URL
 */
export async function generateSignedUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expires: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: expires });
    return url;
  } catch (error) {
    console.error(
      '[generateSignedUrl] Failed to generate signed URL:',
      key,
      error
    );
    throw new Error(`Failed to generate signed URL: ${error}`);
  }
}
