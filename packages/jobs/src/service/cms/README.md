# 飞书多维表格图片上传到 OSS

## 功能说明

这个模块实现了将飞书多维表格中的图片下载并上传到阿里云 OSS（makapictrue）的功能。

## 使用方法

### 1. 环境变量配置

确保以下环境变量已配置：

```bash
ALIYUN_AK_ID=your_access_key_id
ALIYUN_AK_SECRET=your_access_key_secret
OSS_MAIN_BUCKET=makapictrue
OSS_REGION=cn-beijing
```

### 2. 在 chanels.ts 中的使用

```typescript
import { downloadAndUploadLarkImage } from './cms/upload-helper';

// 遍历飞书多维表格记录
for (const item of records) {
  if (item.fields['封面'] && !item.fields['封面url']) {
    const coverFiles = item.fields['封面'];
    if (coverFiles && coverFiles.length > 0) {
      const firstCover = coverFiles[0];

      // 下载并上传到 OSS
      const ossPath = await downloadAndUploadLarkImage(firstCover, 'jiantie');

      // ossPath 示例: cdn/jiantie/lark-images/1699000000000.png
      console.log('OSS 路径:', ossPath);

      // 回写到飞书
      await batchCreateAndUpdate(
        [],
        [
          {
            record_id: item.record_id,
            fields: {
              封面url: ossPath,
            },
          },
        ],
        sonBitTable,
        100
      );
    }
  }
}
```

### 3. 批量处理

```typescript
import { batchDownloadAndUploadLarkImages } from './cms/upload-helper';

// 批量处理多个图片
const coverFiles = item.fields['封面'];
const ossPaths = await batchDownloadAndUploadLarkImages(coverFiles, 'jiantie');
```

### 4. 生成完整 URL

```typescript
import { getOssUrl } from './cms/upload-helper';

const ossPath = 'cdn/jiantie/lark-images/1699000000000.png';
const fullUrl = getOssUrl(ossPath);
// fullUrl: https://makapictrue.oss-cn-beijing.aliyuncs.com/cdn/jiantie/lark-images/1699000000000.png
```

## 工作流程

1. **获取临时下载链接**：使用飞书 API `drive.v1.media.batchGetTmpDownloadUrl` 通过 `file_token` 获取临时下载链接（参考：[飞书官方文档](https://open.larksuite.com/document/server-docs/docs/drive-v1/media/batch_get_tmp_download_url)）
2. **下载飞书图片**：使用临时下载链接下载图片文件
3. **上传到 OSS**：将图片上传到 `cdn/{appid}/lark-images/` 目录
4. **返回路径**：返回不包含域名的 OSS 路径（如：`cdn/jiantie/lark-images/timestamp.png`）
5. **回写飞书**：将 OSS 路径回写到飞书多维表格的 `封面url` 字段

## 文件结构

- `upload-helper.ts` - 图片下载和上传工具函数
- `chanels.ts` - 栏目同步逻辑，包含图片处理
- `bit_tables/types.ts` - 飞书数据类型定义

## 错误处理

所有函数都包含错误处理，单个图片处理失败不会影响其他图片的处理。错误会被记录到控制台。

## 注意事项

1. 图片会被保存在 `cdn/{appid}/lark-images/` 目录下
2. 文件名为时间戳 + 原文件扩展名
3. 默认扩展名为 `.png`（如果无法识别）
4. OSS 路径不包含 bucket 和域名，便于迁移和切换 CDN
