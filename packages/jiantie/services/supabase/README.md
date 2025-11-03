# Supabase 服务

这个模块提供了 Supabase 相关的工具方法，方便在项目中复用。基于单例模式维护全局 Supabase 客户端。

## 功能特性

- ✅ 单例模式维护 Supabase 客户端
- ✅ 使用 ID Token 登录（Apple、Google 等）
- ✅ 自动获取 token（支持多种来源）
- ✅ 获取 Supabase 用户信息
- ✅ 监听认证状态变化
- ✅ 统一的错误处理

## 基本使用

### 0. 使用 ID Token 登录（重要）

使用第三方登录（如 Apple、Google）的 ID Token 登录到 Supabase：

```typescript
import { signInWithIdToken } from '@/services/supabase';

// Apple 登录
const result = await signInWithIdToken(
  appleIdToken,
  'apple',
  nonce // 可选
);

if (result.success) {
  console.log('登录成功，用户信息:', result.data);
  // result.data 包含完整的 Supabase User 对象
} else {
  console.error('登录失败:', result.error);
}

// Google 登录
const googleResult = await signInWithIdToken(googleIdToken, 'google');
```

### 1. 快速获取用户信息

最简单的方式，自动处理 token 获取：

```typescript
import { fetchSupabaseUserInfo } from '@/services/supabase';

// 在组件或函数中使用
const result = await fetchSupabaseUserInfo(urlParams, fallbackToken);

if (result.success) {
  console.log('用户信息:', result.data);
} else {
  console.error('错误:', result.error);
}
```

### 2. 使用自定义客户端

如果需要更多控制：

```typescript
import { createSupabaseClient, getSupabaseUser } from '@/services/supabase';

// 创建客户端
const client = createSupabaseClient({
  persistSession: true,
  autoRefreshToken: true,
});

// 使用客户端获取用户信息
const result = await getSupabaseUser(token, client);
```

### 3. 仅获取 Token

如果只需要获取 token：

```typescript
import { getToken } from '@/services/supabase';

// 优先级：urlParams.token > sessionStorage > fallbackToken
const token = getToken(urlParams, userInfo?.token);

if (token) {
  // 使用 token
}
```

## API 参考

### 认证相关

#### `signInWithIdToken(idToken, provider?, nonce?)`

使用第三方 ID Token 登录。

**参数：**

- `idToken`: ID Token 字符串（必需）
- `provider`: 提供商 `'apple' | 'google'`（默认: `'apple'`）
- `nonce`: 可选的 nonce 值

**返回：**

```typescript
{
  success: boolean;
  data: User | null;
  error: string | null;
}
```

**特点：**

- 自动启用 `persistSession` 和 `autoRefreshToken`
- 登录成功后会话会被持久化

---

#### `getCurrentUser()`

获取当前登录的用户信息。

**返回：**

```typescript
{
  success: boolean;
  data: User | null;
  error: string | null;
}
```

---

#### `signOut()`

退出当前登录。

**返回：**

```typescript
{
  success: boolean;
  data: null;
  error: string | null;
}
```

---

#### `onAuthStateChange(callback)`

监听认证状态变化。

**参数：**

```typescript
callback: (event: string, session: any) => void
```

**返回：**

```typescript
{
  unsubscribe: () => void;
}
```

**示例：**

```typescript
import { onAuthStateChange } from '@/services/supabase';

const { unsubscribe } = onAuthStateChange((event, session) => {
  console.log('认证状态变化:', event, session);
  if (event === 'SIGNED_IN') {
    console.log('用户已登录');
  } else if (event === 'SIGNED_OUT') {
    console.log('用户已登出');
  }
});

// 取消监听
unsubscribe();
```

---

### 工具方法

#### `fetchSupabaseUserInfo(urlParams?, fallbackToken?)`

自动获取 token 并返回用户信息。

**参数：**

- `urlParams` (可选): URL 参数对象
- `fallbackToken` (可选): 备用 token

**返回：**

```typescript
{
  success: boolean;
  data: User | null;
  error: string | null;
}
```

---

#### `getSupabaseUser(token)`

使用指定 token 获取用户信息。

**参数：**

- `token`: 用户 token（必需）

**返回：**

```typescript
{
  success: boolean;
  data: User | null;
  error: string | null;
}
```

---

#### `getUserByToken(accessToken)`

使用 Supabase Access Token 获取用户信息。

**参数：**

- `accessToken`: Supabase access token（必需）

