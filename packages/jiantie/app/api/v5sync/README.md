# V5 同步接口文档

用于旧系统（V5）与新系统（V11）之间的数据同步接口。

## 用户注册双写接口

### 接口信息

- **请求方法**: `POST`
- **请求地址**: `/api/v5sync/user-register`
- **请求头**: `Content-Type: application/json`

### 功能说明

用于旧系统在用户注册成功后，将用户信息同步到新系统（v11数据库）。接口会将用户信息写入以下表：

- `user` - 用户基本信息
- `user_auth` - 用户认证信息（可选）
- `user_source` - 用户来源信息（可选）

### 请求体格式

```json
{
  "uid": 123456, // 必需：用户ID（对应旧库uid）
  "appid": "jiantie", // 必需：应用ID，值为 "maka" 或 "jiantie"
  "username": "用户名", // 可选：用户名
  "avatar": "https://...", // 可选：头像URL
  "reg_date": "2024-01-01T00:00:00Z", // 可选：注册日期，ISO 8601格式，默认为当前时间
  "status": 0, // 可选：状态，0=正常，-2=封停，-1=删除，默认为0
  "is_team": 0, // 可选：是否团队账号，0=否，1=是，默认为0

  // 认证信息（可选，可提供多个）
  "auths": [
    {
      "auth_type": "email", // 认证类型：email、phone、oauth等
      "auth_value": "user@example.com", // 认证值（邮箱、手机号等）
      "password_hash": "xxx", // 可选：密码哈希
      "oauth_provider": "google", // 可选：OAuth提供商（如google、github、wechat、qq等）
      "oauth_id": "xxx", // 可选：OAuth ID
      "oauth_platform_data": {
        // 可选：OAuth平台完整数据（JSON对象），用于存储OAuth平台返回的完整信息
        "platform": "wechat",
        "openid": "xxx",
        "unionid": "xxx",
        "extra_info": {}
      },
      "is_verified": true // 可选：是否已验证，默认为false
    }
  ],

  // 来源信息（可选）
  "source": {
    "bundleid": "com.example.app", // 可选：包ID
    "device": "ios", // 可选：设备类型，web、ios、android、wap、other
    "market": "App Store", // 可选：市场
    "channelid": "channel123", // 可选：渠道ID
    "deviceid": "device123", // 可选：设备ID
    "idfa": "idfa123", // 可选：IDFA
    "version": "1.0.0", // 可选：版本
    "utm_source": "google", // 可选：广告来源
    "utm_medium": "cpc", // 可选：广告媒介
    "utm_term": "keyword", // 可选：关键词
    "utm_content": "ad1", // 可选：广告内容
    "utm_campaign": "campaign1" // 可选：广告活动
  }
}
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "用户注册信息已成功同步",
  "data": {
    "uid": 123456,
    "appid": "jiantie"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

### 调用示例

#### 使用 curl 调用

```bash
curl -X POST https://your-domain.com/api/v5sync/user-register \
  -H "Content-Type: application/json" \
  -d '{
    "uid": 123456,
    "appid": "jiantie",
    "username": "测试用户",
    "auths": [
      {
        "auth_type": "email",
        "auth_value": "user@example.com",
        "is_verified": true
      },
      {
        "auth_type": "oauth",
        "auth_value": "wechat_openid_123456789",
        "oauth_provider": "wechat",
        "oauth_id": "unionid_123456789",
        "oauth_platform_data": {
          "platform": "wechat",
          "openid": "openid_123456789",
          "unionid": "unionid_123456789",
          "extra_info": {}
        }
      }
    ],
    "source": {
      "device": "ios",
      "channelid": "channel123"
    }
  }'
