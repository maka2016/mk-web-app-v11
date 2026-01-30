import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * OSS 客户端配置接口（兼容 ali-oss）
 */
export interface OSSClientOptions {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  accessKeySecret: string;
  stsToken?: string;
  bucket: string;
  secure?: boolean;
}

/**
 * 上传进度回调
 */
export type ProgressCallback = (progress: number) => void;

/**
 * 分片上传选项
 */
export interface MultipartUploadOptions {
  progress?: ProgressCallback;
  partSize?: number;
  parallel?: number;
}

/**
 * 上传结果
 */
export interface UploadResult {
  name: string;
  url: string;
  res: {
    status: number;
    headers: Record<string, string>;
    requestUrls: string[];
  };
}

/**
 * 兼容 ali-oss 的 OSS 客户端包装器
 * 内部使用 AWS SDK S3 Client，避免 ali-oss 的构建问题
 */
export class OSSClientCompat {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;
  private region: string;

  constructor(options: OSSClientOptions) {
    this.bucket = options.bucket;
    this.region = options.region;
    this.endpoint =
      options.endpoint || `https://${options.region}.aliyuncs.com`;

    this.s3Client = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.accessKeySecret,
        sessionToken: options.stsToken,
      },
      endpoint: this.endpoint,
      forcePathStyle: false,
    });
  }

  /**
   * 分片上传（兼容 ali-oss 的 multipartUpload API）
   * @param objectName - OSS 对象名称（路径）
   * @param file - 文件对象
   * @param options - 上传选项
   */
  async multipartUpload(
    objectName: string,
    file: File | Blob | Buffer,
    options?: MultipartUploadOptions
  ): Promise<UploadResult> {
    try {
      // 简单实现：不做真正的分片，直接上传整个文件
      // 如果需要真正的分片上传，需要使用 @aws-sdk/lib-storage 的 Upload 类

      const body =
        file instanceof File || file instanceof Blob ? file : Buffer.from(file);

      // 模拟进度回调
      if (options?.progress) {
        options.progress(0.1);
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectName,
        Body: body,
      });

      const result = await this.s3Client.send(command);

      // 模拟进度完成
      if (options?.progress) {
        options.progress(1);
      }

      // 构建 URL
      const url = `${this.endpoint.replace(/https?:\/\//, `https://${this.bucket}.`)}/${objectName}`;

      return {
        name: objectName,
        url,
        res: {
          status: result.$metadata.httpStatusCode || 200,
          headers: (result.$metadata as any).headers || {},
          requestUrls: [url],
        },
      };
    } catch (error) {
      console.error('[OSSClientCompat] Upload failed:', error);
      throw error;
    }
  }

  /**
   * 简单上传（兼容 ali-oss 的 put API）
   * @param objectName - OSS 对象名称（路径）
   * @param file - 文件对象
   */
  async put(
    objectName: string,
    file: File | Blob | Buffer
  ): Promise<UploadResult> {
    return this.multipartUpload(objectName, file);
  }
}

/**
 * 创建兼容 ali-oss 的客户端
 * 用于替代 ali-oss 的默认导出
 */
export default OSSClientCompat;