**返回：**

```typescript
{
  success: boolean;
  data: User | null;
  error: string | null;
}
```

---

#### `createSupabaseClient(options?)`

创建 Supabase 客户端实例。

**参数：**

```typescript
{
  persistSession?: boolean;    // 默认: false
  autoRefreshToken?: boolean;  // 默认: false
}
```

**返回：** `SupabaseClient`

---

#### `getToken(urlParams?, fallbackToken?)`

从多个来源获取 token。

**优先级：** urlParams > sessionStorage > fallbackToken

**参数：**

- `urlParams` (可选): URL 参数对象
- `fallbackToken` (可选): 备用 token

**返回：** `string | null`

---

#### `getSupabaseService()`

获取 SupabaseService 单例实例。

**返回：** `SupabaseService`

用于需要直接访问服务类的场景：

```typescript
import { getSupabaseService } from '@/services/supabase';

const service = getSupabaseService();
const client = service.getClient({ persistSession: true });
```

---

## 完整示例

### 示例 1：Apple 登录完整流程

```typescript
'use client';

import { useState } from 'react';
import { signInWithIdToken, onAuthStateChange, getCurrentUser } from '@/services/supabase';

export default function AppleLoginPage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 监听认证状态
  useEffect(() => {
    const { unsubscribe } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // 检查是否已登录
    checkCurrentUser();

    return () => unsubscribe();
  }, []);

  const checkCurrentUser = async () => {
    const result = await getCurrentUser();
    if (result.success) {
      setUser(result.data);
    }
  };

  const handleAppleLogin = async (appleIdToken: string, nonce?: string) => {
    setLoading(true);
    setError(null);

    const result = await signInWithIdToken(appleIdToken, 'apple', nonce);

    if (result.success) {
      setUser(result.data);
      console.log('登录成功:', result.data);
    } else {
      setError(result.error);
      console.error('登录失败:', result.error);
    }

    setLoading(false);
  };

  return (
    <div>
      {user ? (
        <div>
          <h2>已登录</h2>
          <p>用户 ID: {user.id}</p>
          <p>邮箱: {user.email}</p>
        </div>
      ) : (
        <button onClick={() => handleAppleLogin('your_apple_id_token')} disabled={loading}>
          {loading ? '登录中...' : '使用 Apple 登录'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### 示例 2：在 React 组件中获取用户信息

```typescript
'use client';

import { useState } from 'react';
import { fetchSupabaseUserInfo } from '@/services/supabase';
import { queryToObj } from '@mk/utils';

export default function MyComponent() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetchUser = async () => {
    setLoading(true);
    setError(null);

    const urlParams = queryToObj();
    const result = await fetchSupabaseUserInfo(urlParams);

    if (result.success) {
      setUserInfo(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleFetchUser} disabled={loading}>
        {loading ? '加载中...' : '获取用户信息'}
      </button>

      {error && <p className="error">{error}</p>}
      {userInfo && <pre>{JSON.stringify(userInfo, null, 2)}</pre>}
    </div>
  );
}
```

## Token 获取逻辑

`getToken` 方法按以下优先级查找 token：

1. **URL 参数** - `urlParams.token`
2. **SessionStorage** - `sessionStorage.getItem('editor_token')`
3. **备用 Token** - `fallbackToken` 参数

## 架构设计

### 单例模式

`SupabaseService` 使用单例模式，确保整个应用只有一个 Supabase 客户端实例：

```typescript
class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient | null = null;

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }
}
```

### 配置管理

客户端配置会根据需要自动更新：

- 当 `persistSession` 或 `autoRefreshToken` 配置变化时，会重新创建客户端
- `signInWithIdToken` 自动使用 `persistSession: true` 和 `autoRefreshToken: true`

## 注意事项

- 🔒 配置信息（URL 和 anon key）已内置，无需额外配置
- 🌐 只能在客户端环境使用（需要 `window` 对象）
- ⚠️ 如果没有找到 token，会返回错误信息而不是抛出异常
- 📝 所有方法都有完整的 TypeScript 类型支持
- 🔄 单例模式确保全局只有一个客户端实例
- 🔐 `signInWithIdToken` 登录后会话会自动持久化

## 类型定义

```typescript
// 客户端配置选项
interface SupabaseClientOptions {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
}

// 统一返回类型
interface Result<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// User 类型来自 @supabase/supabase-js
import type { User } from '@supabase/supabase-js';
```