```

#### 使用 JavaScript/TypeScript 调用

```typescript
const response = await fetch('/api/v5sync/user-register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    uid: 123456,
    appid: 'jiantie',
    username: '测试用户',
    auths: [
      {
        auth_type: 'email',
        auth_value: 'user@example.com',
        is_verified: true,
      },
      {
        auth_type: 'oauth',
        auth_value: 'wechat_openid_123456789',
        oauth_provider: 'wechat',
        oauth_id: 'unionid_123456789',
        oauth_platform_data: {
          platform: 'wechat',
          openid: 'openid_123456789',
          unionid: 'unionid_123456789',
          extra_info: {},
        },
      },
    ],
  }),
});

const result = await response.json();
if (result.success) {
  console.log('同步成功', result.data);
} else {
  console.error('同步失败', result.error);
}
```

#### 使用 Python 调用

```python
import requests
import json

url = 'https://your-domain.com/api/v5sync/user-register'
headers = {'Content-Type': 'application/json'}
data = {
    'uid': 123456,
    'appid': 'jiantie',
    'username': '测试用户',
    'auths': [
        {
            'auth_type': 'email',
            'auth_value': 'user@example.com',
            'is_verified': True
        },
        {
            'auth_type': 'oauth',
            'auth_value': 'wechat_openid_123456789',
            'oauth_provider': 'wechat',
            'oauth_id': 'unionid_123456789',
            'oauth_platform_data': {
                'platform': 'wechat',
                'openid': 'openid_123456789',
                'unionid': 'unionid_123456789',
                'extra_info': {}
            }
        }
    ],
    'source': {
        'device': 'ios',
        'channelid': 'channel123'
    }
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if result['success']:
    print('同步成功', result['data'])
else:
    print('同步失败', result['error'])
```

### 错误码说明

- `400` - 请求参数错误（缺少必需字段或格式不正确）
- `409` - 数据冲突（用户已存在但更新失败）
- `500` - 服务器内部错误

### 注意事项

1. `uid` 和 `appid` 是必需字段，其他字段均为可选
2. `appid` 的值只能是 `"maka"` 或 `"jiantie"`
3. 如果用户已存在（相同的 `uid`），接口会更新用户信息而不是创建新用户
4. 认证信息（`auths`）可以提供多个，每个认证信息需要包含 `auth_type` 和 `auth_value`
5. **唯一约束说明**：`user_auth` 表的唯一约束是 `[uid, appid, auth_type]`，不包含 `auth_value`。这意味着一个用户在一个 appid 下，每种 `auth_type` 只能有一条记录。如果尝试创建重复的 `(uid, appid, auth_type)` 组合，会更新现有记录而不是创建新记录
6. 所有操作都在数据库事务中执行，确保数据一致性
7. 如果事务中任何一步失败，所有操作都会回滚

---

## 用户登录双写接口

### 接口信息

- **请求方法**: `POST`
- **请求地址**: `/api/v5sync/user-login`
- **请求头**: `Content-Type: application/json`

### 功能说明

用于旧系统在用户登录成功后，将登录时间同步到新系统（v11数据库）。接口会将登录时间更新到 `user_auth` 表的 `last_login` 字段。

### 请求体格式

```json
{
  "uid": 123456, // 必需：用户ID（对应旧库uid）
  "appid": "jiantie", // 必需：应用ID，值为 "maka" 或 "jiantie"
  "auth_type": "email", // 可选：认证类型（email、phone、oauth等），如果提供则会根据唯一约束 [uid, appid, auth_type] 更新对应认证记录的登录时间
  "auth_value": "user@example.com", // 可选：认证值（邮箱、手机号等），如果提供会作为额外的过滤条件（不参与唯一约束）
  "login_time": "2024-01-01T00:00:00Z" // 可选：登录时间，ISO 8601格式，默认为当前时间
}
```

### 响应格式

#### 成功响应

当提供了 `auth_type` 和 `auth_value` 时：

```json
{
  "success": true,
  "message": "登录时间已成功同步",
  "data": {
    "uid": 123456,
    "appid": "jiantie",
    "auth_type": "email",
    "auth_value": "user@example.com",
    "last_login": "2024-01-01T00:00:00Z"
  }
}
```

当未提供 `auth_type` 和 `auth_value` 时（更新该用户下所有认证记录）：

```json
{
  "success": true,
  "message": "登录时间已成功同步",
  "data": {
    "uid": 123456,
    "appid": "jiantie",
    "updated_count": 2,
    "last_login": "2024-01-01T00:00:00Z"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

### 调用示例

#### 场景 1：邮箱登录（精确更新某个认证记录）

使用 curl 调用：

```bash
curl -X POST https://your-domain.com/api/v5sync/user-login \
  -H "Content-Type: application/json" \
  -d '{
    "uid": 123456,
    "appid": "jiantie",
    "auth_type": "email",
    "auth_value": "user@example.com",
    "login_time": "2024-01-15T10:30:00Z"
  }'
```

使用 JavaScript/TypeScript 调用：

```typescript
// 用户通过邮箱登录成功后，同步登录时间
async function syncLoginTime(uid: number, appid: string, email: string) {
  const response = await fetch('/api/v5sync/user-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: uid,
      appid: appid,
      auth_type: 'email',
      auth_value: email,
      login_time: new Date().toISOString(),
    }),
  });

  const result = await response.json();
  if (result.success) {
    console.log('登录时间同步成功', result.data);
  } else {
    console.error('登录时间同步失败', result.error);
  }
}

// 使用示例
syncLoginTime(123456, 'jiantie', 'user@example.com');
```

使用 Python 调用：

```python
import requests
import json
from datetime import datetime

def sync_login_time(uid: int, appid: str, email: str):
    """同步用户登录时间"""
    url = 'https://your-domain.com/api/v5sync/user-login'
    headers = {'Content-Type': 'application/json'}
    data = {
        'uid': uid,
        'appid': appid,
        'auth_type': 'email',
        'auth_value': email,
        'login_time': datetime.now().isoformat() + 'Z',
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))
    result = response.json()

    if result['success']:
        print('登录时间同步成功', result['data'])
    else:
        print('登录时间同步失败', result['error'])

# 使用示例
sync_login_time(123456, 'jiantie', 'user@example.com')
```

#### 场景 2：手机号登录

```bash
curl -X POST https://your-domain.com/api/v5sync/user-login \
  -H "Content-Type: application/json" \
  -d '{
    "uid": 123456,
    "appid": "maka",
    "auth_type": "phone",
    "auth_value": "13800138000"
  }'
```

#### 场景 3：微信 OAuth 登录

```bash
curl -X POST https://your-domain.com/api/v5sync/user-login \
  -H "Content-Type: application/json" \
  -d '{
    "uid": 123456,
    "appid": "jiantie",
    "auth_type": "oauth",
    "auth_value": "wechat_openid_123456789"
  }'
```

#### 场景 4：不指定认证方式（更新该用户所有认证记录的登录时间）

如果不知道用户是通过哪种方式登录的，或者想同时更新该用户的所有认证记录：

```bash
curl -X POST https://your-domain.com/api/v5sync/user-login \
  -H "Content-Type: application/json" \
  -d '{
    "uid": 123456,
    "appid": "jiantie"
  }'
```

对应的 JavaScript 调用：

```typescript
// 简单方式：只传 uid 和 appid，会更新该用户所有认证记录的登录时间
const response = await fetch('/api/v5sync/user-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    uid: 123456,
    appid: 'jiantie',
  }),
});

const result = await response.json();
console.log(`更新了 ${result.data.updated_count} 条认证记录的登录时间`);
```

#### 错误响应示例

用户不存在时：

```json
{
  "success": false,
  "error": "用户 uid=999999 不存在"
}
```

缺少必需参数时：

```json
{
  "success": false,
  "error": "uid 是必需的且必须为数字"
}
```

appid 错误时：

```json
{
  "success": false,
  "error": "appid 的值只能是 \"maka\" 或 \"jiantie\""
}
```

### 错误码说明

- `400` - 请求参数错误（缺少必需字段或格式不正确）
- `404` - 用户不存在
- `500` - 服务器内部错误

### 注意事项

1. `uid` 和 `appid` 是必需字段，其他字段均为可选
2. `appid` 的值只能是 `"maka"` 或 `"jiantie"`
3. `auth_type` 是可选字段，如果提供则会更新对应认证记录的登录时间
4. `auth_value` 是可选字段，如果提供会作为额外的过滤条件（不参与唯一约束）
5. **唯一约束说明**：`user_auth` 表的唯一约束是 `[uid, appid, auth_type]`，不包含 `auth_value`。如果只提供了 `auth_type`，会根据唯一约束定位到对应的认证记录进行更新
6. 如果提供了 `auth_type`，会根据唯一约束 `[uid, appid, auth_type]` 更新对应的认证记录的 `last_login` 字段。如果同时提供了 `auth_value`，会作为额外的过滤条件
7. 如果未提供 `auth_type`，会更新该用户下所有认证记录的 `last_login` 字段
8. 如果认证记录不存在，接口会记录警告但不会报错（认证信息应该在注册时创建）
9. 所有操作都在数据库事务中执行，确保数据一致性
10. 如果事务中任何一步失败，所有操作都会回滚

---

## 广告点击数据同步接口

### 接口信息

- **请求方法**: `POST`
- **请求地址**: `/api/v5sync/adclick`
- **请求头**: `Content-Type: application/json`

### 功能说明

用于旧系统将广告点击回调数据同步到新系统（v11数据库）。接口会将广告点击数据写入 `ad_click_callback_entity` 表。

### 请求体格式

```json
{
  "platform": "gdt", // 必需：广告平台标识，如 "gdt"、"bytedance"、"tencent" 等
  "click_id": "click_123456789", // 必需：点击ID
  "impression_id": "impression_123", // 可选：曝光ID
  "callback": "__CALLBACK__", // 可选：回调参数
  "attribution_data": {
    // 可选：归因数据（JSON格式，如抖音 App / Apple ASA 归因结果）
    "project_id": "proj_123",
    "campaign_id": "camp_456",
    "ad_group_id": "group_789"
  },
  "data": {
    // 可选：其他回调数据（JSON格式）
    "user_id": "12345",
    "campaign_id": "67890",
    "ad_id": "11111",
    "timestamp": "1704067200"
  },
  "raw_query": "click_id=click_123456789&callback=__CALLBACK__", // 可选：原始URL查询字符串
  "create_time": "2024-01-01T00:00:00Z" // 可选：创建时间，ISO 8601格式，默认为当前时间
}
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "广告点击数据已成功同步",
  "data": {
    "id": "clxxx...",
    "platform": "gdt",
    "click_id": "click_123456789"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

### 调用示例

#### 使用 curl 调用

```bash
curl -X POST https://your-domain.com/api/v5sync/adclick \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "gdt",
    "click_id": "click_123456789",
    "impression_id": "impression_123",
    "callback": "__CALLBACK__",
    "attribution_data": {
      "project_id": "proj_123",
      "campaign_id": "camp_456"
    },
    "data": {
      "user_id": "12345",
      "campaign_id": "67890"
    },
    "raw_query": "click_id=click_123456789&callback=__CALLBACK__"
  }'
```

#### 使用 JavaScript/TypeScript 调用

```typescript
const response = await fetch('/api/v5sync/adclick', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    platform: 'gdt',
    click_id: 'click_123456789',
    impression_id: 'impression_123',
    callback: '__CALLBACK__',
    attribution_data: {
      project_id: 'proj_123',
      campaign_id: 'camp_456',
    },
    data: {
      user_id: '12345',
      campaign_id: '67890',
    },
    raw_query: 'click_id=click_123456789&callback=__CALLBACK__',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('同步成功', result.data);
} else {
  console.error('同步失败', result.error);
}
```

#### 使用 Python 调用

```python
import requests
import json

url = 'https://your-domain.com/api/v5sync/adclick'
headers = {'Content-Type': 'application/json'}
data = {
    'platform': 'gdt',
    'click_id': 'click_123456789',
    'impression_id': 'impression_123',
    'callback': '__CALLBACK__',
    'attribution_data': {
        'project_id': 'proj_123',
        'campaign_id': 'camp_456',
    },
    'data': {
        'user_id': '12345',
        'campaign_id': '67890',
    },
    'raw_query': 'click_id=click_123456789&callback=__CALLBACK__',
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if result['success']:
    print('同步成功', result['data'])
else:
    print('同步失败', result['error'])
```

### 错误码说明

- `400` - 请求参数错误（缺少必需字段或格式不正确）
- `409` - 数据冲突（记录已存在但更新失败）
- `500` - 服务器内部错误

### 注意事项

1. `platform` 和 `click_id` 是必需字段，其他字段均为可选
2. 如果记录已存在（相同的 `platform` + `click_id`），接口会更新记录而不是创建新记录
3. `data` 字段必须是有效的 JSON 对象，如果未提供则默认为空对象 `{}`
4. 所有操作都在数据库事务中执行，确保数据一致性
5. 如果事务中任何一步失败，所有操作都会回滚

---

## 广告归因结果数据同步接口

### 接口信息

- **请求方法**: `POST`
- **请求地址**: `/api/v5sync/ad-attr`
- **请求头**: `Content-Type: application/json`

### 功能说明

用于旧系统将广告归因结果数据同步到新系统（v11数据库）。接口会将归因结果数据写入 `adv2_attribution_result_entity` 表，并与转化事件进行关联。

### 请求体格式

```json
{
  // 归因结果数据（必需）
  "attribution_data": {
    // 归因数据（JSON格式），包含归因后的完整信息
    "project_id": "proj_123",
    "campaign_id": "camp_456",
    "ad_group_id": "group_789",
    "click_id": "click_123456789"
  },
  "attribution_type": "event", // 必需：归因来源类型，例如 "event"（自event归因）、"third_party"（三方融合归因：douyinronghe等）

  // 转化事件关联信息（必需，二选一）
  // 方式1：直接提供转化事件ID
  "conversion_event_id": "clxxx...", // 可选：转化事件ID（如果已知）
  
  // 方式2：提供转化事件标识信息（用于查找转化事件）
  "conversion_event": {
    "event": "register", // 必需：事件名，例如 register、login、pay_success 等
    "uid": 123456, // 必需：业务 UID（用户 ID）
    "create_time": "2024-01-01T00:00:00Z" // 可选：创建时间，ISO 8601格式，用于精确匹配
  },

  // 其他可选字段
  "click_callback_flow_id": "clxxx...", // 可选：关联的点击回调数据ID
  "uid": 123456, // 可选：用户 ID（如果没有提供 conversion_event，可以单独提供）
  "platform": "gdt", // 可选：广告平台标识，例如 gdt、toutiao 等
  "appid": "jiantie", // 可选：应用ID
  "create_time": "2024-01-01T00:00:00Z" // 可选：创建时间，ISO 8601格式，默认为当前时间
}
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "广告归因结果数据已成功同步",
  "data": {
    "id": "clxxx...",
    "conversion_event_id": "clxxx...",
    "attribution_type": "event"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

### 调用示例

#### 使用 curl 调用（方式1：直接提供转化事件ID）

```bash
curl -X POST https://your-domain.com/api/v5sync/ad-attr \
  -H "Content-Type: application/json" \
  -d '{
    "attribution_data": {
      "project_id": "proj_123",
      "campaign_id": "camp_456",
      "ad_group_id": "group_789"
    },
    "attribution_type": "event",
    "conversion_event_id": "clxxx...",
    "platform": "gdt",
    "appid": "jiantie"
  }'
```

#### 使用 curl 调用（方式2：提供转化事件标识信息）

```bash
curl -X POST https://your-domain.com/api/v5sync/ad-attr \
  -H "Content-Type: application/json" \
  -d '{
    "attribution_data": {
      "project_id": "proj_123",
      "campaign_id": "camp_456",
      "ad_group_id": "group_789"
    },
    "attribution_type": "third_party",
    "conversion_event": {
      "event": "register",
      "uid": 123456,
      "create_time": "2024-01-01T00:00:00Z"
    },
    "platform": "gdt",
    "appid": "jiantie"
  }'
```

#### 使用 JavaScript/TypeScript 调用

```typescript
// 方式1：直接提供转化事件ID
const response = await fetch('/api/v5sync/ad-attr', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    attribution_data: {
      project_id: 'proj_123',
      campaign_id: 'camp_456',
      ad_group_id: 'group_789',
    },
    attribution_type: 'event',
    conversion_event_id: 'clxxx...',
    platform: 'gdt',
    appid: 'jiantie',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('同步成功', result.data);
} else {
  console.error('同步失败', result.error);
}
```

```typescript
// 方式2：提供转化事件标识信息
const response = await fetch('/api/v5sync/ad-attr', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    attribution_data: {
      project_id: 'proj_123',
      campaign_id: 'camp_456',
      ad_group_id: 'group_789',
    },
    attribution_type: 'third_party',
    conversion_event: {
      event: 'register',
      uid: 123456,
      create_time: '2024-01-01T00:00:00Z',
    },
    platform: 'gdt',
    appid: 'jiantie',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('同步成功', result.data);
} else {
  console.error('同步失败', result.error);
}
```

#### 使用 Python 调用

```python
import requests
import json

# 方式1：直接提供转化事件ID
url = 'https://your-domain.com/api/v5sync/ad-attr'
headers = {'Content-Type': 'application/json'}
data = {
    'attribution_data': {
        'project_id': 'proj_123',
        'campaign_id': 'camp_456',
        'ad_group_id': 'group_789',
    },
    'attribution_type': 'event',
    'conversion_event_id': 'clxxx...',
    'platform': 'gdt',
    'appid': 'jiantie',
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if result['success']:
    print('同步成功', result['data'])
else:
    print('同步失败', result['error'])
```

```python
# 方式2：提供转化事件标识信息
url = 'https://your-domain.com/api/v5sync/ad-attr'
headers = {'Content-Type': 'application/json'}
data = {
    'attribution_data': {
        'project_id': 'proj_123',
        'campaign_id': 'camp_456',
        'ad_group_id': 'group_789',
    },
    'attribution_type': 'third_party',
    'conversion_event': {
        'event': 'register',
        'uid': 123456,
        'create_time': '2024-01-01T00:00:00Z',
    },
    'platform': 'gdt',
    'appid': 'jiantie',
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if result['success']:
    print('同步成功', result['data'])
else:
    print('同步失败', result['error'])
```

### 错误码说明

- `400` - 请求参数错误（缺少必需字段或格式不正确）
- `404` - 转化事件不存在或未找到匹配的转化事件
- `409` - 数据冲突（记录已存在但更新失败）
- `500` - 服务器内部错误

### 注意事项

1. `attribution_data` 和 `attribution_type` 是必需字段
2. 必须提供 `conversion_event_id` 或 `conversion_event` 用于关联转化事件（二选一）
3. 如果提供 `conversion_event`，`event` 和 `uid` 是必需字段
4. 如果提供 `conversion_event.create_time`，会用于精确匹配转化事件（前后1秒内）
5. 如果记录已存在（相同的 `conversion_event_id`），接口会更新记录而不是创建新记录
6. `attribution_data` 字段必须是有效的 JSON 对象
7. `attribution_type` 的常见值：`event`（自event归因）、`third_party`（三方融合归因，如 douyinronghe 等）
8. 如果同时提供了 `conversion_event` 和单独的 `uid`，会优先使用单独提供的 `uid`
9. 所有操作都在数据库事务中执行，确保数据一致性
10. 如果事务中任何一步失败，所有操作都会回滚

---

## 创建订单双写接口

### 接口信息

- **请求方法**: `POST`
- **请求地址**: `/api/v5sync/order-create`
- **请求头**: `Content-Type: application/json`

### 功能说明

用于旧系统在创建订单后，将订单信息同步到新系统（v11数据库）。接口会将订单信息写入 `order` 表。

### 请求体格式

```json
{
  "order_no": "ORD20240101001", // 必需：业务唯一订单号（最长30个字符）
  "appid": "jiantie", // 必需：应用ID，值为 "maka" 或 "jiantie"
  "uid": 123456, // 必需：用户ID
  "amount": 9900, // 必需：订单金额（分）
  "currency": "CNY", // 可选：货币类型，默认为 "CNY"
  "order_status": "created", // 可选：订单状态，默认为 "created"（created、paid、cancelled、refunded等）
  "product_id": "prod_123", // 可选：商品ID
  "product_alias": "vip_monthly", // 可选：商品别名
  "create_time": "2024-01-01T00:00:00Z", // 可选：创建时间，ISO 8601格式，默认为当前时间
  "meta": {
    // 可选：订单扩展信息（JSON格式）
    "device": "ios", // 设备类型
    "version": "1.0.0", // 版本号
    "bundle_id": "com.example.app", // 包ID
    "ip": "192.168.1.1", // IP地址
    "channel_id": "channel123", // 渠道ID
    "utm_source": "google", // 广告来源
    "utm_medium": "cpc", // 广告媒介
    "utm_campaign": "campaign1" // 广告活动
  }
}
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "order_no": "ORD20240101001",
    "appid": "jiantie",
    "uid": 123456,
    "amount": 9900,
    "order_status": "created"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

### 调用示例

#### 使用 curl 调用

```bash
curl -X POST https://your-domain.com/api/v5sync/order-create \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORD20240101001",
    "appid": "jiantie",
    "uid": 123456,
    "amount": 9900,
    "currency": "CNY",
    "order_status": "created",
    "product_alias": "vip_monthly",
    "meta": {
      "device": "ios",
      "channel_id": "channel123"
    }
  }'
```

#### 使用 JavaScript/TypeScript 调用

```typescript
const response = await fetch('/api/v5sync/order-create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    order_no: 'ORD20240101001',
    appid: 'jiantie',
    uid: 123456,
    amount: 9900,
    currency: 'CNY',
    order_status: 'created',
    product_alias: 'vip_monthly',
    meta: {
      device: 'ios',
      channel_id: 'channel123',
    },
  }),
});

