# 作品和模板服务迁移需求文档

## 文档导航

本功能包含以下核心文档：

1. **requirements.md**（本文档）- 功能需求和验收标准
2. **design.md** - 技术设计和实现方案
3. **tasks.md** - 开发任务清单

## 概述

将作品（Works）和模板（Template）相关服务从现有的 NestJS 后端迁移到当前的 Next.js 15 项目中，使用 Next.js App Router 的 Route Handlers 实现服务端 API，提升项目架构的一致性和可维护性。

### 核心目标

- **API 迁移**: 将 NestJS 的作品和模板 API 完整迁移到 Next.js Route Handlers
- **数据兼容**: 确保与现有数据结构和存储完全兼容
- **无缝切换**: 支持前端代码平滑过渡，不影响现有功能
- **性能优化**: 利用 Next.js 的优势提升 API 性能和响应速度
- **类型安全**: 使用 TypeScript 提供完整的类型定义和校验

### 技术栈

- **后端框架**: Next.js 15 App Router (Route Handlers)
- **数据验证**: Zod 或 class-validator
- **ORM/数据库**: 保持与现有 NestJS 服务相同的数据访问方式
- **API 规范**: RESTful API 设计
- **认证授权**: 继承现有的用户认证体系
- **日志监控**: 使用 `@mk/logger` 包
- **错误处理**: 统一的错误处理机制
- **类型定义**: TypeScript + 共享类型定义

## 业务背景

简帖（jiantie）作为主要业务应用，其核心功能依赖于作品和模板服务：

### 作品（Works）服务

作品是用户基于模板创建的内容实例，包含：

- **作品数据管理**: 创建、读取、更新、删除（CRUD）
- **作品列表**: 分页查询、筛选、搜索
- **作品状态**: 草稿、已发布、回收站
- **作品分享**: 分享链接生成、访问统计
- **作品复制**: 快速复制现有作品
- **作品数据统计**: PV、UV、停留时长、传播数据

### 模板（Template）服务

模板是设计师创建的可复用内容模板，包含：

- **模板管理**: 创建、编辑、上架、下架
- **模板分类**: 按类别组织模板
- **模板商城**: 展示、搜索、推荐
- **模板收藏**: 用户收藏模板列表
- **模板购买**: 付费模板购买记录
- **模板使用统计**: 使用次数、受欢迎程度

### 现有服务架构

- **NestJS 后端**: 独立的微服务，部署在 `工具服务` (mk-fe-node)
- **API 版本**: 主要使用 v7 版本的 API
- **数据存储**: works-store 服务 + 主服务 API
- **前端调用**: 通过 `@mk/services` 包统一调用

## 术语表

- **Works**: 作品，用户基于模板创建的内容实例
- **Template**: 模板，设计师创建的可复用内容模板
- **Works_Store**: 作品存储服务，负责作品数据的持久化（v7版本）
- **Route_Handler**: Next.js 15 App Router 中的服务端 API 处理器
- **Designer**: 设计师，创建和管理模板的用户
- **User**: 简帖用户，使用模板创建作品的用户
- **Works_Detail**: 作品详情，包含作品的元数据和配置信息
- **Works_Data**: 作品数据，包含作品的完整内容（GridV3 数据结构）
- **Marketplace**: 模板商城，展示和分发模板的平台
- **API_Migration**: API 迁移，将现有 API 从 NestJS 迁移到 Next.js
- **Backward_Compatibility**: 向后兼容，确保新 API 与旧客户端兼容
- **Recycle_Bin**: 回收站，临时存储已删除作品的区域
- **Risk_Check**: 风控检查，对作品内容进行安全性审核

## 需求

### 需求 1

**用户故事:** 作为开发者，我希望能在 Next.js 中实现作品 CRUD API，以便替代现有的 NestJS 服务

#### 验收标准

1. WHEN 前端调用创建作品 API (`POST /api/works/v7/item`)，THE 系统 SHALL 验证用户权限并创建作品记录
2. WHEN 作品创建成功，THE 系统 SHALL 返回作品 ID 和基本信息
3. WHEN 前端调用获取作品数据 API (`GET /api/works/v7/works/:uid/:workId`)，THE 系统 SHALL 返回完整的作品数据结构
4. WHEN 作品不存在，THE 系统 SHALL 返回 404 错误和明确的错误信息
5. WHEN 前端调用更新作品详情 API (`PUT /api/works/v7/detail/:uid/:workId`)，THE 系统 SHALL 验证权限并更新作品信息
6. WHEN 前端调用删除作品 API，THE 系统 SHALL 将作品移至回收站而非物理删除
7. WHEN 前端调用复制作品 API (`POST /api/works/:workId/action/copy`)，THE 系统 SHALL 创建作品副本并返回新作品 ID
8. WHEN API 执行出错，THE 系统 SHALL 返回统一格式的错误响应

