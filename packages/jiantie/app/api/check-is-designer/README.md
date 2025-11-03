# 检查设计师API

## 接口说明

这个API用于检查当前用户是否为设计师。

## 请求方式

```
GET /api/check-is-designer?appid={appid}&uid={uid}
```

## 请求参数

| 参数名 | 类型   | 必填 | 说明                     |
| ------ | ------ | ---- | ------------------------ |
| appid  | string | 是   | 应用ID，例如 "jiantie"   |
| uid    | string | 是   | 用户ID，例如 "605277277" |

## 请求示例

```
GET http://localhost:3001/api/check-is-designer?appid=jiantie&uid=605277277
```

## 响应格式

### 成功响应

```json
{
  "isDesigner": true,
  "roles": [
    {
      "id": 770450,
      "uid": "605277277",
      "appid": "jiantie",
      "roleAlias": "maka_operator",
      "validFrom": "2025-09-08T04:14:19.000Z",
      "validTo": "2028-10-08T04:14:19.000Z",
      "status": 0,
      "createdAt": "2025-09-08T04:14:18.000Z"
    }
  ]
}
```

### 非设计师响应

```json
{
  "isDesigner": false,
  "roles": []
}
```

### 错误响应

```json
{
  "error": "Missing required parameters: appid or uid"
}
```

## 字段说明

- `isDesigner`: 布尔值，表示用户是否为设计师
- `roles`: 数组，包含用户的角色信息（仅当用户是设计师时返回）
- `roleAlias`: 角色别名，设计师角色的别名为 "maka_operator"

## 使用示例

```javascript
// 在React组件中使用
const checkDesignerStatus = async (appid, uid) => {
  try {
    const response = await fetch(`/api/check-is-designer?appid=${appid}&uid=${uid}`);
    const data = await response.json();

    if (data.isDesigner) {
      console.log('用户是设计师');
      // 显示设计师相关功能
    } else {
      console.log('用户不是设计师');
      // 隐藏设计师相关功能
    }
  } catch (error) {
    console.error('检查设计师状态失败:', error);
  }
};

// 调用示例
checkDesignerStatus('jiantie', '605277277');
```

## 注意事项

1. 此API依赖外部服务 `http://172.16.253.5:31263/user-roles/v2`
2. 必须在URL中提供 `appid` 和 `uid` 查询参数
3. 设计师角色通过 `roleAlias` 为 "maka_operator" 来识别
4. 如果参数缺失，API会返回400错误
