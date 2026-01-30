# Token 认证模块

## 概述

基于 NestJS AuthGuard 模式实现的 Next.js API Routes 认证模块，用于验证用户 token 并确保请求的合法性。

## 功能特性

1. **多源 Token 提取**: 自动从 headers、query、cookies、body 提取 token
2. **用户中心验证**: 调用用户中心 API 验证 token 有效性
3. **UID/APPID 匹配**: 确保请求的 uid/appid 与 token 中的一致
4. **后门支持**: 开发测试时支持 `token=backdoor` 绕过验证

## API 文档

### 主要函数

#### `extractToken(request)`

从请求中提取 token。

**参数**:

```typescript
{
  headers?: Headers | Record<string, any>;
  url?: string;
  cookies?: Record<string, string>;
  body?: any;
}
```

**返回**: `string | null`

**优先级**:

1. Headers (`token` 字段)
2. URL Query (`?token=xxx`)
3. Cookies (`token` 字段)
4. Body (`token` 字段)

#### `tokenToUid(token)`

通过用户中心验证 token 并获取用户信息。

**参数**:

- `token: string` - 用户 token

**返回**:

```typescript
{
  uid: number | null;
  appid: string | null;
}
```

**环境变量**:

- `nest_user_center` - 用户中心服务地址

#### `validateRequest(token, requestedUid, requestedAppid?)`

验证 token 与请求参数的匹配性。

**参数**:

- `token: string` - 用户 token
- `requestedUid: number` - 请求中的 uid
- `requestedAppid?: string` - 请求中的 appid（可选）

**返回**:

```typescript
{
  isValid: boolean;
  uid: number | null;
  appid: string | null;
  token: string | null;
  error?: string;
}
```

**特殊处理**:

- `token === 'backdoor'`: 自动通过验证（仅用于开发测试）

#### `authenticateRequest(request, params)`

Next.js API Route 的完整认证流程。

**参数**:

```typescript
// request
{
  headers: Headers;
  url: string;
  body?: any;
}

// params
{
  uid: number;
  appid?: string;
}
```

**返回**: `TokenValidationResult`

## 使用示例

### 在 Next.js API Route 中使用

```typescript
import { authenticateRequest } from '@/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 获取请求参数
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  const uid = parseInt(searchParams.get('uid') || '0', 10);

  // 验证用户权限
  const authResult = await authenticateRequest(
    {
      headers: request.headers,
      url: request.url,
    },
    { uid, appid: appid || undefined }
  );

  // 检查验证结果
  if (!authResult.isValid) {
    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: authResult.error || 'Unauthorized',
      },
      { status: 401 }
    );
  }

  // 验证通过，继续处理业务逻辑
  // authResult.uid 和 authResult.appid 已经验证过的用户信息

  // ... 业务代码
}
```

### POST 请求示例

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { appid, uid } = body;

  // 验证用户权限（包含 body）
  const authResult = await authenticateRequest(
    {
      headers: request.headers,
      url: request.url,
      body,
    },
    { uid, appid }
  );

  if (!authResult.isValid) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  // ... 业务代码
}
```

### 自定义验证逻辑

```typescript
import { extractToken, validateRequest } from '@/server';

export async function GET(request: NextRequest) {
  // 1. 提取 token
  const token = extractToken({
    headers: request.headers,
    url: request.url,
  });

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  // 2. 获取请求参数
  const uid = parseInt(request.headers.get('uid') || '0', 10);
  const appid = request.headers.get('appid') || undefined;

  // 3. 验证 token
  const authResult = await validateRequest(token, uid, appid);

  if (!authResult.isValid) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  // 4. 使用已验证的用户信息
  console.log(`Authenticated user: ${authResult.uid} from ${authResult.appid}`);

  // ... 业务代码
}
```

## Token 传递方式

客户端可以通过以下任意方式传递 token：

### 1. Headers（推荐）

```typescript
fetch('/api/oss-sts?appid=jiantie&uid=123', {
  headers: {
    token: 'your-token-here',
  },
});
```

### 2. Query 参数

```typescript
fetch('/api/oss-sts?appid=jiantie&uid=123&token=your-token-here');
```

### 3. Cookies

```typescript
// 浏览器会自动发送 cookies
document.cookie = 'token=your-token-here';
fetch('/api/oss-sts?appid=jiantie&uid=123');
```

### 4. Body（POST 请求）

```typescript
fetch('/api/oss-sts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appid: 'jiantie',
    uid: 123,
    token: 'your-token-here',
  }),
});
```

## 错误处理

### 常见错误响应

#### 401 - 未授权

**缺少 token**:

```json
{
  "error": "Authentication failed",
  "message": "Missing authentication token"
}
```

**Token 无效**:

```json
{
  "error": "Authentication failed",
  "message": "Invalid or expired token"
}
```

**UID 不匹配**:

```json
{
  "error": "Authentication failed",
  "message": "UID mismatch: token UID does not match requested UID"
}
```

**APPID 不匹配**:

```json
{
  "error": "Authentication failed",
  "message": "APPID mismatch: token APPID does not match requested APPID"
}
```

## 环境变量

必需的环境变量：

```bash
# 用户中心服务地址
nest_user_center=https://your-user-center-url
```

## 安全建议

1. **生产环境禁用后门**: 确保生产环境不使用 `token=backdoor`
2. **使用 HTTPS**: 所有 token 传输应通过 HTTPS
3. **Token 过期**: 定期刷新 token，设置合理的过期时间
4. **日志记录**: 记录认证失败的尝试，监控异常行为
5. **限流保护**: 对认证接口实施限流，防止暴力破解

## 与 NestJS AuthGuard 的对比

| 特性       | NestJS AuthGuard  | 本实现          |
| ---------- | ----------------- | --------------- |
| 框架       | NestJS            | Next.js         |
| 实现方式   | Decorator + Guard | 函数式          |
| Token 提取 | 自动              | 函数调用        |
| 验证逻辑   | canActivate       | validateRequest |
| 错误处理   | 抛出异常          | 返回结果对象    |
| 灵活性     | 中等              | 高              |

## 完整示例：OSS STS 服务

参考 `packages/jiantie/app/api/oss-sts/route.ts` 查看完整的集成示例。

```typescript
import {
  getSTSToken,
  loadAliCloudConfigFromEnv,
  authenticateRequest,
} from '@/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid')!;
  const uid = parseInt(searchParams.get('uid')!, 10);

  // 验证用户权限
  const authResult = await authenticateRequest(
    { headers: request.headers, url: request.url },
    { uid, appid }
  );

  if (!authResult.isValid) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  // 业务逻辑
  const config = loadAliCloudConfigFromEnv();
  const stsToken = await getSTSToken(config, appid, uid);

  return NextResponse.json(stsToken);
}
```

## 测试

### 开发测试使用后门

```bash
# 使用后门 token 绕过验证
curl "http://localhost:3000/api/oss-sts?appid=jiantie&uid=123&token=backdoor"
```

### 正常 token 测试

```bash
# 使用真实 token
curl -H "token: real-token-here" \
  "http://localhost:3000/api/oss-sts?appid=jiantie&uid=123"
```

## 相关文档

- [OSS STS 服务](../../jiantie/app/api/oss-sts/)
- [NestJS AuthGuard](https://docs.nestjs.com/guards)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