### 需求 2

**用户故事:** 作为开发者，我希望能在 Next.js 中实现作品列表和查询 API，以便支持作品管理功能

#### 验收标准

1. WHEN 前端调用作品列表 API (`GET /api/works/v7/items/:uid`)，THE 系统 SHALL 返回分页的作品列表
2. WHEN 请求包含筛选参数，THE 系统 SHALL 支持按状态、类型、时间范围筛选
3. WHEN 请求包含排序参数，THE 系统 SHALL 支持按创建时间、更新时间、名称排序
4. WHEN 请求包含搜索关键词，THE 系统 SHALL 在作品名称和描述中搜索
5. WHEN 前端调用作品详情 API (`GET /api/works/v7/detail/:uid/:workId`)，THE 系统 SHALL 返回作品元数据（不含完整内容）
6. WHEN 前端调用已发布作品数量 API，THE 系统 SHALL 返回指定时间范围内的发布统计
7. WHEN 分页参数无效，THE 系统 SHALL 返回默认分页设置（第1页，每页20条）
8. WHEN 查询结果为空，THE 系统 SHALL 返回空数组和总数为0

### 需求 3

**用户故事:** 作为开发者，我希望能在 Next.js 中实现回收站功能，以便支持作品恢复和彻底删除

#### 验收标准

1. WHEN 前端调用回收站列表 API (`GET /api/works/recycle_bin`)，THE 系统 SHALL 返回当前用户的已删除作品
2. WHEN 前端调用恢复作品 API (`POST /api/works/recycle_bin:move`)，THE 系统 SHALL 将指定作品从回收站恢复
3. WHEN 恢复多个作品，THE 系统 SHALL 支持批量恢复操作（type: 'multi'）
4. WHEN 前端调用彻底删除 API (`DELETE /api/works/recycle_bin`)，THE 系统 SHALL 物理删除指定作品
5. WHEN 彻底删除多个作品，THE 系统 SHALL 支持批量删除操作
6. WHEN 作品在回收站超过30天，THE 系统 SHALL 在列表中标记为即将永久删除
7. WHEN 恢复或删除操作失败，THE 系统 SHALL 返回详细的错误信息和失败的作品 ID

### 需求 4

**用户故事:** 作为开发者，我希望能在 Next.js 中实现模板相关 API，以便支持模板商城功能

#### 验收标准

1. WHEN 前端调用模板分类 API (`GET /api/store/categories`)，THE 系统 SHALL 返回所有模板分类树
2. WHEN 前端调用用户收藏模板 API (`POST /api/template/template/collect_list`)，THE 系统 SHALL 返回用户收藏的模板列表
3. WHEN 前端调用用户已购模板 API (`POST /api/user/template/index`)，THE 系统 SHALL 返回用户购买的模板列表
4. WHEN 请求包含分页参数，THE 系统 SHALL 支持分页查询模板
5. WHEN 请求包含筛选条件，THE 系统 SHALL 支持按分类、价格、使用次数筛选
6. WHEN 模板数据包含展示信息，THE 系统 SHALL 返回完整的 templateShowcaseInfo
7. WHEN API 调用失败，THE 系统 SHALL 记录错误日志并返回友好的错误信息

### 需求 5

**用户故事:** 作为开发者，我希望能在 Next.js 中实现风控检查 API，以便保障内容安全

#### 验收标准

1. WHEN 前端调用风控检查 API (`POST /api/works/works/risk_check`)，THE 系统 SHALL 验证作品内容的安全性
2. WHEN 作品内容包含敏感信息，THE 系统 SHALL 返回风险等级和具体违规项
3. WHEN 风控检查通过，THE 系统 SHALL 返回通过状态和检查时间
4. WHEN 风控服务不可用，THE 系统 SHALL 使用降级策略并记录警告日志
5. WHEN 检查超时，THE 系统 SHALL 返回超时错误并允许用户重试
6. WHEN 风控结果为高风险，THE 系统 SHALL 阻止作品发布并提示修改建议

### 需求 6

**用户故事:** 作为开发者，我希望新 API 能与现有前端代码兼容，以便实现平滑迁移

#### 验收标准

