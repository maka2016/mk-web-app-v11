# 广告点击回调 API 测试

## API 说明

- **路径**: `/api/track_ad_click/[platform]`
- **方法**: `GET`
- **必需参数**: 
  - `platform` (路径参数): 广告平台标识，如 "gdt"（广点通）
  - `click_id` (查询参数): 点击ID，必需
- **可选参数**:
  - `callback` (查询参数): 回调参数
  - 其他任意查询参数: 会被存储在 `data` 字段中

## 测试 curl 命令

### 1. 基础测试（本地开发环境）

```bash
# 最小必需参数
curl -X GET "http://localhost:3000/api/track_ad_click/gdt?click_id=test_click_123456789" \
  -H "Content-Type: application/json"
```

### 2. 完整参数测试（本地开发环境）

```bash
# 包含 callback 和其他广告平台参数
curl -X GET "http://localhost:3000/api/track_ad_click/gdt?click_id=test_click_123456789&callback=callback_value&user_id=12345&campaign_id=67890&ad_id=11111&timestamp=1704067200" \
  -H "Content-Type: application/json"
```

### 3. 模拟广点通(GDT)回调

```bash
curl -X GET "http://localhost:3000/api/track_ad_click/gdt?click_id=GDT_CLICK_20240115_001&callback=__CALLBACK__&click_time=1704067200&user_agent=Mozilla/5.0&ip=192.168.1.1&adgroup_id=123456&campaign_id=789012" \
  -H "Content-Type: application/json" \
  -v
```

### 4. 模拟字节跳动（巨量引擎）回调

```bash
curl -X GET "http://localhost:3000/api/track_ad_click/bytedance?click_id=BYTE_CLICK_20240115_001&callback=__CALLBACK__&event_type=click&advertiser_id=123&campaign_id=456&ad_id=789&timestamp=1704067200" \
  -H "Content-Type: application/json" \
  -v
```

### 5. 模拟腾讯广告回调（带完整参数）

```bash
curl -X GET "http://localhost:3000/api/track_ad_click/tencent?click_id=TENCENT_CLICK_20240115_001&callback=__CALLBACK__&account_id=10001&campaign_id=20001&adgroup_id=30001&creative_id=40001&user_id=50001&click_time=1704067200&user_agent=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)&ip_address=203.208.60.1&device_type=mobile&os_type=android" \
  -H "Content-Type: application/json" \
  -v
```

### 6. 测试环境（如需）

```bash
# 假设测试环境地址
curl -X GET "https://test5.maka.im/api/track_ad_click/gdt?click_id=test_click_123456789&callback=test_callback&extra_param=value" \
  -H "Content-Type: application/json" \
  -v
```

## 预期响应

### 成功响应 (200)

```json
{
  "success": true
}
```

### 错误响应 (400)

```json
{
  "error": "click_id is required"
}
```

或

```json
{
  "error": "Platform parameter is required"
}
```

### 错误响应 (500)

```json
{
  "error": "存储失败",
  "message": "错误详情"
}
```

## 数据库存储结构

数据会存储在 `ad_click_callback_entity` 表中：

- `platform`: 平台标识（如 "gdt"）
- `click_id`: 点击ID
- `callback`: 回调参数（可选）
- `data`: 其他参数（JSON格式）
- `raw_query`: 原始查询字符串
- `create_time`: 创建时间
- `update_time`: 更新时间