const result = await response.json();
if (result.success) {
  console.log('同步成功', result.data);
} else {
  console.error('同步失败', result.error);
}
```

#### 使用 Python 调用

```python
import requests
import json

url = 'https://your-domain.com/api/v5sync/order-create'
headers = {'Content-Type': 'application/json'}
data = {
    'order_no': 'ORD20240101001',
    'appid': 'jiantie',
    'uid': 123456,
    'amount': 9900,
    'currency': 'CNY',
    'order_status': 'created',
    'product_alias': 'vip_monthly',
    'meta': {
        'device': 'ios',
        'channel_id': 'channel123',
    },
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if result['success']:
    print('同步成功', result['data'])
else:
    print('同步失败', result['error'])
```

### 错误码说明

- `400` - 请求参数错误（缺少必需字段或格式不正确）
- `409` - 数据冲突（订单号已存在）
- `500` - 服务器内部错误

### 注意事项

1. `order_no`、`appid`、`uid`、`amount` 是必需字段，其他字段均为可选
2. `order_no` 长度不能超过 30 个字符
3. `appid` 的值只能是 `"maka"` 或 `"jiantie"`
4. `amount` 的单位是分（例如：9900 表示 99.00 元）
5. 如果订单已存在（相同的 `order_no`），接口会更新订单信息而不是创建新订单
6. `meta` 字段必须是有效的 JSON 对象，如果未提供则默认为空对象 `{}`

---

## 发货双写接口

### 接口信息

- **请求方法**: `POST`
- **请求地址**: `/api/v5sync/order-ship`
- **请求头**: `Content-Type: application/json`

### 功能说明

用于旧系统在发货后，将发货信息同步到新系统（v11数据库）。接口会将发货信息写入 `shipping_log` 表。发货前会验证订单是否存在，确保数据一致性。

### 请求体格式

```json
{
  "order_no": "ORD20240101001", // 必需：订单号
  "appid": "jiantie", // 必需：应用ID，值为 "maka" 或 "jiantie"
  "uid": 123456, // 必需：用户ID
  "shipping_type": "apple_iap", // 必需：发货类型（apple_iap、wechat、alipay等）
  "shipping_data": {
    // 可选：发货数据（JSON格式）
    "transaction_id": "txn_123456",
    "receipt_data": "receipt_xxx",
    "product_id": "com.example.product"
  },
  "status": "success", // 可选：发货状态，默认为 "success"（pending、success、failed）
  "error_message": "", // 可选：错误信息（发货失败时使用）
  "shipped_at": "2024-01-01T00:00:00Z" // 可选：发货时间，ISO 8601格式，默认为当前时间
}
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "发货信息已成功同步",
  "data": {
    "id": "clxxx...",
    "order_no": "ORD20240101001",
    "shipping_type": "apple_iap",
    "status": "success",
    "shipped_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

### 调用示例

#### 使用 curl 调用

```bash
curl -X POST https://your-domain.com/api/v5sync/order-ship \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORD20240101001",
    "appid": "jiantie",
    "uid": 123456,
    "shipping_type": "apple_iap",
    "shipping_data": {
      "transaction_id": "txn_123456",
      "receipt_data": "receipt_xxx"
    },
    "status": "success",
    "shipped_at": "2024-01-01T00:00:00Z"
  }'
```

#### 使用 JavaScript/TypeScript 调用

```typescript
const response = await fetch('/api/v5sync/order-ship', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    order_no: 'ORD20240101001',
    appid: 'jiantie',
    uid: 123456,
    shipping_type: 'apple_iap',
    shipping_data: {
      transaction_id: 'txn_123456',
      receipt_data: 'receipt_xxx',
    },
    status: 'success',
    shipped_at: '2024-01-01T00:00:00Z',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('同步成功', result.data);
} else {
  console.error('同步失败', result.error);
}
```

#### 使用 Python 调用

```python
import requests
import json

url = 'https://your-domain.com/api/v5sync/order-ship'
headers = {'Content-Type': 'application/json'}
data = {
    'order_no': 'ORD20240101001',
    'appid': 'jiantie',
    'uid': 123456,
    'shipping_type': 'apple_iap',
    'shipping_data': {
        'transaction_id': 'txn_123456',
        'receipt_data': 'receipt_xxx',
    },
    'status': 'success',
    'shipped_at': '2024-01-01T00:00:00Z',
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if result['success']:
    print('同步成功', result['data'])
else:
    print('同步失败', result['error'])
```

### 错误码说明

- `400` - 请求参数错误（缺少必需字段或格式不正确）或订单信息不匹配
- `404` - 订单不存在
- `500` - 服务器内部错误

### 注意事项

1. `order_no`、`appid`、`uid`、`shipping_type` 是必需字段，其他字段均为可选
2. `order_no` 长度不能超过 30 个字符
3. `appid` 的值只能是 `"maka"` 或 `"jiantie"`
4. 发货前会验证订单是否存在，如果订单不存在会返回 404 错误
5. 发货前会验证订单的 `appid` 和 `uid` 是否匹配，不匹配会返回 400 错误
6. `shipping_data` 字段必须是有效的 JSON 对象，如果未提供则默认为空对象 `{}`
7. `status` 默认为 `"success"`，如果发货失败可以设置为 `"failed"` 并填写 `error_message`
8. 所有操作都在数据库事务中执行，确保数据一致性