1. WHEN 现有前端代码调用 API，THE 新 API SHALL 返回与旧 API 相同的数据结构
2. WHEN API 响应包含额外字段，THE 系统 SHALL 确保向后兼容不影响现有功能
3. WHEN 前端使用 `@mk/services` 包调用 API，THE 系统 SHALL 支持通过配置切换新旧服务
4. WHEN 新旧 API 并行运行，THE 系统 SHALL 支持灰度发布策略
5. WHEN 迁移完成，THE 系统 SHALL 能够完全移除对旧 NestJS 服务的依赖
6. WHEN 数据结构升级，THE 系统 SHALL 提供数据迁移脚本和兼容性处理
7. WHEN API 版本更新，THE 系统 SHALL 保持 v7 版本号以避免前端修改

### 需求 7

**用户故事:** 作为开发者，我希望 API 具有完整的错误处理和日志记录，以便快速定位和解决问题

#### 验收标准

1. WHEN API 执行出错，THE 系统 SHALL 捕获所有异常并返回统一格式的错误响应
2. WHEN 错误响应返回，THE 系统 SHALL 包含错误码、错误信息、请求ID
3. WHEN 发生服务端错误，THE 系统 SHALL 使用 `@mk/logger` 记录详细日志
4. WHEN 日志记录，THE 系统 SHALL 包含请求参数、用户信息、错误堆栈
5. WHEN 数据库操作失败，THE 系统 SHALL 记录 SQL 语句和失败原因
6. WHEN 外部服务调用失败，THE 系统 SHALL 记录请求和响应详情
7. WHEN 关键操作执行，THE 系统 SHALL 记录审计日志（创建、更新、删除）
8. WHEN 日志级别可配置，THE 系统 SHALL 支持 debug、info、warn、error 级别

### 需求 8

**用户故事:** 作为开发者，我希望 API 具有权限验证和安全防护，以便保护用户数据安全

#### 验收标准

1. WHEN API 收到请求，THE 系统 SHALL 验证用户身份令牌（Token）
2. WHEN 令牌无效或过期，THE 系统 SHALL 返回 401 未授权错误
3. WHEN 用户访问他人作品，THE 系统 SHALL 验证是否有访问权限
4. WHEN 用户修改作品，THE 系统 SHALL 验证是否为作品所有者
5. WHEN 请求参数包含用户输入，THE 系统 SHALL 进行 SQL 注入防护
6. WHEN 请求参数包含文件路径，THE 系统 SHALL 防止路径遍历攻击
7. WHEN API 频繁调用，THE 系统 SHALL 实施速率限制（Rate Limiting）
8. WHEN 敏感数据返回，THE 系统 SHALL 脱敏处理（如隐藏手机号、邮箱）

### 需求 9

**用户故事:** 作为开发者，我希望 API 具有良好的性能表现，以便提供流畅的用户体验

#### 验收标准

1. WHEN 查询作品列表，THE 系统 SHALL 在 500ms 内返回结果（P95）
2. WHEN 获取单个作品详情，THE 系统 SHALL 在 300ms 内返回结果（P95）
3. WHEN 创建或更新作品，THE 系统 SHALL 在 1000ms 内完成操作（P95）
4. WHEN 查询结果可缓存，THE 系统 SHALL 使用 Next.js 的缓存机制
5. WHEN 数据库查询复杂，THE 系统 SHALL 使用索引优化查询性能
6. WHEN 响应数据较大，THE 系统 SHALL 支持数据压缩（gzip/brotli）
7. WHEN 并发请求量大，THE 系统 SHALL 支持水平扩展
8. WHEN 静态数据查询，THE 系统 SHALL 使用适当的缓存策略（stale-while-revalidate）

### 需求 10

**用户故事:** 作为开发者，我希望 API 具有完整的类型定义和文档，以便团队协作开发

#### 验收标准

1. WHEN 定义 API 接口，THE 系统 SHALL 提供完整的 TypeScript 类型定义
2. WHEN API 请求参数，THE 系统 SHALL 使用 Zod 或类似工具进行运行时验证
3. WHEN API 响应数据，THE 系统 SHALL 定义明确的 Response 类型
4. WHEN 类型定义共享，THE 系统 SHALL 将类型定义放在 `@mk/services` 或独立包中
5. WHEN 添加新 API，THE 系统 SHALL 更新 API 文档（OpenAPI/Swagger）
6. WHEN API 参数说明，THE 系统 SHALL 使用 JSDoc 注释提供详细说明
7. WHEN 枚举值使用，THE 系统 SHALL 定义 TypeScript enum 或 union type
8. WHEN 数据结构复杂，THE 系统 SHALL 提供示例请求和响应数据

### 需求 11

**用户故事:** 作为开发者，我希望 API 支持测试和 Mock，以便进行自动化测试

#### 验收标准

