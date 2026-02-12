# 双云服务配置指南

本项目支持**阿里云 OSS** 和 **AWS S3** 双云服务，可根据地区自动选择最佳服务提供商。

## 配置方式

### 环境变量配置

通过 `CLOUD_PROVIDER` 环境变量指定云服务提供商：

```bash
# 使用阿里云（默认，中国大陆）
CLOUD_PROVIDER=aliyun

# 使用 AWS S3（国际化）
CLOUD_PROVIDER=aws
```

### 阿里云 OSS 配置

```bash
# 云服务提供商
CLOUD_PROVIDER=aliyun

# 阿里云 AccessKey
ALIYUN_AK_ID=LTAI5...
ALIYUN_AK_SECRET=xxxxxxxxxxxxx

# OSS 配置
OSS_MAIN_BUCKET=your-aliyun-bucket
OSS_REGION=oss-cn-beijing

# STS 角色 ARN
STS_ROLE_ARN=acs:ram::账号ID:role/角色名称
```

### AWS S3 配置

```bash
# 云服务提供商
CLOUD_PROVIDER=aws

# AWS 凭证
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx

# S3 配置
S3_BUCKET=your-aws-bucket
AWS_REGION=us-east-1

# AWS IAM 角色 ARN
AWS_ROLE_ARN=arn:aws:iam::账号ID:role/角色名称
```

## 技术实现

### 1. 统一配置接口

```typescript
export interface AliCloudConfig {
  provider?: 'aliyun' | 'aws'; // 默认 'aliyun'
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  roleArn?: string;
}
```

### 2. 自动降级

如果未指定 `CLOUD_PROVIDER`，系统会：

1. 优先使用阿里云环境变量（`ALIYUN_AK_ID` 等）
2. 如果阿里云环境变量不存在，尝试使用 AWS 环境变量
3. 默认 provider 为 `aliyun`

### 3. STS 实现差异

#### 阿里云 STS

- 使用 HTTP 签名请求直接调用阿里云 API
- Endpoint: `https://sts.aliyuncs.com`
- 签名算法: HMAC-SHA1
- 策略格式: 阿里云 RAM 策略

#### AWS STS

- 使用 AWS SDK `@aws-sdk/client-sts`
- 通过 AWS SDK 自动处理签名
- 策略格式: AWS IAM 策略

### 4. S3 客户端

两种云服务都使用 **AWS SDK S3Client**，因为：

- ✅ 阿里云 OSS 完全兼容 S3 协议
- ✅ 统一的客户端 API
- ✅ 相同的上传/下载逻辑

## 使用场景

### 场景 1：中国大陆用户

```bash
CLOUD_PROVIDER=aliyun
# ... 阿里云配置
```

- 更快的访问速度
- 更好的网络稳定性
- 符合数据合规要求

### 场景 2：国际用户

```bash
CLOUD_PROVIDER=aws
# ... AWS 配置
```

- 全球 CDN 加速
- 更好的国际访问体验
- 多地区部署

### 场景 3：混合部署

可以为不同地区的部署配置不同的云服务：

```bash
# 中国大陆服务器
CLOUD_PROVIDER=aliyun
ALIYUN_AK_ID=...
# ...

# 国际服务器
CLOUD_PROVIDER=aws
AWS_ACCESS_KEY_ID=...
# ...
```

## 测试

### 测试阿里云配置

```bash
# 设置环境变量
export CLOUD_PROVIDER=aliyun
export ALIYUN_AK_ID=...
export ALIYUN_AK_SECRET=...
export OSS_MAIN_BUCKET=...
export OSS_REGION=oss-cn-beijing
export STS_ROLE_ARN=acs:ram::...

# 启动服务
pnpm dev:jiantie

# 访问测试页面
http://localhost:3000/test-page/oss-sts-test
```

### 测试 AWS 配置

```bash
# 设置环境变量
export CLOUD_PROVIDER=aws
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export S3_BUCKET=...
export AWS_REGION=us-east-1
export AWS_ROLE_ARN=arn:aws:iam::...

# 启动服务
pnpm dev:jiantie

# 访问测试页面
http://localhost:3000/test-page/oss-sts-test
```

## 常见问题

### Q: 可以同时配置两个云服务吗？

A: 不建议。每个部署实例应该使用一个云服务提供商。如需混合部署，建议使用多个部署实例。

### Q: 如何切换云服务提供商？

A: 只需修改环境变量 `CLOUD_PROVIDER` 和对应的凭证，无需修改代码。

### Q: endpoint 会自动切换吗？

A: 是的，系统会根据 `provider` 自动生成正确的 endpoint：

- 阿里云: `https://{bucket}.{region}.aliyuncs.com`
- AWS: `https://{bucket}.s3.{region}.amazonaws.com`

### Q: 视频上传支持两个云服务吗？

A: 是的，`uploadFile2` 函数会自动使用当前配置的云服务。

## 安全建议

1. **不同环境使用不同凭证**
2. **定期轮换密钥**
3. **使用 RAM/IAM 子账号，避免主账号**
4. **最小权限原则**
5. **启用 MFA 多因素认证**

## 监控建议

建议在生产环境监控以下指标：

- STS token 获取成功率
- 文件上传成功率
- 响应时间（按地区统计）
- 错误率（区分云服务提供商）