1. WHEN 编写单元测试，THE 系统 SHALL 支持对 Route Handler 进行单元测试
2. WHEN 编写集成测试，THE 系统 SHALL 支持对完整 API 流程进行测试
3. WHEN 测试需要数据库，THE 系统 SHALL 支持使用测试数据库或 Mock
4. WHEN 测试外部依赖，THE 系统 SHALL 提供 Mock 实现
5. WHEN 运行测试，THE 系统 SHALL 使用 Jest 或 Vitest 测试框架
6. WHEN 测试覆盖率，THE 系统 SHALL 要求核心 API 达到 80% 以上覆盖率
7. WHEN 测试失败，THE 系统 SHALL 提供清晰的失败原因和堆栈信息
8. WHEN CI/CD 流程，THE 系统 SHALL 在部署前自动运行所有测试

### 需求 12

**用户故事:** 作为运维人员，我希望新服务易于部署和监控，以便保障系统稳定性

#### 验收标准

1. WHEN 部署应用，THE 系统 SHALL 支持 Docker 容器化部署（使用 Dockerfile-jiantie）
2. WHEN 部署到不同环境，THE 系统 SHALL 支持通过环境变量配置（dev/test/staging/prod）
3. WHEN 应用启动，THE 系统 SHALL 输出清晰的启动日志和健康检查端点
4. WHEN 服务运行，THE 系统 SHALL 提供健康检查 API (`/api/health`)
5. WHEN 监控性能，THE 系统 SHALL 暴露性能指标（响应时间、错误率、吞吐量）
6. WHEN 部署更新，THE 系统 SHALL 支持零停机部署（Rolling Update）
7. WHEN 回滚版本，THE 系统 SHALL 支持快速回滚到上一个稳定版本
8. WHEN 扩展实例，THE 系统 SHALL 支持多实例水平扩展

## API 迁移清单

### 作品相关 API

| 原 API                                  | 新 API                                | 方法   | 说明           | 优先级 |
| --------------------------------------- | ------------------------------------- | ------ | -------------- | ------ |
| `/works-store/v7/item`                  | `/api/works/v7/item`                  | POST   | 创建作品       | P0     |
| `/works-store/v7/works/:uid/:workId`    | `/api/works/v7/works/:uid/:workId`    | GET    | 获取作品数据   | P0     |
| `/works-store/v7/detail/:uid/:workId`   | `/api/works/v7/detail/:uid/:workId`   | GET    | 获取作品详情   | P0     |
| `/works-store/v7/deteil/:uid/:workId`   | `/api/works/v7/detail/:uid/:workId`   | PUT    | 更新作品详情   | P0     |
| `/works-store/v7/items/:uid`            | `/api/works/v7/items/:uid`            | GET    | 作品列表       | P0     |
| `/works-store/v7/works/published-count` | `/api/works/v7/works/published-count` | GET    | 已发布数量统计 | P1     |
| `/works/index/add`                      | (已废弃，使用 v7)                     | POST   | 旧版创建作品   | P2     |
| `/works/works/detail`                   | (已废弃，使用 v7)                     | POST   | 旧版获取详情   | P2     |
| `/works/works/delete`                   | `/api/works/works/delete`             | POST   | 删除作品       | P0     |
| `/works/:workId/action/copy`            | `/api/works/:workId/action/copy`      | POST   | 复制作品       | P0     |
| `/works/works/edit`                     | `/api/works/works/edit`               | POST   | 编辑作品       | P0     |
| `/works/works/risk_check`               | `/api/works/works/risk_check`         | POST   | 风控检查       | P1     |
| `/works/works/list`                     | `/api/works/works/list`               | POST   | 搜索作品       | P1     |
| `/works/recycle_bin`                    | `/api/works/recycle_bin`              | GET    | 回收站列表     | P1     |
| `/works/recycle_bin`                    | `/api/works/recycle_bin`              | DELETE | 彻底删除       | P1     |
| `/works/recycle_bin:move`               | `/api/works/recycle_bin:move`         | POST   | 恢复作品       | P1     |

### 模板相关 API

| 原 API                            | 新 API                                | 方法 | 说明         | 优先级 |
| --------------------------------- | ------------------------------------- | ---- | ------------ | ------ |
| `/store/categories`               | `/api/store/categories`               | GET  | 模板分类     | P0     |
| `/template/template/collect_list` | `/api/template/template/collect_list` | POST | 收藏模板列表 | P1     |
| `/user/template/index`            | `/api/user/template/index`            | POST | 用户已购模板 | P1     |

### 数据统计相关 API（可选，视情况迁移）

这些 API 当前依赖营销助手服务和表单服务，暂时保持外部调用：

- `/data/users/:uid/works/:workId/overview` - 作品数据概览
- `/data/users/:uid/works/:workId/stay` - 停留时长
- `/data/users/:uid/works/:workId/period` - 数据走势
- `/data/users/:uid/works/:workId/source` - 访问来源
- `/form-report/v1/app-daily-report/:workId` - 表单提交数

## 数据结构定义

### Works 数据结构

```typescript
interface WorksItem {
  works_id: string;
  uid: number;
  title: string;
  description?: string;
  category?: string;
  status: 'draft' | 'published' | 'deleted';
  created_at: string;
  updated_at: string;
  published_at?: string;
  cover_image?: string;
  template_id?: string;
  // 其他字段...
}

interface WorksDetail extends WorksItem {
  templateShowcaseInfo?: TemplateShowcaseInfo;
  // 其他元数据...
}

interface WorksData {
  works_id: string;
  uid: number;
  data: any; // GridV3 数据结构
  version: string;
}
```

### Template 数据结构

```typescript
interface TemplateItem {
  template_id: string;
  title: string;
  description?: string;
  cover_image?: string;
  category_id?: string;
  price: number;
  use_count: number;
  designer_id: number;
  status: 'published' | 'draft' | 'offline';
  created_at: string;
  updated_at: string;
  templateShowcaseInfo?: TemplateShowcaseInfo;
}

interface TemplateShowcaseInfo {
  previewImages: PreviewImage[];
  coverImageId?: string;
  displayTitle: string;
  displayDescription: string; // Rich text HTML
}

interface PreviewImage {
  id: string;
  url: string;
  order: number;
  isCover: boolean;
}
```

## 非功能性需求

### 性能要求

- API 响应时间 P95 < 500ms
- API 响应时间 P99 < 1000ms
- 支持每秒 1000+ 并发请求
- 数据库查询优化，使用索引

### 可用性要求

- 服务可用性 > 99.9%
- 错误率 < 0.1%
- 支持优雅降级

### 安全性要求

- 所有 API 需要身份验证
- 防止 SQL 注入、XSS 攻击
- 敏感数据加密存储
- 审计日志记录

### 可维护性要求

- 代码符合 TypeScript 最佳实践
- 遵循项目架构规则
- 完整的单元测试和集成测试
- 清晰的代码注释和文档

### 兼容性要求

- 与现有前端代码完全兼容
- 支持 v7 API 版本
- 向后兼容旧数据结构
- 平滑迁移路径

## 成功标准

1. ✅ 所有 P0 优先级 API 完成迁移并通过测试
2. ✅ 前端代码可通过配置切换新旧服务
3. ✅ 新服务性能指标达到或超过旧服务
4. ✅ 在测试环境运行 2 周无重大问题
5. ✅ 灰度发布覆盖 10% 用户，错误率 < 0.1%
6. ✅ 完整的文档和测试覆盖率 > 80%
7. ✅ 生产环境全量切换成功，旧服务可安全下线

## 风险和依赖

### 技术风险

- **数据一致性**: 迁移过程中可能出现新旧服务数据不一致
  - 缓解方案: 使用相同的数据库，双写验证
- **性能瓶颈**: Next.js Route Handlers 性能可能不如 NestJS
  - 缓解方案: 性能测试，必要时优化或使用边缘函数
- **并发处理**: 高并发场景下的稳定性需验证
  - 缓解方案: 压力测试，逐步放量

### 业务风险

- **迁移影响业务**: 切换过程可能影响用户使用
  - 缓解方案: 灰度发布，快速回滚机制
- **功能遗漏**: 可能遗漏旧服务的某些功能
  - 缓解方案: 完整的功能清单，逐项验证

### 依赖关系

- 依赖 `@mk/services` 包的更新
- 依赖 `@mk/works-store` 包的类型定义
- 依赖 Next.js 15 的稳定性
- 依赖现有数据库和外部服务

## 里程碑

- **M1 (Week 1-2)**: 完成技术设计和基础架构搭建
- **M2 (Week 3-4)**: 完成 P0 核心 API 迁移和单元测试
- **M3 (Week 5-6)**: 完成 P1 API 迁移和集成测试
- **M4 (Week 7)**: 测试环境部署和全面测试
- **M5 (Week 8)**: 灰度发布和监控
- **M6 (Week 9)**: 全量发布和旧服务下线

## 参考资料

- Next.js 15 Route Handlers 文档
- 现有 NestJS 服务代码
- `@mk/services` 包文档
- `@mk/works-store` 包文档
- 项目架构规则（CLAUDE.md）
